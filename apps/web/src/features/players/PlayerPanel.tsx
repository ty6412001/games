import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { getHero } from '../../theme/ultraman/heroes';

type Props = {
  compact?: boolean;
};

export const PlayerPanel = ({ compact = false }: Props) => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {game.players.map((p, idx) => {
        const hero = getHero(p.hero.heroId);
        const isTurn = idx === game.currentTurn;
        return (
          <div
            key={p.id}
            className={`rounded-2xl border-2 p-2 transition ${
              isTurn
                ? 'border-amber-400 bg-slate-900 shadow-[0_0_18px_rgba(250,204,21,0.25)]'
                : 'border-slate-700 bg-slate-900/50'
            }`}
          >
            {compact ? (
              <div className="flex items-center gap-2">
                <HeroAvatar heroId={p.hero.heroId} size="sm" badge={p.hero.badge} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1 text-sm">
                    <span className="truncate font-bold">{p.name}</span>
                    {p.isChild ? <span className="text-amber-300">👶</span> : null}
                  </div>
                  <div className="flex gap-2 text-xs text-slate-400">
                    <span>💰{p.money}</span>
                    <span>🏠{p.ownedTiles.length}</span>
                    <span>🎫{p.helpCards}</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <HeroAvatar heroId={p.hero.heroId} size="md" badge={p.hero.badge} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-base font-bold">{p.name}</span>
                      {p.isChild ? <span className="text-xs text-amber-300">👶</span> : null}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {hero.name} · {hero.tagline}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-300">💰 ¥{p.money}</span>
                  <span className="text-slate-300">🏠 {p.ownedTiles.length}</span>
                  <span className="text-slate-300">🎫 {p.helpCards}</span>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
