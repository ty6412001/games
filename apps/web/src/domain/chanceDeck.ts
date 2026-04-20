import type { Player } from '@ultraman/shared';

export type ChanceCardId =
  | 'supply-drop'
  | 'hero-praise'
  | 'family-help'
  | 'special-training'
  | 'bonus-medal'
  | 'gift-pack'
  | 'good-day'
  | 'monster-prank'
  | 'daydream'
  | 'repair-kit';

export type ChanceCardTone = 'good' | 'bad' | 'mixed';

export type ChanceEffect = {
  readonly money?: number;
  readonly streak?: number;
  readonly helpCards?: number;
};

export type ChanceCardDef = {
  readonly id: ChanceCardId;
  readonly title: string;
  readonly description: string;
  readonly effect: ChanceEffect;
  readonly weight: number;
  readonly tone: ChanceCardTone;
};

export const HELP_CARD_SOFT_CAP = 4;
export const HELP_CARD_OVERFLOW_CASH_PER_CARD = 40;

export const CHANCE_DECK: readonly ChanceCardDef[] = [
  {
    id: 'supply-drop',
    title: '光之补给',
    description: '来自 M78 的能量补给，奥特币到账！',
    effect: { money: 120 },
    weight: 16,
    tone: 'good',
  },
  {
    id: 'hero-praise',
    title: '英雄表扬',
    description: '队长当众表扬，信心满满。',
    effect: { money: 80, streak: 1 },
    weight: 12,
    tone: 'good',
  },
  {
    id: 'family-help',
    title: '爸妈支援',
    description: '爸妈送来一张求助卡，别担心。',
    effect: { helpCards: 1 },
    weight: 12,
    tone: 'good',
  },
  {
    id: 'special-training',
    title: '特训成功',
    description: '刚刚完成一轮特训，连胜精神 +2。',
    effect: { streak: 2 },
    weight: 10,
    tone: 'good',
  },
  {
    id: 'bonus-medal',
    title: '奥特奖金',
    description: '击败小怪的大笔奖金，直接到账。',
    effect: { money: 200 },
    weight: 8,
    tone: 'good',
  },
  {
    id: 'gift-pack',
    title: '补给礼包',
    description: '小零钱加上一张求助卡，暖暖的。',
    effect: { money: 40, helpCards: 1 },
    weight: 8,
    tone: 'good',
  },
  {
    id: 'good-day',
    title: '今天状态真好',
    description: '感觉手感来了，连胜 +1。',
    effect: { streak: 1 },
    weight: 10,
    tone: 'good',
  },
  {
    id: 'monster-prank',
    title: '小怪恶作剧',
    description: '被小怪戏耍了一下，掉了一点币。',
    effect: { money: -40 },
    weight: 10,
    tone: 'bad',
  },
  {
    id: 'daydream',
    title: '走神一下',
    description: '一不小心走神，连胜 -1。',
    effect: { streak: -1 },
    weight: 8,
    tone: 'bad',
  },
  {
    id: 'repair-kit',
    title: '修理小装备',
    description: '装备小修一下，花点钱，但领了张求助卡。',
    effect: { money: -40, helpCards: 1 },
    weight: 6,
    tone: 'mixed',
  },
];

const TOTAL_WEIGHT = CHANCE_DECK.reduce((sum, card) => sum + card.weight, 0);

export const totalChanceWeight = (): number => TOTAL_WEIGHT;

export const findChanceCard = (id: ChanceCardId): ChanceCardDef | null =>
  CHANCE_DECK.find((c) => c.id === id) ?? null;

export type ChanceDraw = {
  readonly card: ChanceCardDef;
  readonly randomIndex: number;
};

export const drawChanceCard = (rand: () => number = Math.random): ChanceDraw => {
  const roll = Math.max(0, Math.min(0.9999999, rand()));
  const target = roll * TOTAL_WEIGHT;
  let cursor = 0;
  for (const card of CHANCE_DECK) {
    cursor += card.weight;
    if (target < cursor) {
      return { card, randomIndex: target };
    }
  }
  return { card: CHANCE_DECK[CHANCE_DECK.length - 1]!, randomIndex: target };
};

export type ChanceActualDelta = {
  readonly money: number;
  readonly streak: number;
  readonly helpCards: number;
};

export type ChanceApplyResult = {
  readonly player: Player;
  readonly actualDelta: ChanceActualDelta;
  readonly converted: {
    readonly helpCardToMoney: number;
  };
};

export const applyChanceCard = (player: Player, card: ChanceCardDef): ChanceApplyResult => {
  const wantedMoney = card.effect.money ?? 0;
  const wantedStreak = card.effect.streak ?? 0;
  const wantedHelpCards = card.effect.helpCards ?? 0;

  const helpCardsBefore = player.helpCards;
  const rawHelpTarget = helpCardsBefore + wantedHelpCards;
  const clampedHelpTarget = Math.max(0, Math.min(HELP_CARD_SOFT_CAP, rawHelpTarget));
  const helpCardsDelta = clampedHelpTarget - helpCardsBefore;
  const overflowCards = Math.max(0, rawHelpTarget - HELP_CARD_SOFT_CAP);
  const overflowCash = overflowCards * HELP_CARD_OVERFLOW_CASH_PER_CARD;

  const moneyBefore = player.money;
  const rawMoneyTarget = moneyBefore + wantedMoney + overflowCash;
  const clampedMoneyTarget = Math.max(0, rawMoneyTarget);
  const moneyDelta = clampedMoneyTarget - moneyBefore;

  const streakBefore = player.streak;
  const clampedStreakTarget = Math.max(0, streakBefore + wantedStreak);
  const streakDelta = clampedStreakTarget - streakBefore;

  const updated: Player = {
    ...player,
    money: clampedMoneyTarget,
    streak: clampedStreakTarget,
    helpCards: clampedHelpTarget,
  };

  return {
    player: updated,
    actualDelta: {
      money: moneyDelta,
      streak: streakDelta,
      helpCards: helpCardsDelta,
    },
    converted: {
      helpCardToMoney: overflowCards,
    },
  };
};
