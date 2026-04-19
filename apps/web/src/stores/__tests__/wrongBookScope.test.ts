import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
}));

const recordWrongMock = vi.fn((_args: unknown) => Promise.resolve({ id: 'mock' }));

vi.mock('../../data/repo/wrongBookRepo.js', () => ({
  recordWrong: (args: unknown) => recordWrongMock(args),
}));

const importStore = async () => {
  const mod = await import('../gameStore.js');
  return mod.useGameStore;
};

describe('wrongBook scope', () => {
  beforeEach(() => {
    recordWrongMock.mockClear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const startGameWith = async (
    players: { name: string; heroId: 'tiga' | 'zero' | 'decker' | 'belial'; isChild: boolean }[],
  ) => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: players.map((p) => ({
        name: p.name,
        heroId: p.heroId,
        badge: 1 as const,
        isChild: p.isChild,
      })),
    });
    return useGameStore;
  };

  it('records wrong only for the designated child', async () => {
    const useGameStore = await startGameWith([
      { name: '爸爸', heroId: 'zero', isChild: false },
      { name: '小明', heroId: 'tiga', isChild: true },
    ]);

    const store = useGameStore.getState();
    const child = store.game!.players.find((p) => p.isChild)!;
    const adult = store.game!.players.find((p) => !p.isChild)!;
    const question = store.currentPack!.questions[0]!;

    // simulate adult answering wrong
    useGameStore.setState({
      activeQuiz: {
        question,
        context: { kind: 'study' },
        playerId: adult.id,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60000,
      },
    });
    await useGameStore.getState().submitAnswer('999');
    expect(recordWrongMock).not.toHaveBeenCalled();

    // simulate child answering wrong
    useGameStore.setState({
      activeQuiz: {
        question,
        context: { kind: 'study' },
        playerId: child.id,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60000,
      },
      quizResult: null,
    });
    await useGameStore.getState().submitAnswer('888');
    expect(recordWrongMock).toHaveBeenCalledTimes(1);
  });
});
