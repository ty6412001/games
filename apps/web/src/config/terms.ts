export const TERMS = {
  rent: '过路费',
  owner: '房主',
  rentWaiver: '不交过路费',
  payRent: '交过路费',
  bankruptcy: '钱用光了',
  property: '地',
  buyProperty: '买下这块地',
  settle: '算钱',
  studyTile: '学习星',
  brainPack: '挑战题',
} as const;

export type TermKey = keyof typeof TERMS;

export const GLOSS = {
  bossOutpost: 'Boss 住在这里等你',
  transformEnergy: '钱（用来变身）',
  wrongBook: '错的题会记在这本子里，下次再练',
  helpCard: '卡住时能看提示',
  studyTile: '踩到就有题，答对拿金币',
  brainPack: '不分学科的脑筋题，只有大人能做',
  monster: '小怪兽挡路，答对一题就打跑它',
  finisher: '能量满了才能放的大招，Boss 血减半',
} as const;

export type GlossKey = keyof typeof GLOSS;
