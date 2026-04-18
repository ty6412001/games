import type { Player, Tile } from '@ultraman/shared';
import { BOARD_SIZE } from '@ultraman/shared';

import { useGameStore } from '../../stores/gameStore';
import { getHero } from '../../theme/ultraman/heroes';

const SIDE_LENGTH = 8;

const tileLayoutPosition = (position: number): { row: number; col: number } => {
  if (position === 0) return { row: SIDE_LENGTH - 1, col: SIDE_LENGTH - 1 };
  if (position < SIDE_LENGTH - 1) {
    return { row: SIDE_LENGTH - 1, col: SIDE_LENGTH - 1 - position };
  }
  if (position === SIDE_LENGTH - 1) return { row: SIDE_LENGTH - 1, col: 0 };
  if (position < 2 * (SIDE_LENGTH - 1)) {
    const offset = position - (SIDE_LENGTH - 1);
    return { row: SIDE_LENGTH - 1 - offset, col: 0 };
  }
  if (position === 2 * (SIDE_LENGTH - 1)) return { row: 0, col: 0 };
  if (position < 3 * (SIDE_LENGTH - 1)) {
    const offset = position - 2 * (SIDE_LENGTH - 1);
    return { row: 0, col: offset };
  }
  if (position === 3 * (SIDE_LENGTH - 1)) return { row: 0, col: SIDE_LENGTH - 1 };
  const offset = position - 3 * (SIDE_LENGTH - 1);
  return { row: offset, col: SIDE_LENGTH - 1 };
};

const tileLabel = (tile: Tile): string => {
  switch (tile.type) {
    case 'start':
      return '🏠 起点';
    case 'study':
      return '📚 学习';
    case 'property':
      return tile.name;
    case 'chance':
      return '🎲 机会';
    case 'monster':
      return '⚔️ 怪兽';
    case 'reward-vault':
      return '🎁 宝库';
    case 'boss-outpost':
      return '🧟 前哨';
  }
};

const districtClass = (district: string): string => {
  switch (district) {
    case 'monster-forest':
      return 'bg-emerald-900/60 border-emerald-600';
    case 'space-station':
      return 'bg-indigo-900/60 border-indigo-500';
    case 'land-of-light':
      return 'bg-amber-900/60 border-amber-500';
    default:
      return 'bg-slate-800 border-slate-600';
  }
};

const tileBackgroundClass = (tile: Tile): string => {
  switch (tile.type) {
    case 'start':
      return 'bg-amber-500/30 border-amber-400';
    case 'study':
      return 'bg-sky-900/50 border-sky-600';
    case 'property':
      return districtClass(tile.district);
    case 'chance':
      return 'bg-fuchsia-900/50 border-fuchsia-500';
    case 'monster':
      return 'bg-rose-900/50 border-rose-500';
    case 'reward-vault':
      return 'bg-yellow-900/50 border-yellow-500';
    case 'boss-outpost':
      return 'bg-red-900/60 border-red-500';
  }
};

const findOwner = (position: number, players: readonly Player[]): Player | null => {
  return players.find((p) => p.ownedTiles.includes(position)) ?? null;
};

export const Board = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  return (
    <div
      className="grid gap-1 rounded-2xl bg-slate-950/80 p-3"
      style={{
        gridTemplateColumns: `repeat(${SIDE_LENGTH}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${SIDE_LENGTH}, minmax(0, 1fr))`,
      }}
    >
      {Array.from({ length: BOARD_SIZE }).map((_, position) => {
        const tile = game.tiles[position];
        if (!tile) return null;
        const { row, col } = tileLayoutPosition(position);
        const owner = findOwner(position, game.players);
        const playersHere = game.players.filter((p) => p.position === position);
        const isPropertyTile = tile.type === 'property';

        return (
          <div
            key={position}
            className={`relative flex aspect-square flex-col items-center justify-between rounded-lg border-2 p-1 text-[10px] font-bold md:text-xs ${tileBackgroundClass(tile)}`}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
          >
            <div className="text-center leading-tight text-slate-100">{tileLabel(tile)}</div>
            {isPropertyTile ? (
              <div className="text-[9px] text-slate-300">¥{tile.basePrice}</div>
            ) : null}
            {owner ? (
              <div
                className="absolute right-1 top-1 h-3 w-3 rounded-full border border-white/40"
                style={{ backgroundColor: getHero(owner.hero.heroId).color }}
                title={`${owner.name} 的地产`}
              />
            ) : null}
            {playersHere.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-0.5">
                {playersHere.map((p) => (
                  <div
                    key={p.id}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shadow"
                    style={{
                      backgroundColor: getHero(p.hero.heroId).color,
                      color: getHero(p.hero.heroId).accent,
                    }}
                    title={p.name}
                  >
                    {p.name.slice(0, 1)}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      <div className="col-span-6 col-start-2 row-span-6 row-start-2 flex items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900">
        <div className="text-center text-slate-200">
          <div className="text-4xl font-black">奥特曼大富翁</div>
          <div className="mt-2 text-lg">第 {game.week} 周 · {game.durationMin} 分钟</div>
        </div>
      </div>
    </div>
  );
};
