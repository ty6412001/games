import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../domain/chanceDeck.js', async () => {
  const actual = await vi.importActual<typeof import('../../domain/chanceDeck.js')>(
    '../../domain/chanceDeck.js',
  );
  const fixed = actual.findChanceCard('monster-prank')!;
  return {
    ...actual,
    drawChanceCard: vi.fn(() => ({ card: fixed, randomIndex: 0 })),
  };
});

vi.mock('../../data/packs/questionPackLoader.js', () => ({
  loadQuestionPack: vi.fn(async () => ({
    week: 1,
    title: 'w1',
    boss: { id: 'zetton', name: 'z', hp: 3000 },
    questions: [
      {
        id: 'q1',
        subject: 'math',
        difficulty: 1,
        topic: 't',
        type: 'choice',
        stem: '1+1',
        options: ['2', '3'],
        answer: '2',
      },
    ],
  })),
  loadBrainPack: vi.fn(async () => ({
    week: 1,
    title: 'brain',
    boss: { id: 'zetton', name: 'z', hp: 3000 },
    questions: [
      {
        id: 'b1',
        subject: 'brain',
        difficulty: 1,
        topic: 't',
        type: 'choice',
        stem: '什么门永远关不上？',
        options: ['球门', '车门'],
        answer: '球门',
      },
    ],
  })),
}));

vi.mock('../../data/repo/wrongBookRepo.js', () => ({
  recordWrong: vi.fn((_args: unknown) => Promise.resolve({ id: 'mock' })),
}));

vi.mock('../../data/repo/correctBookRepo.js', () => ({
  recordCorrect: vi.fn(async () => undefined),
  listCorrectIdsByChild: vi.fn(async () => ({
    math: new Set<string>(),
    chinese: new Set<string>(),
    english: new Set<string>(),
    brain: new Set<string>(),
  })),
  clearCorrectForChild: vi.fn(async () => undefined),
}));

const importStore = async () => {
  const mod = await import('../gameStore.js');
  return mod.useGameStore;
};

describe('chance flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('landing on a chance tile draws a card, updates player money, and opens chanceResult', async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
        { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
      ],
    });

    const store = useGameStore.getState();
    const child = store.game!.players.find((p) => p.isChild)!;
    const chancePos = store.game!.tiles.findIndex((t) => t.type === 'chance');
    expect(chancePos).toBeGreaterThan(0);
    const moneyBefore = child.money;

    useGameStore.setState({
      game: {
        ...store.game!,
        players: store.game!.players.map((p) =>
          p.id === child.id ? { ...p, position: chancePos - 1 } : p,
        ),
        currentTurn: store.game!.players.findIndex((p) => p.id === child.id),
      },
    });

    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0001);
    await useGameStore.getState().rollAndMove();
    randSpy.mockRestore();

    const after = useGameStore.getState();
    expect(after.chanceResult).not.toBeNull();
    expect(after.chanceResult!.card.id).toBe('monster-prank');
    expect(after.chanceResult!.actualDelta.money).toBe(-40);
    const childAfter = after.game!.players.find((p) => p.id === child.id)!;
    expect(childAfter.money).toBe(moneyBefore - 40);
  });

  it('tick during a chance overlay does not end the game on time-up', async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
      ],
    });

    const game = useGameStore.getState().game!;
    useGameStore.setState({
      chanceResult: {
        playerId: game.players[0]!.id,
        card: (await import('../../domain/chanceDeck.js')).findChanceCard('supply-drop')!,
        actualDelta: { money: 120, streak: 0, helpCards: 0 },
        converted: { helpCardToMoney: 0 },
      },
    });

    const farFuture = game.startedAt + game.durationMin * 60 * 1000 + 10_000;
    useGameStore.getState().tick(farFuture);

    expect(useGameStore.getState().game!.phase).toBe('monopoly');
  });

  it('dismissChanceResult clears state and advances the turn', async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
        { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
      ],
    });

    const game = useGameStore.getState().game!;
    const turnBefore = game.currentTurn;
    useGameStore.setState({
      chanceResult: {
        playerId: game.players[turnBefore]!.id,
        card: (await import('../../domain/chanceDeck.js')).findChanceCard('supply-drop')!,
        actualDelta: { money: 120, streak: 0, helpCards: 0 },
        converted: { helpCardToMoney: 0 },
      },
    });

    useGameStore.getState().dismissChanceResult();
    const after = useGameStore.getState();
    expect(after.chanceResult).toBeNull();
    expect(after.game!.currentTurn).toBe((turnBefore + 1) % game.players.length);
  });

  it('negative card cannot drop player money below zero', async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
        { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
      ],
    });

    const store = useGameStore.getState();
    const child = store.game!.players.find((p) => p.isChild)!;
    const chancePos = store.game!.tiles.findIndex((t) => t.type === 'chance');
    expect(chancePos).toBeGreaterThan(0);
    useGameStore.setState({
      game: {
        ...store.game!,
        players: store.game!.players.map((p) =>
          p.id === child.id ? { ...p, position: chancePos - 1, money: 20 } : p,
        ),
        currentTurn: store.game!.players.findIndex((p) => p.id === child.id),
      },
    });

    const randSpy = vi.spyOn(Math, 'random').mockReturnValue(0.0001);
    await useGameStore.getState().rollAndMove();
    randSpy.mockRestore();

    const after = useGameStore.getState();
    const childAfter = after.game!.players.find((p) => p.id === child.id)!;
    expect(childAfter.money).toBe(0);
    expect(after.bankruptcy).toBeNull();
  });
});
