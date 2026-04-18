import type { Boss } from '@ultraman/shared';

export const BOSSES: readonly Boss[] = [
  { id: 'zetton', name: '杰顿', week: 1, hp: 3000 },
  { id: 'gomora', name: '哥莫拉', week: 2, hp: 3200 },
  { id: 'redking', name: '雷德王', week: 3, hp: 3400 },
  { id: 'baltan', name: '巴尔坦星人', week: 4, hp: 3600 },
  { id: 'eleking', name: '艾雷王', week: 5, hp: 3800 },
  { id: 'alien-mephilas', name: '美菲拉斯星人', week: 6, hp: 4000 },
  { id: 'king-of-mons', name: '怪兽之王', week: 7, hp: 4200 },
  { id: 'skydon', name: '斯卡伊冬', week: 8, hp: 4400 },
  { id: 'jamila', name: '杰米拉', week: 9, hp: 4600 },
  { id: 'telesdon', name: '特雷斯顿', week: 10, hp: 4800 },
  { id: 'birdon', name: '伯顿', week: 11, hp: 5000 },
  { id: 'pandon', name: '潘顿', week: 12, hp: 5200 },
  { id: 'magnetic-mon', name: '磁力怪兽', week: 13, hp: 5400 },
  { id: 'alien-zarab', name: '扎拉布星人', week: 14, hp: 5600 },
  { id: 'alien-metron', name: '美特隆星人', week: 15, hp: 5800 },
  { id: 'alien-empera', name: '恩贝拉星人', week: 16, hp: 6000 },
  { id: 'kaiser-belial', name: '皇帝贝利亚', week: 17, hp: 6500 },
  { id: 'dark-zagi', name: '黑暗扎基', week: 18, hp: 7000 },
];

export const bossForWeek = (week: number): Boss => {
  const boss = BOSSES.find((b) => b.week === week);
  if (!boss) {
    throw new Error(`no boss for week ${week}`);
  }
  return boss;
};
