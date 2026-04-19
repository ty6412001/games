import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { DicePanel } from '../board/Dice';
import { GameTimer } from './GameTimer';

export const CenterControls = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  return (
    <div className="flex h-full flex-col gap-2 p-2 text-slate-50">
      <div className="flex items-center justify-between rounded-xl bg-slate-900/50 px-2 py-1 text-xs">
        <span className="font-bold">第 {game.week} 周</span>
        <GameTimer />
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 gap-1.5">
          {game.players.map((p, idx) => {
            const isTurn = idx === game.currentTurn;
            return (
              <div
                key={p.id}
                className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition ${
                  isTurn
                    ? 'border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/50'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <div className="shrink-0">
                  <HeroAvatar heroId={p.hero.heroId} size="sm" badge={p.hero.badge} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-[13px] font-bold leading-tight">{p.name}</span>
                    {p.isChild ? <span className="text-[10px] text-amber-300">👶</span> : null}
                    {isTurn ? <span className="text-[10px] text-amber-300">🎯</span> : null}
                  </div>
                  <div className="flex gap-1.5 text-[10px] text-slate-400">
                    <span>💰{p.money}</span>
                    <span>🏠{p.ownedTiles.length}</span>
                    <span>🎫{p.helpCards}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DicePanel />
    </div>
  );
};
