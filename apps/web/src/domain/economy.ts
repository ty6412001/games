import type { Player, Tile } from '@ultraman/shared';

import { DISTRICT_BONUS_MULTIPLIER, PROPERTIES_PER_DISTRICT } from './tiles.js';

export const calculateRent = (
  tile: Extract<Tile, { type: 'property' }>,
  ownerDistrictTileCount: number,
): number => {
  const fullDistrict = ownerDistrictTileCount >= PROPERTIES_PER_DISTRICT;
  return fullDistrict ? tile.baseRent * DISTRICT_BONUS_MULTIPLIER : tile.baseRent;
};

export const countDistrictTilesOwned = (
  player: Player,
  tiles: readonly Tile[],
  district: string,
): number => {
  let count = 0;
  for (const pos of player.ownedTiles) {
    const tile = tiles[pos];
    if (tile && tile.type === 'property' && tile.district === district) {
      count += 1;
    }
  }
  return count;
};

export const canAfford = (player: Player, amount: number): boolean => {
  return player.money >= amount;
};

export const totalAssetValue = (player: Player, tiles: readonly Tile[]): number => {
  let assets = player.money;
  for (const pos of player.ownedTiles) {
    const tile = tiles[pos];
    if (tile && tile.type === 'property') {
      assets += Math.floor(tile.basePrice / 2);
    }
  }
  return assets;
};

export const isBankrupt = (player: Player): boolean => {
  return player.money < 0 && player.ownedTiles.length === 0;
};

export const salvageValue = (tile: Extract<Tile, { type: 'property' }>): number => {
  return Math.floor(tile.basePrice / 2);
};
