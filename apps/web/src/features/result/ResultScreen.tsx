import { useGameStore } from '../../stores/gameStore';
import { getHero } from '../../theme/ultraman/heroes';

export const ResultScreen = () => {
  const summary = useGameStore((s) => s.endSummary);
  const game = useGameStore((s) => s.game);
  const goToSetup = useGameStore((s) => s.goToSetup);

  if (!summary || !game) return null;

  const playersById = new Map(game.players.map((p) => [p.id, p]));

  const heading =
    summary.reason === 'time-up'
      ? '⏱️ 时间到，本局结算'
      : '💥 有玩家破产，本局提前结束';

  return (
    <div className="min-h-screen bg-slate-950 px-8 py-12 text-slate-50">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-black md:text-5xl">{heading}</h1>
          <p className="mt-2 text-slate-400">战力结算 + Boss 战将在 M4 接入</p>
        </header>

        <section className="space-y-3">
          {summary.rankings.map(({ playerId, rank, totalAssets }) => {
            const player = playersById.get(playerId);
            if (!player) return null;
            const hero = getHero(player.hero.heroId);
            return (
              <div
                key={playerId}
                className={`flex items-center gap-4 rounded-2xl border-2 p-4 ${
                  rank === 1
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <div className="text-3xl font-black text-amber-300">#{rank}</div>
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black"
                  style={{ backgroundColor: hero.color, color: hero.accent }}
                >
                  {hero.name.slice(0, 1)}
                </div>
                <div className="flex-1">
                  <div className="text-xl font-bold">
                    {player.name} ({hero.name})
                  </div>
                  <div className="text-sm text-slate-300">
                    💰 ¥{player.money} · 🏠 {player.ownedTiles.length}
                  </div>
                </div>
                <div className="text-2xl font-black">¥{totalAssets}</div>
              </div>
            );
          })}
        </section>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={goToSetup}
            className="min-h-[64px] rounded-2xl bg-amber-400 px-10 py-3 text-xl font-black text-slate-900 shadow-xl"
          >
            🔁 再来一局
          </button>
        </div>
      </div>
    </div>
  );
};
