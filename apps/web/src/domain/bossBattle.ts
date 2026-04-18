import type { BossBattleState, Player } from '@ultraman/shared';

import { getWeapon } from '../theme/ultraman/weapons.js';

const BOSS_HP_RATIO = 0.7;

export const deriveBossMaxHp = (totalCombatPower: number): number => {
  return Math.max(1000, Math.floor(totalCombatPower * BOSS_HP_RATIO));
};

export const buildInitialBossBattle = (
  boss: { id: string; name: string },
  players: readonly Player[],
  totalCombatPower: number,
): BossBattleState => {
  const maxHp = deriveBossMaxHp(totalCombatPower);
  return {
    bossId: boss.id,
    bossName: boss.name,
    maxHp,
    currentHp: maxHp,
    currentAttackerId: players[0]?.id ?? '',
    contributions: Object.fromEntries(players.map((p) => [p.id, 0])),
    status: 'in-progress',
  };
};

export type AttackInput = {
  attackerId: string;
  weaponId?: string;
  correct: boolean;
};

export const computeAttackDamage = (input: AttackInput): number => {
  const weapon = input.weaponId ? getWeapon(input.weaponId) : null;
  const base = weapon?.combatPowerBonus ?? 300;
  return input.correct ? base : Math.floor(base / 2);
};

export const applyAttack = (
  state: BossBattleState,
  input: AttackInput,
  allPlayerIds: readonly string[],
): BossBattleState => {
  if (state.status !== 'in-progress') return state;
  const damage = computeAttackDamage(input);
  const nextHp = Math.max(0, state.currentHp - damage);
  const contributions = {
    ...state.contributions,
    [input.attackerId]: (state.contributions[input.attackerId] ?? 0) + damage,
  };
  const nextStatus = nextHp <= 0 ? ('victory' as const) : ('in-progress' as const);
  const topContributorId =
    nextStatus === 'victory' ? pickTopContributor(contributions) ?? input.attackerId : undefined;
  const nextAttackerId = pickNextAttacker(allPlayerIds, input.attackerId);

  return {
    ...state,
    currentHp: nextHp,
    contributions,
    status: nextStatus,
    currentAttackerId: nextAttackerId,
    ...(topContributorId ? { topContributorId } : {}),
  };
};

export const markBossEscaped = (state: BossBattleState): BossBattleState => {
  if (state.status !== 'in-progress') return state;
  const top = pickTopContributor(state.contributions);
  return { ...state, status: 'escaped', ...(top ? { topContributorId: top } : {}) };
};

const pickTopContributor = (contributions: Record<string, number>): string | undefined => {
  let topId: string | undefined;
  let topValue = -1;
  for (const [id, val] of Object.entries(contributions)) {
    if (val > topValue) {
      topValue = val;
      topId = id;
    }
  }
  return topId;
};

const pickNextAttacker = (ids: readonly string[], currentId: string): string => {
  if (ids.length === 0) return currentId;
  const idx = ids.indexOf(currentId);
  const nextIdx = (idx + 1) % ids.length;
  return ids[nextIdx] ?? currentId;
};
