import type { HeroId, Weapon } from '@ultraman/shared';

export const WEAPONS: readonly Weapon[] = [
  { id: 'tiga-zepellion', heroId: 'tiga', name: '哉佩利敖光线', rarity: 'common', combatPowerBonus: 500 },
  { id: 'tiga-blade', heroId: 'tiga', name: '光之刃', rarity: 'rare', combatPowerBonus: 900 },
  { id: 'zero-beam', heroId: 'zero', name: '赛罗光线', rarity: 'common', combatPowerBonus: 500 },
  { id: 'zero-slash', heroId: 'zero', name: '赛罗斩', rarity: 'rare', combatPowerBonus: 900 },
  { id: 'decker-beam', heroId: 'decker', name: '德凯光线', rarity: 'common', combatPowerBonus: 500 },
  { id: 'decker-vector', heroId: 'decker', name: 'D 矢量', rarity: 'rare', combatPowerBonus: 900 },
  { id: 'belial-beam', heroId: 'belial', name: '贝利亚光线', rarity: 'common', combatPowerBonus: 500 },
  { id: 'belial-deathcium', heroId: 'belial', name: '德斯西乌姆光线', rarity: 'rare', combatPowerBonus: 900 },
];

export const getHeroWeapons = (heroId: HeroId): Weapon[] =>
  WEAPONS.filter((w) => w.heroId === heroId);

export const getWeapon = (id: string): Weapon | null =>
  WEAPONS.find((w) => w.id === id) ?? null;

export const rollRandomWeapon = (heroId: HeroId, rand: () => number = Math.random): Weapon | null => {
  const pool = getHeroWeapons(heroId);
  if (pool.length === 0) return null;
  const idx = Math.floor(rand() * pool.length);
  return pool[idx] ?? null;
};
