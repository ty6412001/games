import { describe, expect, it } from 'vitest';
import type { Player } from '@ultraman/shared';

import {
  CHANCE_DECK,
  HELP_CARD_OVERFLOW_CASH_PER_CARD,
  HELP_CARD_SOFT_CAP,
  applyChanceCard,
  drawChanceCard,
  findChanceCard,
  totalChanceWeight,
} from '../chanceDeck';

const buildPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: 'p1',
  name: '小明',
  hero: { heroId: 'tiga', badge: 1 },
  isChild: true,
  money: 1000,
  position: 24,
  weaponIds: [],
  ownedTiles: [],
  streak: 2,
  combatPower: 0,
  helpCards: 1,
  ...overrides,
});

describe('CHANCE_DECK catalog', () => {
  it('weights sum to 100', () => {
    expect(totalChanceWeight()).toBe(100);
  });

  it('has exactly 10 cards', () => {
    expect(CHANCE_DECK).toHaveLength(10);
  });

  it('is 7 good + 2 bad + 1 mixed', () => {
    const byTone = CHANCE_DECK.reduce<Record<string, number>>((acc, c) => {
      acc[c.tone] = (acc[c.tone] ?? 0) + 1;
      return acc;
    }, {});
    expect(byTone).toEqual({ good: 7, bad: 2, mixed: 1 });
  });

  it('every card has a non-empty title and description', () => {
    for (const card of CHANCE_DECK) {
      expect(card.title.length).toBeGreaterThan(0);
      expect(card.description.length).toBeGreaterThan(0);
    }
  });
});

describe('drawChanceCard', () => {
  it('returns the first card when rand=0', () => {
    const { card } = drawChanceCard(() => 0);
    expect(card.id).toBe(CHANCE_DECK[0]!.id);
  });

  it('returns the last card when rand→1', () => {
    const { card } = drawChanceCard(() => 0.99999);
    expect(card.id).toBe(CHANCE_DECK[CHANCE_DECK.length - 1]!.id);
  });

  it('is deterministic with a fixed rand', () => {
    const a = drawChanceCard(() => 0.5).card.id;
    const b = drawChanceCard(() => 0.5).card.id;
    expect(a).toBe(b);
  });

  it('covers all cards across enough samples', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      seen.add(drawChanceCard(() => i / 100).card.id);
    }
    expect(seen.size).toBe(CHANCE_DECK.length);
  });
});

describe('findChanceCard', () => {
  it('returns the card by id', () => {
    expect(findChanceCard('supply-drop')?.title).toBe('光之补给');
  });
});

describe('applyChanceCard', () => {
  it('does not mutate the input player', () => {
    const player = buildPlayer({ money: 500, streak: 1, helpCards: 1 });
    const snapshot = JSON.stringify(player);
    applyChanceCard(player, findChanceCard('monster-prank')!);
    expect(JSON.stringify(player)).toBe(snapshot);
  });

  it('credits money on a positive card', () => {
    const player = buildPlayer({ money: 500 });
    const { player: updated, actualDelta } = applyChanceCard(
      player,
      findChanceCard('bonus-medal')!,
    );
    expect(updated.money).toBe(700);
    expect(actualDelta.money).toBe(200);
  });

  it('never lets money go below zero on a negative card', () => {
    const player = buildPlayer({ money: 20 });
    const { player: updated, actualDelta } = applyChanceCard(
      player,
      findChanceCard('monster-prank')!,
    );
    expect(updated.money).toBe(0);
    expect(actualDelta.money).toBe(-20);
  });

  it('clamps streak at zero on a negative card', () => {
    const player = buildPlayer({ streak: 0 });
    const { player: updated, actualDelta } = applyChanceCard(
      player,
      findChanceCard('daydream')!,
    );
    expect(updated.streak).toBe(0);
    expect(actualDelta.streak).toBe(0);
  });

  it('increments streak additively (no reset to 0)', () => {
    const player = buildPlayer({ streak: 3 });
    const { player: updated } = applyChanceCard(player, findChanceCard('good-day')!);
    expect(updated.streak).toBe(4);
  });

  it('grants help cards up to the soft cap', () => {
    const player = buildPlayer({ helpCards: 2 });
    const { player: updated, actualDelta, converted } = applyChanceCard(
      player,
      findChanceCard('family-help')!,
    );
    expect(updated.helpCards).toBe(3);
    expect(actualDelta.helpCards).toBe(1);
    expect(converted.helpCardToMoney).toBe(0);
  });

  it('converts overflow help cards to cash at the cap', () => {
    const player = buildPlayer({ helpCards: HELP_CARD_SOFT_CAP, money: 100 });
    const { player: updated, actualDelta, converted } = applyChanceCard(
      player,
      findChanceCard('family-help')!,
    );
    expect(updated.helpCards).toBe(HELP_CARD_SOFT_CAP);
    expect(actualDelta.helpCards).toBe(0);
    expect(converted.helpCardToMoney).toBe(1);
    expect(updated.money).toBe(100 + HELP_CARD_OVERFLOW_CASH_PER_CARD);
    expect(actualDelta.money).toBe(HELP_CARD_OVERFLOW_CASH_PER_CARD);
  });

  it('applies combined money + helpCard cards correctly', () => {
    const player = buildPlayer({ money: 300, helpCards: 1 });
    const { player: updated } = applyChanceCard(player, findChanceCard('gift-pack')!);
    expect(updated.money).toBe(340);
    expect(updated.helpCards).toBe(2);
  });

  it('handles repair-kit: -40 money + 1 helpCard', () => {
    const player = buildPlayer({ money: 100, helpCards: 1 });
    const { player: updated, actualDelta } = applyChanceCard(
      player,
      findChanceCard('repair-kit')!,
    );
    expect(updated.money).toBe(60);
    expect(updated.helpCards).toBe(2);
    expect(actualDelta.money).toBe(-40);
    expect(actualDelta.helpCards).toBe(1);
  });

  it('repair-kit with 0 money clamps money to 0 but still grants help card', () => {
    const player = buildPlayer({ money: 10, helpCards: 1 });
    const { player: updated, actualDelta } = applyChanceCard(
      player,
      findChanceCard('repair-kit')!,
    );
    expect(updated.money).toBe(0);
    expect(actualDelta.money).toBe(-10);
    expect(updated.helpCards).toBe(2);
  });
});
