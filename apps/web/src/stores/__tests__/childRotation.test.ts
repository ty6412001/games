import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../data/packs/questionPackLoader.js', () => ({
  loadQuestionPack: vi.fn(async () => ({
    week: 1,
    title: 'w1',
    boss: { id: 'zetton', name: 'z', hp: 3000 },
    questions: [
      {
        id: 'c1',
        subject: 'chinese',
        difficulty: 1,
        topic: '识字',
        type: 'choice',
        stem: 'x',
        options: ['a', 'b'],
        answer: 'a',
      },
      {
        id: 'm1',
        subject: 'math',
        difficulty: 1,
        topic: '加法',
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

describe('child subject rotation', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  const startWithChild = async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
        { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
      ],
    });
    return useGameStore;
  };

  it('child answering a chinese question flips lastChildSubject to chinese', async () => {
    const useGameStore = await startWithChild();
    const state = useGameStore.getState();
    const child = state.game!.players.find((p) => p.isChild)!;
    const chinese = state.currentPack!.questions[0]!;
    useGameStore.setState({
      activeQuiz: {
        question: chinese,
        context: { kind: 'study' },
        playerId: child.id,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
    });
    await useGameStore.getState().submitAnswer('a');
    expect(useGameStore.getState().lastChildSubject).toBe('chinese');
  });

  it('adult answering does not update lastChildSubject', async () => {
    const useGameStore = await startWithChild();
    const state = useGameStore.getState();
    const adult = state.game!.players.find((p) => !p.isChild)!;
    const chinese = state.currentPack!.questions[0]!;
    useGameStore.setState({
      activeQuiz: {
        question: chinese,
        context: { kind: 'study' },
        playerId: adult.id,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
    });
    await useGameStore.getState().submitAnswer('a');
    expect(useGameStore.getState().lastChildSubject).toBeNull();
  });

  it('boss-attack answers do not update lastChildSubject', async () => {
    const useGameStore = await startWithChild();
    const state = useGameStore.getState();
    const child = state.game!.players.find((p) => p.isChild)!;
    const math = state.currentPack!.questions[1]!;
    useGameStore.setState({
      activeQuiz: {
        question: math,
        context: { kind: 'boss-attack' },
        playerId: child.id,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
    });
    await useGameStore.getState().submitAnswer('2');
    expect(useGameStore.getState().lastChildSubject).toBeNull();
  });
});
