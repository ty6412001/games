import { describe, expect, it } from 'vitest';

import { createBoardTiles } from '../../domain/tiles.js';

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

describe('startGame-level layout randomness', () => {
  it('two distinct seeds yield different tile-type sequences', () => {
    const a = createBoardTiles(mulberry32(1)).map((t) => t.type).join(',');
    const b = createBoardTiles(mulberry32(2)).map((t) => t.type).join(',');
    expect(a).not.toEqual(b);
  });

  it('property district distribution is always 4/4/4 across 5 seeded calls', () => {
    for (let s = 1; s <= 5; s += 1) {
      const tiles = createBoardTiles(mulberry32(s));
      const counts: Record<string, number> = {};
      for (const tile of tiles) {
        if (tile.type === 'property') {
          counts[tile.district] = (counts[tile.district] ?? 0) + 1;
        }
      }
      expect(counts['monster-forest']).toBe(4);
      expect(counts['space-station']).toBe(4);
      expect(counts['land-of-light']).toBe(4);
    }
  });
});
