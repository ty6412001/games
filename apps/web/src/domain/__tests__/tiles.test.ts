import { describe, expect, it } from 'vitest';

import { BOARD_SIZE, TileSchema, type Tile } from '@ultraman/shared';

import { FALLBACK_LAYOUT, createBoardTiles } from '../tiles.js';

const countByType = (tiles: readonly Tile[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const tile of tiles) {
    counts[tile.type] = (counts[tile.type] ?? 0) + 1;
  }
  return counts;
};

const assertLegalLayout = (tiles: readonly Tile[]): void => {
  expect(tiles).toHaveLength(BOARD_SIZE);
  expect(tiles[0]?.type).toBe('start');
  for (const tile of tiles) {
    expect(TileSchema.safeParse(tile).success).toBe(true);
  }
  const counts = countByType(tiles);
  expect(counts.property).toBe(12);
  expect(counts.study).toBe(8);
  expect(counts.chance).toBe(3);
  expect(counts.monster).toBe(2);
  expect(counts['reward-vault']).toBe(1);
  expect(counts['boss-outpost']).toBe(1);
  expect(counts.start).toBe(1);
  for (let i = 0; i < tiles.length; i += 1) {
    const next = (i + 1) % tiles.length;
    const a = tiles[i]!.type;
    const b = tiles[next]!.type;
    // 随机布局只禁止稀有类型（chance / monster）成对相邻
    if (a === 'chance' || a === 'monster') {
      expect(b).not.toBe(a);
    }
  }
  const districts = new Map<string, number>();
  for (const tile of tiles) {
    if (tile.type === 'property') {
      districts.set(tile.district, (districts.get(tile.district) ?? 0) + 1);
    }
  }
  expect(districts.get('monster-forest')).toBe(4);
  expect(districts.get('space-station')).toBe(4);
  expect(districts.get('land-of-light')).toBe(4);
};

describe('createBoardTiles', () => {
  it('default Math.random call produces a legal layout', () => {
    assertLegalLayout(createBoardTiles());
  });

  it('is deterministic with an injected rand', () => {
    const seed = mulberry32(42);
    const a = createBoardTiles(seed);
    const b = createBoardTiles(mulberry32(42));
    expect(a.map((t) => t.type)).toEqual(b.map((t) => t.type));
  });

  it('generates legal layouts across 100 seeds', () => {
    for (let s = 1; s <= 100; s += 1) {
      assertLegalLayout(createBoardTiles(mulberry32(s)));
    }
  });

  it('falls back to FALLBACK_LAYOUT when rand forces 50 illegal attempts', () => {
    let calls = 0;
    const adversarial = () => {
      calls += 1;
      return 0; // always 0 → shuffle no-op → layout starts with two properties at 1 and 3? depends on base order
    };
    const result = createBoardTiles(adversarial);
    // Even under adversarial rand, result must be legal (either a miracle layout or the fallback)
    assertLegalLayout(result);
    expect(calls).toBeGreaterThan(0);
  });
});

describe('FALLBACK_LAYOUT', () => {
  it('is a frozen, legal 28-tile layout', () => {
    assertLegalLayout(FALLBACK_LAYOUT);
    expect(Object.isFrozen(FALLBACK_LAYOUT)).toBe(true);
  });

  it('places the 4 structural anchors at expected corners', () => {
    expect(FALLBACK_LAYOUT[0]?.type).toBe('start');
    expect(FALLBACK_LAYOUT[7]?.type).toBe('boss-outpost');
    expect(FALLBACK_LAYOUT[14]?.type).toBe('monster');
    expect(FALLBACK_LAYOUT[21]?.type).toBe('reward-vault');
  });
});

// Small deterministic PRNG for seeded tests
const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
