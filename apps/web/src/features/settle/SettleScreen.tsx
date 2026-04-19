import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { MonsterSprite } from '../../theme/ultraman/MonsterSprite';
import { bossForWeek } from '../../theme/ultraman/monsters';

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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/95 p-4">
      <div className="max-h-[100svh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-slate-900/90 p-5 shadow-2xl ring-2 ring-amber-400/40">
        <header className="text-center">
          <h2 className="text-2xl font-black text-amber-300 md:text-3xl">
            {pendingReason === 'bankruptcy' ? '💥 有玩家能量耗尽' : '⏱️ 时间到！'}
          </h2>
          <p className="mt-1 text-slate-300">第 {game.week} 周战力结算</p>
        </header>

        <section className="mt-4 space-y-2">
          {game.players.map((p) => {
            const b = summary[p.id];
            if (!b) return null;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 p-2"
              >
                <HeroAvatar heroId={p.hero.heroId} size="md" badge={p.hero.badge} />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-bold">{p.name}</div>
                  <div className="text-xs text-slate-400">
                    金币 {b.fromMoney} + 武器 {b.fromWeapons} + 连击 {b.fromStreak}
                  </div>
                </div>
                <div className="text-xl font-black text-amber-300">{b.total}</div>
              </div>
            );
          })}
        </section>

        <section className="mt-4 rounded-2xl bg-red-900/40 p-3 ring-2 ring-red-500/50">
          <div className="flex items-center gap-3">
            <MonsterSprite bossId={boss.id} size="md" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-red-200">本周 Boss</div>
              <div className="truncate text-xl font-black text-red-50">{boss.name}</div>
              <div className="text-xs text-red-200">
                HP {bossHp} · 全家战力 {totalPower}
                {totalPower >= bossHp ? ' · 有机会取胜！' : ' · 需要精准答题'}
              </div>
            </div>
          </div>
        </section>

        <button
          type="button"
          onClick={enterBoss}
          className="mt-4 w-full rounded-2xl bg-amber-400 py-4 text-xl font-black text-slate-900 shadow-xl transition hover:bg-amber-300 md:text-2xl"
        >
          ⚡ 出击！合力打 Boss
        </button>
      </div>
    </div>
  );
};
