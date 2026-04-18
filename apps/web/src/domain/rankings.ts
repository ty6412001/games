import type { Player, Tile } from '@ultraman/shared';

import { totalAssetValue } from './economy.js';

export type PlayerRanking = {
  playerId: string;
  rank: number;
  totalAssets: number;
};

export const rankPlayersByAssets = (
  players: readonly Player[],
  tiles: readonly Tile[],
): PlayerRanking[] => {
  const computed = players.map((p) => ({
    playerId: p.id,
    totalAssets: totalAssetValue(p, tiles),
  }));
  computed.sort((a, b) => b.totalAssets - a.totalAssets);
  return computed.map((entry, idx) => ({
    playerId: entry.playerId,
    rank: idx + 1,
    totalAssets: entry.totalAssets,
  }));
};
