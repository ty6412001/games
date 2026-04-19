import type { HeroId } from '@ultraman/shared';

export const resolveHeroImage = (heroId: HeroId, explicit?: string): string => {
  if (explicit) return explicit;
  return `/assets/heroes/${heroId}.png`;
};

export const resolveMonsterImage = (bossId: string, explicit?: string): string => {
  if (explicit) return explicit;
  return `/assets/monsters/${bossId}.png`;
};

export const resolveWeaponImage = (weaponId: string, explicit?: string): string => {
  if (explicit) return explicit;
  return `/assets/weapons/${weaponId}.png`;
};
