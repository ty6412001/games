import { useGameStore } from '../../stores/gameStore';
import { getHero } from '../../theme/ultraman/heroes';

export const PlayerPanel = () => {
  const game = useGameStore((s) => s.game);
  if (!game) return null;

  return (
    <div className="space-y-3">
      {game.players.map((p, idx) => {
        const hero = getHero(p.hero.heroId);
        const isTurn = idx === game.currentTurn;
        return (
          <div
            key={p.id}
            className={`rounded-2xl border-2 p-3 transition ${
              isTurn
                ? 'border-amber-400 bg-slate-900 shadow-[0_0_24px_rgba(250,204,21,0.3)]'
                : 'border-slate-700 bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-black"
                style={{ backgroundColor: hero.color, color: hero.accent }}
              >
                {hero.name.slice(0, 1)}
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold">{p.name}</span>
                  {p.hero.badge > 1 ? (
                    <span className="rounded-full bg-white/10 px-2 text-xs text-slate-300">
                      #{p.hero.badge}
                    </span>
                  ) : null}
                  {p.isChild ? <span className="text-xs text-amber-300">👶</span> : null}
                </div>
                <div className="text-sm text-slate-400">
                  {hero.name} · {hero.tagline}
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-slate-300">💰 ¥{p.money}</span>
              <span className="text-slate-300">🏠 {p.ownedTiles.length}</span>
              <span className="text-slate-300">🎫 {p.helpCards}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
