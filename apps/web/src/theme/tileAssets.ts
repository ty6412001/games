import type { Tile } from '@ultraman/shared';

export type TileAssetEntry = {
  readonly id: string;
  readonly png: string;
};

export const TILE_ASSET_MANIFEST: readonly TileAssetEntry[] = [
  { id: 'start', png: '/assets/tiles/start.png' },
  { id: 'study', png: '/assets/tiles/study.png' },
  { id: 'chance', png: '/assets/tiles/chance.png' },
  { id: 'monster', png: '/assets/tiles/monster.png' },
  { id: 'reward-vault', png: '/assets/tiles/reward-vault.png' },
  { id: 'boss-outpost', png: '/assets/tiles/boss-outpost.png' },
  { id: 'property-monster-forest', png: '/assets/tiles/property-monster-forest.png' },
  { id: 'property-space-station', png: '/assets/tiles/property-space-station.png' },
  { id: 'property-land-of-light', png: '/assets/tiles/property-land-of-light.png' },
];

const MANIFEST_BY_ID = new Map(TILE_ASSET_MANIFEST.map((e) => [e.id, e]));

export const tileAssetPath = (tile: Tile): string | null => {
  if (tile.type === 'property') {
    return MANIFEST_BY_ID.get(`property-${tile.district}`)?.png ?? null;
  }
  return MANIFEST_BY_ID.get(tile.type)?.png ?? null;
};
