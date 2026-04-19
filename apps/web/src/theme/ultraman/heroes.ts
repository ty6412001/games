import type { HeroId } from '@ultraman/shared';

export type HeroProfile = {
  id: HeroId;
  name: string;
  color: string;
  accent: string;
  tagline: string;
  imageUrl?: string;
};

export const HEROES: readonly HeroProfile[] = [
  { id: 'tiga', name: '迪迦', color: '#7c4dff', accent: '#ffd740', tagline: '光之巨人' },
  { id: 'zero', name: '赛罗', color: '#2979ff', accent: '#ff1744', tagline: '赛罗战士' },
  { id: 'decker', name: '德凯', color: '#00c853', accent: '#ffffff', tagline: '新世代闪耀' },
  { id: 'belial', name: '贝利亚', color: '#d500f9', accent: '#ff9100', tagline: '暗之皇帝' },
];

export const getHero = (id: HeroId): HeroProfile => {
  const hero = HEROES.find((h) => h.id === id);
  if (!hero) {
    throw new Error(`unknown hero: ${id}`);
  }
  return hero;
};
