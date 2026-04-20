import { describe, expect, it } from 'vitest';

import { createBoardTiles } from '../tiles.js';

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

describe('createBoardTiles randomness', () => {
  it('produces distinct layouts across 10 independent seeds', () => {
    const sequences = Array.from({ length: 10 }, (_, i) =>
      createBoardTiles(mulberry32(i + 1))
        .map((t) => t.type)
        .join(','),
    );
    const unique = new Set(sequences);
    expect(unique.size).toBeGreaterThanOrEqual(8);
  });

  it('places start at position 0 under every seed', () => {
    for (let s = 1; s <= 20; s += 1) {
      const tiles = createBoardTiles(mulberry32(s));
      expect(tiles[0]?.type).toBe('start');
    }
  });

  it('district counts stay 4/4/4 across seeds', () => {
    for (let s = 1; s <= 20; s += 1) {
      const tiles = createBoardTiles(mulberry32(s));
      const counts = { 'monster-forest': 0, 'space-station': 0, 'land-of-light': 0 };
      for (const tile of tiles) {
        if (tile.type === 'property') counts[tile.district] += 1;
      }
      expect(counts['monster-forest']).toBe(4);
      expect(counts['space-station']).toBe(4);
      expect(counts['land-of-light']).toBe(4);
    }
  });
});
