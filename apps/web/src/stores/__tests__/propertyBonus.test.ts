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

const startOwnedGame = async () => {
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
  const propertyTile = game.tiles.find((t) => t.type === 'property')!;
  useGameStore.setState({
    game: {
      ...game,
      currentTurn: game.players.findIndex((p) => p.isChild),
      players: game.players.map((p) =>
        p.id === child.id ? { ...p, ownedTiles: [propertyTile.position] } : p,
      ),
    },
  });
  return { useGameStore, owner: child, tile: propertyTile };
};

describe('property-bonus quiz flow', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('correct answer adds min(80, floor(baseRent * 0.5)) bonus', async () => {
    const { useGameStore, owner, tile } = await startOwnedGame();
    if (tile.type !== 'property') throw new Error('unreachable');
    const ownerBefore = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;
    const expectedBonus = Math.min(80, Math.floor(tile.baseRent * 0.5));

    useGameStore.setState({
      landingEvent: { kind: 'property-owned-self', position: tile.position },
    });

    useGameStore.getState().chooseSelfPropertyQuiz();
    const pending = useGameStore.getState().pendingQuiz!;
    expect(pending.context.kind).toBe('property-bonus');

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

    const ownerAfter = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;
    expect(ownerAfter - ownerBefore).toBe(expectedBonus);
    expect(useGameStore.getState().quizResult!.message).toMatch(new RegExp(`${expectedBonus}`));
  });

  it('wrong answer gives no bonus, no penalty, and resets streak', async () => {
    const { useGameStore, owner, tile } = await startOwnedGame();
    if (tile.type !== 'property') throw new Error('unreachable');
    const ownerBefore = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!.money;

    // Prime streak=2 so we can assert reset on wrong
    useGameStore.setState({
      game: {
        ...useGameStore.getState().game!,
        players: useGameStore.getState().game!.players.map((p) =>
          p.id === owner.id ? { ...p, streak: 2 } : p,
        ),
      },
    });

    useGameStore.setState({
      landingEvent: { kind: 'property-owned-self', position: tile.position },
    });

    useGameStore.getState().chooseSelfPropertyQuiz();
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

    const after = useGameStore.getState().game!.players.find((p) => p.id === owner.id)!;
    expect(after.money).toBe(ownerBefore);
    expect(after.streak).toBe(0);
    expect(useGameStore.getState().quizResult!.message).toMatch(/没有奖励/);
  });
});
