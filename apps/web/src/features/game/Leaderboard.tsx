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
    <aside className="panel-soft flex h-full min-h-[260px] flex-col rounded-[2rem] p-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <div className="eyebrow">Ranking</div>
          <div className="mt-2 text-xl font-black text-white">实时排行榜</div>
        </div>
        <span className="text-xs text-slate-400">按总资产</span>
      </header>

      <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {ranked.map(({ player: p, assets }, idx) => {
          const rank = idx + 1;
          const isLeader = rank === 1;
          const isTurn = game.players.indexOf(p) === game.currentTurn;
          return (
            <li
              key={p.id}
              className={`rounded-[1.25rem] border px-3 py-3 transition ${
                isLeader
                  ? 'border-amber-400/60 bg-amber-400/10'
                  : isTurn
                    ? 'border-sky-400/60 bg-sky-400/8'
                    : 'border-white/8 bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                    isLeader ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {rank}
                </div>
                <HeroAvatar heroId={p.hero.heroId} size="sm" badge={p.hero.badge} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-base font-black text-white">{p.name}</span>
                    {p.isChild ? <span className="text-[10px] text-amber-300">👶</span> : null}
                    {isTurn ? (
                      <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                        当前行动
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    💰 {p.money} · 🏠 {p.ownedTiles.length}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">资产</div>
                  <div className="mt-1 text-base font-black text-slate-200">¥{assets}</div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="mt-3 rounded-[1.25rem] border border-white/8 bg-white/5 px-3 py-3 text-sm text-slate-300">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">上次骰子</span>
          <span className="font-black text-white">{lastDice ?? '—'}</span>
        </div>
      </footer>
    </aside>
  );
};
