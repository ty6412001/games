import type { HeroId } from '@ultraman/shared';

type Candidates = readonly string[];

const heroPaths = (heroId: HeroId): Candidates => [
  `/assets/heroes/${heroId}.png`,
  `/assets/heroes/${heroId}.svg`,
];

const monsterPaths = (bossId: string): Candidates => [
  `/assets/monsters/${bossId}.png`,
  `/assets/monsters/${bossId}.svg`,
];

const weaponPaths = (weaponId: string): Candidates => [
  `/assets/weapons/${weaponId}.png`,
  `/assets/weapons/${weaponId}.svg`,
];

export const resolveHeroImage = (heroId: HeroId, explicit?: string): Candidates =>
  explicit ? [explicit, ...heroPaths(heroId)] : heroPaths(heroId);

export const resolveMonsterImage = (bossId: string, explicit?: string): Candidates =>
  explicit ? [explicit, ...monsterPaths(bossId)] : monsterPaths(bossId);

export const resolveWeaponImage = (weaponId: string, explicit?: string): Candidates =>
  explicit ? [explicit, ...weaponPaths(weaponId)] : weaponPaths(weaponId);
