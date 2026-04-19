import { useMemo } from 'react';

import { totalAssetValue } from '../../domain/economy';
import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';

export const Leaderboard = () => {
  const game = useGameStore((s) => s.game);
  const lastDice = useGameStore((s) => s.lastDice);

  const ranked = useMemo(() => {
    if (!game) return [];
    return game.players
      .map((p) => ({ player: p, assets: totalAssetValue(p, game.tiles) }))
      .sort((a, b) => b.assets - a.assets);
  }, [game]);

  if (!game) return null;

  return (
    <div className="flex h-full flex-col gap-2 rounded-2xl bg-slate-900/70 p-3">
      <header className="flex items-center justify-between text-sm font-bold text-slate-200">
        <span>🏆 排行榜</span>
        <span className="text-xs text-slate-400">按总资产</span>
      </header>

      <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {ranked.map(({ player: p, assets }, idx) => {
          const rank = idx + 1;
          const isLeader = rank === 1;
          const isTurn = game.players.indexOf(p) === game.currentTurn;
          return (
            <li
              key={p.id}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
                isLeader
                  ? 'border-amber-400 bg-amber-400/10'
                  : isTurn
                    ? 'border-sky-400/60 bg-sky-400/5'
                    : 'border-slate-700 bg-slate-900/50'
              }`}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                  isLeader ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {rank}
              </div>
              <HeroAvatar heroId={p.hero.heroId} size="sm" badge={p.hero.badge} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-sm font-bold">{p.name}</span>
                  {p.isChild ? <span className="text-[10px] text-amber-300">👶</span> : null}
                </div>
                <div className="text-[10px] text-slate-400">
                  💰 {p.money} · 🏠 {p.ownedTiles.length}
                </div>
              </div>
              <div className="text-right text-xs text-slate-300">¥{assets}</div>
            </li>
          );
        })}
      </ul>

      <footer className="rounded-xl bg-slate-800/70 p-2 text-xs text-slate-300">
        <div>🎲 上次骰：{lastDice ?? '—'}</div>
      </footer>
    </div>
  );
};
