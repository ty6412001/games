import { useState } from 'react';
import type { Weapon } from '@ultraman/shared';

import { useGameStore } from '../../stores/gameStore';
import { getHero } from '../../theme/ultraman/heroes';
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
  const attackerHero = getHero(attacker.hero.heroId);
  const availableWeapons: Weapon[] = attacker.weaponIds
    .map((id) => getWeapon(id))
    .filter((w): w is Weapon => w !== null);
  const hpPct = Math.round((battle.currentHp / battle.maxHp) * 100);
  const pendingOverlay = activeQuiz || result;

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-950 via-slate-950 to-slate-900 p-6 text-slate-50">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="text-center">
          <h2 className="text-3xl font-black">⚔️ Boss 战</h2>
          <p className="text-slate-300">击败 {battle.bossName} 拯救光之国！</p>
        </header>

        <section className="rounded-3xl bg-rose-900/60 p-6 ring-2 ring-rose-400/50">
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-rose-700 text-5xl">
              🧟
            </div>
            <div className="flex-1">
              <div className="text-3xl font-black">{battle.bossName}</div>
              <div className="mt-2">
                <div className="flex justify-between text-sm">
                  <span>HP</span>
                  <span>{battle.currentHp} / {battle.maxHp}</span>
                </div>
                <div className="h-5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-bold">战场贡献</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {game.players.map((p) => {
              const hero = getHero(p.hero.heroId);
              const contribution = battle.contributions[p.id] ?? 0;
              const isCurrent = p.id === battle.currentAttackerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    isCurrent ? 'border-amber-400 bg-amber-400/10' : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-black"
                    style={{ backgroundColor: hero.color, color: hero.accent }}
                  >
                    {hero.name.slice(0, 1)}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold">{p.name}</div>
                    <div className="text-xs text-slate-400">贡献 {contribution}</div>
                  </div>
                  {isCurrent ? <span className="text-xl">👆</span> : null}
                </div>
              );
            })}
          </div>
        </section>

        {!pendingOverlay ? (
          <section className="rounded-2xl bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full text-xl font-black"
                style={{ backgroundColor: attackerHero.color, color: attackerHero.accent }}
              >
                {attackerHero.name.slice(0, 1)}
              </div>
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
              className="mt-4 w-full rounded-2xl bg-rose-500 py-4 text-xl font-black text-white shadow-xl"
            >
              💥 出招攻击！
            </button>
          </section>
        ) : null}

        {battle.status !== 'in-progress' ? (
          <section className="rounded-2xl bg-emerald-900/60 p-4 text-center">
            <div className="text-2xl font-black text-emerald-200">
              {battle.status === 'victory' ? '🎉 Boss 被击败！' : 'Boss 逃走了'}
            </div>
            <button
              type="button"
              onClick={() => finalize(battle.status === 'victory' ? 'victory' : 'escaped')}
              className="mt-3 rounded-xl bg-amber-400 px-6 py-3 text-lg font-black text-slate-900"
            >
              进入结算
            </button>
          </section>
        ) : (
          <div className="text-center">
            <button
              type="button"
              onClick={() => finalize('escaped')}
              className="text-sm text-slate-500 underline"
            >
              放弃挑战（Boss 逃走）
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
