import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../data/packs/questionPackLoader.js', () => ({
  loadQuestionPack: vi.fn(async () => ({
    week: 1,
    title: 'w1',
    boss: { id: 'zetton', name: 'z', hp: 3000 },
    questions: [
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加',
        type: 'choice',
        stem: '1+1',
        options: ['1', '2'],
        answer: '2',
      },
    ],
  })),
  loadBrainPack: vi.fn(async () => ({
    week: 1,
    title: 'brain',
    boss: { id: 'zetton', name: 'z', hp: 3000 },
    questions: [],
  })),
}));

vi.mock('../../data/repo/wrongBookRepo.js', () => ({
  recordWrong: vi.fn(async () => ({ id: 'mock' })),
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

const startRentableGame = async () => {
  const useGameStore = await importStore();
  await useGameStore.getState().startGame({
    duration: 20,
    week: 1,
    players: [
      { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
      { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
    ],
  });
  const game = useGameStore.getState().game!;
  const child = game.players.find((p) => p.isChild)!;
  const adult = game.players.find((p) => !p.isChild)!;
  const propertyTile = game.tiles.find((t) => t.type === 'property')!;
  // Adult owns propertyTile; child landed on it.
  useGameStore.setState({
    game: {
      ...game,
      currentTurn: game.players.findIndex((p) => p.isChild),
      players: game.players.map((p) => {
        if (p.id === adult.id) {
          return { ...p, ownedTiles: [propertyTile.position] };
        }
        return p;
      }),
    },
  });
  return { useGameStore, payer: child, owner: adult, tile: propertyTile };
};

describe('property-rent quiz flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('correct answer waives rent: payer money unchanged, owner money unchanged', async () => {
    const { useGameStore, payer, owner, tile } = await startRentableGame();
    const payerBefore = useGameStore.getState().game!.players.find((p) => p.id === payer.id)!.money;
    const ownerBefore = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;
    if (tile.type !== 'property') throw new Error('unreachable');

    useGameStore.setState({
      landingEvent: {
        kind: 'property-owned-other',
        position: tile.position,
        ownerId: owner.id,
        rent: tile.baseRent,
      },
    });

    useGameStore.getState().chooseRentQuiz();
    const pending = useGameStore.getState().pendingQuiz!;
    expect(pending.context.kind).toBe('property-rent');

    const question = useGameStore.getState().currentPack!.questions[0]!;
    useGameStore.setState({
      activeQuiz: {
        question,
        context: pending.context,
        playerId: pending.playerId,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
      pendingQuiz: null,
    });

    await useGameStore.getState().submitAnswer('2');

    const payerAfter = useGameStore.getState().game!.players.find((p) => p.id === payer.id)!.money;
    const ownerAfter = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;
    expect(payerAfter).toBe(payerBefore);
    expect(ownerAfter).toBe(ownerBefore);
    expect(useGameStore.getState().quizResult!.message).toMatch(/不用交过路费/);
  });

  it('wrong answer deducts full rent and credits the owner', async () => {
    const { useGameStore, payer, owner, tile } = await startRentableGame();
    const payerBefore = useGameStore.getState().game!.players.find((p) => p.id === payer.id)!.money;
    const ownerBefore = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;
    if (tile.type !== 'property') throw new Error('unreachable');

    useGameStore.setState({
      landingEvent: {
        kind: 'property-owned-other',
        position: tile.position,
        ownerId: owner.id,
        rent: tile.baseRent,
      },
    });

    useGameStore.getState().chooseRentQuiz();
    const pending = useGameStore.getState().pendingQuiz!;
    const question = useGameStore.getState().currentPack!.questions[0]!;
    useGameStore.setState({
      activeQuiz: {
        question,
        context: pending.context,
        playerId: pending.playerId,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
      pendingQuiz: null,
    });

    await useGameStore.getState().submitAnswer('wrong');

    const payerAfter = useGameStore.getState().game!.players.find((p) => p.id === payer.id)!.money;
    const ownerAfter = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;
    expect(payerAfter).toBe(payerBefore - tile.baseRent);
    expect(ownerAfter).toBe(ownerBefore + tile.baseRent);
    expect(useGameStore.getState().rentNotice?.amount).toBe(tile.baseRent);
  });

  it('acceptRentPayment settles rent immediately without quiz', async () => {
    const { useGameStore, payer, owner, tile } = await startRentableGame();
    const payerBefore = useGameStore.getState().game!.players.find((p) => p.id === payer.id)!.money;
    if (tile.type !== 'property') throw new Error('unreachable');

    useGameStore.setState({
      landingEvent: {
        kind: 'property-owned-other',
        position: tile.position,
        ownerId: owner.id,
        rent: tile.baseRent,
      },
    });

    useGameStore.getState().acceptRentPayment();

    const payerAfter = useGameStore.getState().game!.players.find((p) => p.id === payer.id)!.money;
    expect(payerAfter).toBe(payerBefore - tile.baseRent);
    expect(useGameStore.getState().rentNotice?.amount).toBe(tile.baseRent);
    expect(useGameStore.getState().pendingQuiz).toBeNull();
  });
});
