import { useState } from 'react';
import type { Weapon } from '@ultraman/shared';

import { useGameStore } from '../../stores/gameStore';
import { HeroAvatar } from '../../theme/ultraman/HeroAvatar';
import { MonsterSprite } from '../../theme/ultraman/MonsterSprite';
import { getWeapon } from '../../theme/ultraman/weapons';

export const BossScene = () => {
  const game = useGameStore((s) => s.game);
  const bossAttack = useGameStore((s) => s.bossAttack);
  const finalize = useGameStore((s) => s.finalizeBossBattle);
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const result = useGameStore((s) => s.quizResult);
  const [selectedWeapon, setSelectedWeapon] = useState<string | undefined>(undefined);

  if (!game || game.phase !== 'boss' || !game.bossBattle) return null;
  const battle = game.bossBattle;
  const attacker = game.players.find((p) => p.id === battle.currentAttackerId);
  if (!attacker) return null;
  const availableWeapons: Weapon[] = attacker.weaponIds
    .map((id) => getWeapon(id))
    .filter((w): w is Weapon => w !== null);
  const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);
  const pendingOverlay = Boolean(activeQuiz || result);
  const battleDone = battle.status !== 'in-progress';

  return (
    <div className="h-[100svh] overflow-hidden bg-gradient-to-b from-red-950 via-slate-950 to-slate-900 p-4 text-slate-50">
      <div className="mx-auto grid h-full max-w-[1180px] grid-rows-[auto_1fr_auto] gap-3">
        <header className="text-center">
          <h2 className="text-2xl font-black md:text-3xl">⚔️ Boss 战 · 击败 {battle.bossName}</h2>
        </header>

        <section className="grid min-h-0 gap-3 overflow-hidden md:grid-cols-[1fr_320px]">
          <div className="flex min-h-0 flex-col gap-3">
            <div className="flex min-h-0 flex-1 items-center gap-4 rounded-3xl bg-rose-900/60 p-4 ring-2 ring-rose-400/50">
              <MonsterSprite bossId={battle.bossId} size="lg" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="truncate text-3xl font-black">{battle.bossName}</div>
                <div className="flex justify-between text-sm">
                  <span>HP</span>
                  <span>{battle.currentHp} / {battle.maxHp}</span>
                </div>
                <div className="h-5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-300"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>

            {!pendingOverlay && !battleDone ? (
              <div className="rounded-2xl bg-slate-900/70 p-3">
                <div className="flex items-center gap-3">
                  <HeroAvatar heroId={attacker.hero.heroId} size="md" badge={attacker.hero.badge} />
                  <div className="flex-1">
                    <div className="text-lg font-bold">{attacker.name} 出手</div>
                    <div className="text-xs text-slate-400">选择武器 → 答题命中</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedWeapon(undefined)}
                    className={`rounded-xl px-3 py-2 text-sm font-bold ${
                      selectedWeapon === undefined ? 'bg-amber-400 text-slate-900' : 'bg-slate-700'
                    }`}
                  >
                    裸拳（300）
                  </button>
                  {availableWeapons.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setSelectedWeapon(w.id)}
                      className={`rounded-xl px-3 py-2 text-sm font-bold ${
                        selectedWeapon === w.id ? 'bg-amber-400 text-slate-900' : 'bg-slate-700'
                      }`}
                    >
                      ⚡ {w.name} · +{w.combatPowerBonus}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => bossAttack(selectedWeapon)}
                  className="mt-3 w-full rounded-2xl bg-rose-500 py-3 text-xl font-black text-white shadow-xl"
                >
                  💥 出招攻击！
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto rounded-2xl bg-slate-900/60 p-3">
            <h3 className="text-sm font-bold text-slate-300">战场贡献</h3>
            {game.players.map((p) => {
              const contribution = battle.contributions[p.id] ?? 0;
              const isCurrent = p.id === battle.currentAttackerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border p-2 ${
                    isCurrent
                      ? 'border-amber-400 bg-amber-400/10'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <HeroAvatar heroId={p.hero.heroId} size="sm" badge={p.hero.badge} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-slate-400">贡献 {contribution}</div>
                  </div>
                  {isCurrent ? <span className="text-xl">👆</span> : null}
                </div>
              );
            })}
          </div>
        </section>

        <footer className="flex items-center justify-between rounded-2xl bg-slate-900/70 p-3">
          {battleDone ? (
            <>
              <div className="text-lg font-black text-emerald-200">
                {battle.status === 'victory' ? '🎉 Boss 被击败！' : 'Boss 逃走了'}
              </div>
              <button
                type="button"
                onClick={() => finalize(battle.status === 'victory' ? 'victory' : 'escaped')}
                className="min-h-[56px] rounded-xl bg-amber-400 px-6 py-3 text-lg font-black text-slate-900"
              >
                进入结算
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-slate-400">持续出招直到 Boss HP 清零</span>
              <button
                type="button"
                onClick={() => finalize('escaped')}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs text-slate-400 underline"
              >
                放弃挑战
              </button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
};
