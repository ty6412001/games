import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { getHero } from '../../theme/ultraman/heroes';

export const ResultScreen = () => {
  const summary = useGameStore((s) => s.endSummary);
  const game = useGameStore((s) => s.game);
  const goToSetup = useGameStore((s) => s.goToSetup);

  if (!summary || !game) return null;

  const playersById = new Map(game.players.map((p) => [p.id, p]));

  const heading =
    summary.reason === 'time-up' ? '⏱️ 时间到，本局结算' : '💥 有玩家破产，本局提前结束';

  return (
    <div className="min-h-[100svh] bg-slate-950 px-4 py-4 text-slate-50 md:px-6 md:py-6">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-3xl flex-col gap-4">
        <header className="text-center">
          <h1 className="text-3xl font-black md:text-4xl">{heading}</h1>
          <p className="mt-1 text-sm text-slate-400">按总资产排名 · 冠军 = 最强光之战士</p>
        </header>

        <section className="flex-1 space-y-2">
          {summary.rankings.map(({ playerId, rank, totalAssets }) => {
            const player = playersById.get(playerId);
            if (!player) return null;
            const hero = getHero(player.hero.heroId);
            return (
              <div
                key={playerId}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                  rank === 1
                    ? 'border-amber-400 bg-amber-400/10'
                    : 'border-slate-700 bg-slate-900/50'
                }`}
              >
                <div className="text-2xl font-black text-amber-300">#{rank}</div>
                <HeroAvatar heroId={player.hero.heroId} size="md" badge={player.hero.badge} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-lg font-bold">
                    {player.name} ({hero.name})
                  </div>
                  <div className="text-xs text-slate-300">
                    💰 ¥{player.money} · 🏠 {player.ownedTiles.length}
                  </div>
                </div>
                <div className="text-xl font-black">¥{totalAssets}</div>
              </div>
            );
          })}
        </section>

        <div className="sticky bottom-0 flex justify-center py-2">
          <button
            type="button"
            onClick={goToSetup}
            className="min-h-[56px] rounded-2xl bg-amber-400 px-10 py-3 text-xl font-black text-slate-900 shadow-xl"
          >
            🔁 再来一局
          </button>
        </div>
      </div>
    </div>
  );
};
