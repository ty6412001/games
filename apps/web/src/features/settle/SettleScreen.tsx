import { useGameStore } from '../../stores/gameStore';
import { bossForWeek } from '../../theme/ultraman/monsters';
import { getHero } from '../../theme/ultraman/heroes';

export const SettleScreen = () => {
  const game = useGameStore((s) => s.game);
  const summary = useGameStore((s) => s.combatSummary);
  const pendingReason = useGameStore((s) => s.pendingEndReason);
  const enterBoss = useGameStore((s) => s.enterBossBattle);

  if (!game || !summary) return null;
  const boss = bossForWeek(game.week);
  const totalPower = game.players.reduce((sum, p) => sum + (summary[p.id]?.total ?? 0), 0);
  const bossHp = Math.max(1000, Math.floor(totalPower * 0.7));

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/95 p-6">
      <div className="w-full max-w-3xl space-y-6 rounded-3xl bg-slate-900/80 p-8 shadow-2xl ring-2 ring-amber-400/40">
        <header className="text-center">
          <h2 className="text-3xl font-black text-amber-300">
            {pendingReason === 'bankruptcy' ? '💥 有玩家能量耗尽' : '⏱️ 时间到！'}
          </h2>
          <p className="mt-1 text-slate-300">第 {game.week} 周战力结算</p>
        </header>

        <section className="space-y-2">
          {game.players.map((p) => {
            const b = summary[p.id];
            if (!b) return null;
            const hero = getHero(p.hero.heroId);
            return (
              <div
                key={p.id}
                className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-black"
                  style={{ backgroundColor: hero.color, color: hero.accent }}
                >
                  {hero.name.slice(0, 1)}
                </div>
                <div className="flex-1">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    金币 {b.fromMoney} + 武器 {b.fromWeapons} + 连击 {b.fromStreak}
                  </div>
                </div>
                <div className="text-2xl font-black text-amber-300">{b.total}</div>
              </div>
            );
          })}
        </section>

        <section className="rounded-2xl bg-red-900/40 p-4 ring-2 ring-red-500/50">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-red-200">本周 Boss</div>
              <div className="text-2xl font-black text-red-50">🧟 {boss.name}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-red-200">HP 需求</div>
              <div className="text-2xl font-black text-red-50">{bossHp}</div>
            </div>
          </div>
          <div className="mt-2 text-sm text-red-200">
            全家合力战力 {totalPower} vs Boss {bossHp} · {totalPower >= bossHp ? '有机会取胜！' : '需要精准答题'}
          </div>
        </section>

        <button
          type="button"
          onClick={enterBoss}
          className="w-full rounded-2xl bg-amber-400 py-4 text-2xl font-black text-slate-900 shadow-xl transition hover:bg-amber-300"
        >
          ⚡ 出击！合力打 Boss
        </button>
      </div>
    </div>
  );
};
