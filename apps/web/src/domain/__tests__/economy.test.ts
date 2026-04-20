import type { Player, Tile } from '@ultraman/shared';
import { describe, expect, it } from 'vitest';

import {
  calculateRent,
  canAfford,
  countDistrictTilesOwned,
  isBankrupt,
  salvageValue,
  totalAssetValue,
} from '../economy.js';
import { FALLBACK_LAYOUT } from '../tiles.js';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: 'p1',
  name: '小明',
  hero: { heroId: 'tiga', badge: 1 },
  isChild: true,
  money: 1500,
  position: 0,
  weaponIds: [],
  ownedTiles: [],
  streak: 0,
  combatPower: 0,
  helpCards: 0,
  ...overrides,
});

describe('calculateRent', () => {
  const tile = { position: 1, type: 'property', name: 'x', district: 'monster-forest', basePrice: 200, baseRent: 40 } as const;

  it('returns base rent when district incomplete', () => {
    expect(calculateRent(tile, 1)).toBe(40);
    expect(calculateRent(tile, 3)).toBe(40);
  });

  it('doubles rent when district complete', () => {
    expect(calculateRent(tile, 4)).toBe(80);
  });
});

describe('countDistrictTilesOwned', () => {
  const tiles = FALLBACK_LAYOUT;
  const monsterForestPositions = tiles
    .filter((t) => t.type === 'property' && t.district === 'monster-forest')
    .map((t) => t.position);

  it('counts properties by district', () => {
    const player = makePlayer({ ownedTiles: monsterForestPositions.slice(0, 2) });
    expect(countDistrictTilesOwned(player, tiles, 'monster-forest')).toBe(2);
    expect(countDistrictTilesOwned(player, tiles, 'space-station')).toBe(0);
  });
});

describe('canAfford', () => {
  it('returns true only when money covers amount', () => {
    expect(canAfford(makePlayer({ money: 200 }), 200)).toBe(true);
    expect(canAfford(makePlayer({ money: 199 }), 200)).toBe(false);
  });
});

describe('totalAssetValue', () => {
  const tiles = FALLBACK_LAYOUT;

  it('includes cash plus half price of each property', () => {
    const properties = tiles.filter((t) => t.type === 'property');
    const [p1, p2] = properties;
    const player = makePlayer({ money: 1000, ownedTiles: [p1!.position, p2!.position] });
    const p1Value = p1!.type === 'property' ? Math.floor(p1!.basePrice / 2) : 0;
    const p2Value = p2!.type === 'property' ? Math.floor(p2!.basePrice / 2) : 0;
    expect(totalAssetValue(player, tiles)).toBe(1000 + p1Value + p2Value);
  });
});

describe('isBankrupt', () => {
  it('is true only when money negative and no property', () => {
    expect(isBankrupt(makePlayer({ money: -10, ownedTiles: [] }))).toBe(true);
    expect(isBankrupt(makePlayer({ money: -10, ownedTiles: [1] }))).toBe(false);
    expect(isBankrupt(makePlayer({ money: 0, ownedTiles: [] }))).toBe(false);
  });
});

describe('salvageValue', () => {
  const tile: Extract<Tile, { type: 'property' }> = {
    position: 1,
    type: 'property',
    name: 'x',
    district: 'monster-forest',
    basePrice: 200,
    baseRent: 40,
  };
  it('returns half the base price', () => {
    expect(salvageValue(tile)).toBe(100);
  });
});
