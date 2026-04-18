import { describe, expect, it } from 'vitest';

import {
  BossBattleStateSchema,
  GameStateSchema,
  HeroIdSchema,
  PlayerSchema,
  QuestionPackSchema,
  QuestionSchema,
  TileSchema,
  WeaponSchema,
  WrongBookEntrySchema,
} from '../index.js';

describe('HeroIdSchema', () => {
  it('accepts the four heroes', () => {
    for (const id of ['tiga', 'zero', 'decker', 'belial'] as const) {
      expect(HeroIdSchema.parse(id)).toBe(id);
    }
  });

  it('rejects unknown heroes', () => {
    expect(HeroIdSchema.safeParse('ginga').success).toBe(false);
  });
});

describe('WeaponSchema', () => {
  it('accepts a valid weapon', () => {
    const result = WeaponSchema.parse({
      id: 'tiga-zepellion',
      heroId: 'tiga',
      name: '哉佩利敖光线',
      rarity: 'common',
      combatPowerBonus: 500,
    });
    expect(result.name).toBe('哉佩利敖光线');
  });

  it('rejects negative combat bonus', () => {
    expect(
      WeaponSchema.safeParse({
        id: 'x',
        heroId: 'tiga',
        name: 'x',
        rarity: 'common',
        combatPowerBonus: -1,
      }).success,
    ).toBe(false);
  });
});

describe('QuestionSchema', () => {
  const validChoice = {
    id: 'm-w01-001',
    subject: 'math',
    difficulty: 1,
    topic: '加法',
    stem: '8 + 5 = ?',
    type: 'choice',
    options: ['12', '13', '14'],
    answer: '13',
  } as const;

  it('accepts a choice question with answer in options', () => {
    expect(QuestionSchema.parse(validChoice).answer).toBe('13');
  });

  it('rejects a choice question whose answer is not in options', () => {
    const bad = { ...validChoice, answer: '99' };
    const result = QuestionSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid difficulty', () => {
    expect(QuestionSchema.safeParse({ ...validChoice, difficulty: 5 }).success).toBe(false);
  });

  it('accepts an input question', () => {
    const q = {
      id: 'm-w01-002',
      subject: 'math',
      difficulty: 2,
      topic: '加法',
      stem: '7 + 8 = ?',
      type: 'input',
      answer: '15',
    };
    expect(QuestionSchema.parse(q).answer).toBe('15');
  });

  it('accepts an ordering question with matching lengths', () => {
    const q = {
      id: 'c-w02-001',
      subject: 'chinese',
      difficulty: 1,
      topic: '拼音顺序',
      stem: '把下列拼音按顺序排好',
      type: 'ordering',
      items: ['b', 'p', 'm', 'f'],
      correctOrder: [0, 1, 2, 3],
      answer: '0,1,2,3',
    };
    expect(QuestionSchema.parse(q).type).toBe('ordering');
  });

  it('rejects ordering question with mismatched lengths', () => {
    const q = {
      id: 'c-w02-002',
      subject: 'chinese',
      difficulty: 1,
      topic: '拼音顺序',
      stem: 'x',
      type: 'ordering',
      items: ['a', 'b', 'c'],
      correctOrder: [0, 1],
      answer: '0,1',
    };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });

  it('rejects ordering question with duplicate indices', () => {
    const q = {
      id: 'c-w02-003',
      subject: 'chinese',
      difficulty: 1,
      topic: 'x',
      stem: 'x',
      type: 'ordering',
      items: ['a', 'b'],
      correctOrder: [0, 0],
      answer: '0,0',
    };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });
});

describe('QuestionPackSchema', () => {
  it('accepts a pack with one question', () => {
    const pack = {
      week: 1,
      title: 'W1',
      boss: { id: 'zetton', name: '杰顿', hp: 3000 },
      questions: [
        {
          id: 'm-w01-001',
          subject: 'math',
          difficulty: 1,
          topic: '加法',
          stem: '1+1',
          type: 'input',
          answer: '2',
        },
      ],
    };
    expect(QuestionPackSchema.parse(pack).week).toBe(1);
  });

  it('rejects week out of range', () => {
    expect(
      QuestionPackSchema.safeParse({
        week: 19,
        title: 'x',
        boss: { id: 'x', name: 'x', hp: 1 },
        questions: [],
      }).success,
    ).toBe(false);
  });
});

describe('TileSchema', () => {
  it('accepts a property tile', () => {
    const tile = TileSchema.parse({
      position: 1,
      type: 'property',
      name: '巴尔坦',
      district: 'monster-forest',
      basePrice: 200,
      baseRent: 40,
    });
    expect(tile.type).toBe('property');
  });

  it('enforces start tile at position 0', () => {
    expect(TileSchema.safeParse({ position: 5, type: 'start' }).success).toBe(false);
  });
});

describe('PlayerSchema', () => {
  it('accepts a valid player', () => {
    const result = PlayerSchema.parse({
      id: 'p1',
      name: '小明',
      hero: { heroId: 'tiga', badge: 1 },
      isChild: true,
      money: 1500,
      position: 0,
      weaponIds: [],
      ownedTiles: [],
      streak: 0,
      combatPower: 0,
      helpCards: 0,
    });
    expect(result.name).toBe('小明');
  });

  it('rejects non-integer money', () => {
    expect(
      PlayerSchema.safeParse({
        id: 'p1',
        name: '小明',
        hero: { heroId: 'tiga', badge: 1 },
        isChild: true,
        money: 1500.5,
        position: 0,
        weaponIds: [],
        ownedTiles: [],
        streak: 0,
        combatPower: 0,
        helpCards: 0,
      }).success,
    ).toBe(false);
  });
});

describe('GameStateSchema', () => {
  it('rejects boards with wrong tile count', () => {
    const base = {
      id: 'g1',
      startedAt: 1,
      durationMin: 30,
      week: 1,
      players: [
        {
          id: 'p1',
          name: 'a',
          hero: { heroId: 'tiga', badge: 1 },
          isChild: true,
          money: 1500,
          position: 0,
          weaponIds: [],
          ownedTiles: [],
          streak: 0,
          combatPower: 0,
          helpCards: 0,
        },
        {
          id: 'p2',
          name: 'b',
          hero: { heroId: 'zero', badge: 1 },
          isChild: false,
          money: 1500,
          position: 0,
          weaponIds: [],
          ownedTiles: [],
          streak: 0,
          combatPower: 0,
          helpCards: 0,
        },
      ],
      currentTurn: 0,
      phase: 'monopoly',
      tiles: [{ position: 0, type: 'start' }],
    };
    expect(GameStateSchema.safeParse(base).success).toBe(false);
  });
});

describe('WrongBookEntrySchema', () => {
  it('accepts a basic entry', () => {
    const entry = WrongBookEntrySchema.parse({
      id: 'e1',
      childId: 'c1',
      questionId: 'm-w01-001',
      subject: 'math',
      week: 1,
      stem: '1+1',
      wrongAnswer: '3',
      correctAnswer: '2',
      firstWrongAt: 1,
      lastWrongAt: 1,
      wrongCount: 1,
      isMastered: false,
    });
    expect(entry.wrongCount).toBe(1);
  });
});

describe('BossBattleStateSchema', () => {
  it('accepts a pending battle', () => {
    const state = BossBattleStateSchema.parse({
      bossId: 'zetton',
      bossName: '杰顿',
      maxHp: 3000,
      currentHp: 3000,
      currentAttackerId: 'p1',
      contributions: { p1: 0 },
      status: 'pending',
    });
    expect(state.status).toBe('pending');
  });
});
