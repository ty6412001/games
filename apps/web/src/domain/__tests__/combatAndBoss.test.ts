import type { Player } from '@ultraman/shared';
import { describe, expect, it } from 'vitest';

import {
  applyAttack,
  buildInitialBossBattle,
  computeAttackDamage,
  deriveBossMaxHp,
  markBossEscaped,
} from '../bossBattle.js';
import { calculateCombatPower } from '../combatPower.js';

const makePlayer = (overrides: Partial<Player>): Player => ({
  id: 'p1',
  name: 'a',
  hero: { heroId: 'tiga', badge: 1 },
  isChild: true,
  money: 2000,
  position: 0,
  weaponIds: [],
  ownedTiles: [],
  streak: 5,
  combatPower: 0,
  helpCards: 0,
  ...overrides,
});

describe('calculateCombatPower', () => {
  it('combines money/weapons/review/streak', () => {
    const result = calculateCombatPower(
      makePlayer({ money: 2500, weaponIds: ['tiga-zepellion'], streak: 3 }),
      { reviewCorrectRate: 0.5 },
    );
    expect(result.fromMoney).toBe(25);
    expect(result.fromWeapons).toBe(500);
    expect(result.fromReview).toBe(1000);
    expect(result.fromStreak).toBe(300);
    expect(result.total).toBe(25 + 500 + 1000 + 300);
  });

  it('floors negative money to 0', () => {
    const result = calculateCombatPower(makePlayer({ money: -500, streak: 0 }));
    expect(result.fromMoney).toBe(0);
  });
});

describe('deriveBossMaxHp', () => {
  it('returns at least 1000', () => {
    expect(deriveBossMaxHp(0)).toBe(1000);
  });

  it('is 70% of total combat power', () => {
    expect(deriveBossMaxHp(10000)).toBe(7000);
  });
});

describe('computeAttackDamage', () => {
  it('returns weapon bonus on correct', () => {
    expect(computeAttackDamage({ attackerId: 'p1', weaponId: 'tiga-blade', correct: true })).toBe(900);
  });

  it('halves damage on wrong', () => {
    expect(computeAttackDamage({ attackerId: 'p1', weaponId: 'tiga-blade', correct: false })).toBe(450);
  });

  it('uses fallback damage when no weapon', () => {
    expect(computeAttackDamage({ attackerId: 'p1', correct: true })).toBe(300);
  });
});

describe('applyAttack', () => {
  const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
  const initial = buildInitialBossBattle({ id: 'zetton', name: '杰顿' }, players, 4000);

  it('reduces HP by damage', () => {
    const next = applyAttack(
      initial,
      { attackerId: 'p1', weaponId: 'tiga-zepellion', correct: true },
      ['p1', 'p2'],
    );
    expect(next.currentHp).toBe(initial.maxHp - 500);
    expect(next.currentAttackerId).toBe('p2');
  });

  it('marks victory when HP reaches zero', () => {
    const weak = { ...initial, maxHp: 400, currentHp: 400 };
    const next = applyAttack(
      weak,
      { attackerId: 'p1', weaponId: 'tiga-blade', correct: true },
      ['p1', 'p2'],
    );
    expect(next.currentHp).toBe(0);
    expect(next.status).toBe('victory');
    expect(next.topContributorId).toBe('p1');
  });

  it('tracks contributions correctly', () => {
    let state = initial;
    state = applyAttack(
      state,
      { attackerId: 'p1', weaponId: 'tiga-zepellion', correct: true },
      ['p1', 'p2'],
    );
    state = applyAttack(
      state,
      { attackerId: 'p2', weaponId: 'zero-slash', correct: true },
      ['p1', 'p2'],
    );
    expect(state.contributions.p1).toBe(500);
    expect(state.contributions.p2).toBe(900);
  });
});

describe('markBossEscaped', () => {
  const players = [makePlayer({ id: 'p1' }), makePlayer({ id: 'p2' })];
  const initial = buildInitialBossBattle({ id: 'zetton', name: '杰顿' }, players, 4000);

  it('freezes to escaped with top contributor', () => {
    const attacked = applyAttack(
      initial,
      { attackerId: 'p1', weaponId: 'tiga-zepellion', correct: true },
      ['p1', 'p2'],
    );
    const escaped = markBossEscaped(attacked);
    expect(escaped.status).toBe('escaped');
    expect(escaped.topContributorId).toBe('p1');
  });
});
