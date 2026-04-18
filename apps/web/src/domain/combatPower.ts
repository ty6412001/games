import type { Player, WrongBookEntry } from '@ultraman/shared';

import { getWeapon } from '../theme/ultraman/weapons.js';

export type CombatPowerBreakdown = {
  fromMoney: number;
  fromWeapons: number;
  fromReview: number;
  fromStreak: number;
  total: number;
};

export const calculateCombatPower = (
  player: Player,
  options: {
    reviewCorrectRate?: number;
    maxStreak?: number;
  } = {},
): CombatPowerBreakdown => {
  const reviewRate = Math.min(1, Math.max(0, options.reviewCorrectRate ?? 0));
  const streak = Math.max(0, options.maxStreak ?? player.streak);

  const fromMoney = Math.max(0, Math.floor(player.money / 100));
  const fromWeapons = player.weaponIds.reduce((sum, id) => {
    const w = getWeapon(id);
    return sum + (w?.combatPowerBonus ?? 0);
  }, 0);
  const fromReview = Math.round(reviewRate * 2000);
  const fromStreak = streak * 100;

  return {
    fromMoney,
    fromWeapons,
    fromReview,
    fromStreak,
    total: fromMoney + fromWeapons + fromReview + fromStreak,
  };
};

export const reviewCorrectRate = (entries: readonly WrongBookEntry[]): number => {
  if (entries.length === 0) return 0;
  const mastered = entries.filter((e) => e.isMastered).length;
  return mastered / entries.length;
};
