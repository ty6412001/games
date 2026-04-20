import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadQuestionPackMock = vi.fn(async () => ({
  week: 1,
  title: 'w1',
  boss: { id: 'zetton', name: 'z', hp: 3000 },
  questions: [
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
    {
      id: 'm2',
      subject: 'math',
      difficulty: 1,
      topic: '减法',
      type: 'choice',
      stem: '2-1',
      options: ['1', '2'],
      answer: '1',
    },
  ],
}));

const loadBrainPackMock = vi.fn(async () => ({
  week: 1,
  title: 'brain',
  boss: { id: 'zetton', name: 'z', hp: 3000 },
  questions: [
    {
      id: 'b1',
      subject: 'brain',
      difficulty: 1,
      topic: '脑筋急转弯',
      type: 'choice',
      stem: '什么门永远关不上？',
      options: ['球门', '车门'],
      answer: '球门',
    },
  ],
}));

const buildBrainPack = (questions: unknown[]) => ({
  week: 1,
  title: 'brain',
  boss: { id: 'zetton', name: 'z', hp: 3000 },
  questions,
});

vi.mock('../../data/packs/questionPackLoader.js', () => ({
  loadQuestionPack: () => loadQuestionPackMock(),
  loadBrainPack: () => loadBrainPackMock(),
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

describe('question repeat rules', () => {
  beforeEach(() => {
    vi.resetModules();
    loadQuestionPackMock.mockClear();
    loadBrainPackMock.mockClear();
  });

  const startGame = async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        {
          name: '小明',
          heroId: 'tiga',
          badge: 1 as const,
          isChild: true,
        },
      ],
    });
    return useGameStore;
  };

  it('excludes correctly answered questions later in the same game', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;
    const m1 = useGameStore.getState().currentPack!.questions[0]!;

    useGameStore.setState({
      activeQuiz: {
        question: m1,
        context: { kind: 'study' },
        playerId,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
    });

    await useGameStore.getState().submitAnswer('2');

    const picked = (useGameStore.getState().currentPack!.questions).filter(
      (q) => q.subject === 'math' && !useGameStore.getState().correctQuestionIds.math.has(q.id),
    );

    expect(useGameStore.getState().correctQuestionIds.math.has('m1')).toBe(true);
    expect(picked.map((q) => q.id)).toEqual(['m2']);
  });

  it('keeps wrongly answered questions eligible later in the same game', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;
    const m1 = useGameStore.getState().currentPack!.questions[0]!;

    useGameStore.setState({
      activeQuiz: {
        question: m1,
        context: { kind: 'study' },
        playerId,
        usedHelp: false,
        startedAt: Date.now(),
        deadlineAt: Date.now() + 60_000,
      },
    });

    await useGameStore.getState().submitAnswer('999');

    const eligible = useGameStore
      .getState()
      .currentPack!.questions.filter(
        (q) => q.subject === 'math' && !useGameStore.getState().correctQuestionIds.math.has(q.id),
      )
      .map((q) => q.id);

    expect(useGameStore.getState().correctQuestionIds.math.size).toBe(0);
    expect(eligible).toEqual(['m1', 'm2']);
  });

  it('records recent question history when a week-pack quiz starts', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;

    useGameStore.setState({
      childId: null,
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    await useGameStore.getState().selectSubject('math');
    const question = useGameStore.getState().activeQuiz!.question;

    expect(useGameStore.getState().recentQuestionHistory.math).toEqual([
      {
        questionId: question.id,
        topic: question.topic,
        type: question.type,
        difficulty: question.difficulty,
      },
    ]);
  });

  it('keeps only the latest 2 history entries for a subject', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;
    const pack = useGameStore.getState().currentPack!;
    const [m1, m2] = pack.questions;
    const m3: (typeof pack.questions)[number] = {
      id: 'm3',
      subject: 'math',
      difficulty: 2,
      topic: '乘法',
      type: 'choice',
      stem: '2x2',
      options: ['3', '4'],
      answer: '4',
    };

    useGameStore.setState({
      currentPack: {
        ...pack,
        questions: [...pack.questions, m3],
      },
      recentQuestionHistory: {
        ...useGameStore.getState().recentQuestionHistory,
        math: [
          {
            questionId: m1!.id,
            topic: m1!.topic,
            type: m1!.type,
            difficulty: m1!.difficulty,
          },
          {
            questionId: m2!.id,
            topic: m2!.topic,
            type: m2!.type,
            difficulty: m2!.difficulty,
          },
        ],
      },
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    await useGameStore.getState().selectSubject('math');

    expect(useGameStore.getState().recentQuestionHistory.math).toEqual([
      {
        questionId: 'm2',
        topic: '减法',
        type: 'choice',
        difficulty: 1,
      },
      {
        questionId: 'm3',
        topic: '乘法',
        type: 'choice',
        difficulty: 2,
      },
    ]);
  });

  it('uses the already loaded currentPack for non-brain subject selection', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;

    loadQuestionPackMock.mockClear();

    useGameStore.setState({
      childId: null,
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    await useGameStore.getState().selectSubject('math');

    expect(loadQuestionPackMock).not.toHaveBeenCalled();
    expect(useGameStore.getState().activeQuiz?.question.subject).toBe('math');
  });

  it('leaves no eligible question when all questions of a subject are answered correctly', async () => {
    const useGameStore = await startGame();
    const correctQuestionIds = {
      ...useGameStore.getState().correctQuestionIds,
      math: new Set(['m1', 'm2']),
    };

    useGameStore.setState({ correctQuestionIds });

    const eligible = useGameStore
      .getState()
      .currentPack!.questions.filter(
        (q) => q.subject === 'math' && !useGameStore.getState().correctQuestionIds.math.has(q.id),
      );

    expect(eligible).toHaveLength(0);
  });

  it('keeps the week pack in currentPack when selecting brain', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;

    useGameStore.setState({
      childId: null,
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    await useGameStore.getState().selectSubject('brain');

    const state = useGameStore.getState();
    expect(state.currentPack!.title).toBe('w1');
    expect(state.pendingQuiz).toBeNull();
    expect(state.activeQuiz?.question.subject).toBe('brain');
  });

  it('clears pendingQuiz when brain has no available questions', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;

    loadBrainPackMock.mockResolvedValueOnce(
      buildBrainPack([
        {
          id: 'x1',
          subject: 'math',
          difficulty: 1,
          topic: '占位',
          type: 'choice',
          stem: '1+0',
          options: ['0', '1'],
          answer: '1',
        },
      ]) as never,
    );

    useGameStore.setState({
      childId: null,
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    await useGameStore.getState().selectSubject('brain');

    const state = useGameStore.getState();
    expect(state.currentPack!.title).toBe('w1');
    expect(state.pendingQuiz).toBeNull();
    expect(state.activeQuiz).toBeNull();
  });

  it('brain selection uses the same recent-history variety path and can choose a different topic/type/difficulty candidate when available', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;

    loadBrainPackMock.mockResolvedValueOnce(
      buildBrainPack([
        {
          id: 'b1',
          subject: 'brain',
          difficulty: 1,
          topic: '脑筋急转弯',
          type: 'choice',
          stem: '什么门永远关不上？',
          options: ['球门', '车门'],
          answer: '球门',
        },
        {
          id: 'b2',
          subject: 'brain',
          difficulty: 2,
          topic: '图形推理',
          type: 'input',
          stem: '找规律',
          options: [],
          answer: '圆形',
        },
      ]) as never,
    );

    useGameStore.setState({
      childId: null,
      recentQuestionHistory: {
        ...useGameStore.getState().recentQuestionHistory,
        brain: [
          {
            questionId: 'b1',
            topic: '脑筋急转弯',
            type: 'choice',
            difficulty: 1,
          },
        ],
      },
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    await useGameStore.getState().selectSubject('brain');

    expect(useGameStore.getState().activeQuiz?.question.id).toBe('b2');
    expect(useGameStore.getState().recentQuestionHistory.brain).toEqual([
      {
        questionId: 'b1',
        topic: '脑筋急转弯',
        type: 'choice',
        difficulty: 1,
      },
      {
        questionId: 'b2',
        topic: '图形推理',
        type: 'input',
        difficulty: 2,
      },
    ]);
  });

  it('drops stale brain selection results when state changes while loading', async () => {
    const useGameStore = await startGame();
    const playerId = useGameStore.getState().game!.players[0]!.id;

    let resolvePack!: (value: Awaited<ReturnType<typeof loadBrainPackMock>>) => void;
    loadBrainPackMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolvePack = resolve;
        }),
    );

    useGameStore.setState({
      childId: null,
      pendingQuiz: {
        context: { kind: 'study' },
        playerId,
      },
    });

    const selectPromise = useGameStore.getState().selectSubject('brain');
    useGameStore.setState({
      quizResult: {
        outcome: 'correct',
        reward: 0,
        message: 'busy',
        correct: true,
        contextKind: 'study',
        playerId,
      },
    });
    resolvePack!(
      buildBrainPack([
        {
          id: 'b1',
          subject: 'brain',
          difficulty: 1,
          topic: '脑筋急转弯',
          type: 'choice',
          stem: '什么门永远关不上？',
          options: ['球门', '车门'],
          answer: '球门',
        },
      ]) as never,
    );
    await selectPromise;

    const state = useGameStore.getState();
    expect(state.currentPack!.title).toBe('w1');
    expect(state.pendingQuiz).not.toBeNull();
    expect(state.activeQuiz).toBeNull();
    expect(state.quizResult).not.toBeNull();
  });
});
