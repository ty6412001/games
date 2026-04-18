import { describe, expect, it } from 'vitest';

import { BOARD_SIZE, TileSchema } from '@ultraman/shared';

import { createBoardTiles } from '../tiles.js';

describe('createBoardTiles', () => {
  const tiles = createBoardTiles();

  it('returns exactly 28 tiles', () => {
    expect(tiles).toHaveLength(BOARD_SIZE);
  });

  it('places start tile at position 0', () => {
    expect(tiles[0]?.type).toBe('start');
  });

  it('produces schema-valid tiles', () => {
    for (const tile of tiles) {
      expect(TileSchema.safeParse(tile).success).toBe(true);
    }
  });

  it('has 12 property tiles', () => {
    const count = tiles.filter((t) => t.type === 'property').length;
    expect(count).toBe(12);
  });

  it('has 1 reward-vault and 1 boss-outpost', () => {
    expect(tiles.filter((t) => t.type === 'reward-vault')).toHaveLength(1);
    expect(tiles.filter((t) => t.type === 'boss-outpost')).toHaveLength(1);
  });

  it('distributes properties across three districts', () => {
    const districts = new Map<string, number>();
    for (const tile of tiles) {
      if (tile.type === 'property') {
        districts.set(tile.district, (districts.get(tile.district) ?? 0) + 1);
      }
    }
    expect(districts.get('monster-forest')).toBe(4);
    expect(districts.get('space-station')).toBe(4);
    expect(districts.get('land-of-light')).toBe(4);
  });
});
