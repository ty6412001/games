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

const startBasicGame = async () => {
  const useGameStore = await importStore();
  await useGameStore.getState().startGame({
    duration: 20,
    week: 1,
    players: [
      { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
      { name: '小朋友', heroId: 'decker', badge: 1, isChild: true },
    ],
  });
  const game = useGameStore.getState().game!;
  const child = game.players.find((p) => p.isChild)!;
  const adult = game.players.find((p) => !p.isChild)!;
  return { useGameStore, child, adult, game };
};

const primeQuiz = (
  useGameStore: Awaited<ReturnType<typeof importStore>>,
  playerId: string,
  contextKind: 'study' | 'monster' | 'boss-attack',
) => {
  const question = useGameStore.getState().currentPack!.questions[0]!;
  useGameStore.setState({
    activeQuiz: {
      question,
      context: { kind: contextKind } as never,
      playerId,
      usedHelp: false,
      startedAt: Date.now(),
      deadlineAt: Date.now() + 60_000,
    },
    pendingQuiz: null,
  });
};

describe('decker progression via submitAnswer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('adds +10 energy when child answers a study question correctly', async () => {
    const { useGameStore, child } = await startBasicGame();
    primeQuiz(useGameStore, child.id, 'study');
    await useGameStore.getState().submitAnswer('2');
    expect(useGameStore.getState().deckerState.energy).toBe(10);
    expect(useGameStore.getState().deckerState.currentForm).toBe('flash');
  });

  it('adds +20 energy on monster defeat', async () => {
    const { useGameStore, child } = await startBasicGame();
    primeQuiz(useGameStore, child.id, 'monster');
    await useGameStore.getState().submitAnswer('2');
    expect(useGameStore.getState().deckerState.energy).toBe(20);
  });

  it('clamps energy at 0 when child answers wrong', async () => {
    const { useGameStore, child } = await startBasicGame();
    primeQuiz(useGameStore, child.id, 'study');
    await useGameStore.getState().submitAnswer('wrong');
    expect(useGameStore.getState().deckerState.energy).toBe(0);
  });

  it('does not change deckerState when adult answers', async () => {
    const { useGameStore, adult } = await startBasicGame();
    primeQuiz(useGameStore, adult.id, 'study');
    await useGameStore.getState().submitAnswer('2');
    expect(useGameStore.getState().deckerState.energy).toBe(0);
    expect(useGameStore.getState().deckerState.currentForm).toBe('flash');
  });

  it('advances to miracle form when energy crosses 30 and stamps lastTransitionAt', async () => {
    const { useGameStore, child } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'flash',
        energy: 20,
        finisherEnergy: 0,
        finisherUsedThisBoss: false,
        lastTransitionAt: null,
      },
    });
    primeQuiz(useGameStore, child.id, 'monster');
    await useGameStore.getState().submitAnswer('2');
    const next = useGameStore.getState().deckerState;
    expect(next.energy).toBe(40);
    expect(next.currentForm).toBe('miracle');
    expect(next.lastTransitionAt).not.toBeNull();
  });

  it('miracle form roll uses 7-sided dice', async () => {
    const { useGameStore } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'miracle',
        energy: 30,
        finisherEnergy: 0,
        finisherUsedThisBoss: false,
        lastTransitionAt: null,
      },
    });
    // Force random to max → expect 7
    const orig = Math.random;
    Math.random = () => 0.9999;
    await useGameStore.getState().rollAndMove();
    Math.random = orig;
    expect(useGameStore.getState().lastDice).toBe(7);
  });

  it('strong form multiplies property-bonus ×1.5 for child', async () => {
    const { useGameStore, child, game } = await startBasicGame();
    const propertyTile = game.tiles.find((t) => t.type === 'property')!;
    useGameStore.setState({
      deckerState: {
        currentForm: 'strong',
        energy: 60,
        finisherEnergy: 0,
        finisherUsedThisBoss: false,
        lastTransitionAt: null,
      },
      game: {
        ...game,
        currentTurn: game.players.findIndex((p) => p.id === child.id),
        players: game.players.map((p) =>
          p.id === child.id ? { ...p, ownedTiles: [propertyTile.position] } : p,
        ),
      },
      landingEvent: { kind: 'property-owned-self', position: propertyTile.position },
    });
    useGameStore.getState().chooseSelfPropertyQuiz();
    const pending = useGameStore.getState().pendingQuiz!;
    primeQuiz(useGameStore, pending.playerId, 'study');
    useGameStore.setState({
      activeQuiz: {
        ...useGameStore.getState().activeQuiz!,
        context: pending.context,
      },
    });
    const moneyBefore = useGameStore
      .getState()
      .game!.players.find((p) => p.id === child.id)!.money;
    await useGameStore.getState().submitAnswer('2');
    const moneyAfter = useGameStore
      .getState()
      .game!.players.find((p) => p.id === child.id)!.money;
    if (propertyTile.type !== 'property') throw new Error('unreachable');
    const baseBonus = Math.min(80, Math.floor(propertyTile.baseRent * 0.5));
    const expectedBonus = Math.floor(baseBonus * 1.5);
    expect(moneyAfter - moneyBefore).toBe(expectedBonus);
  });
});

describe('fireFinisher guard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('refuses when not in boss phase', async () => {
    const { useGameStore } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'dynamic',
        energy: 100,
        finisherEnergy: 100,
        finisherUsedThisBoss: false,
        lastTransitionAt: null,
      },
    });
    useGameStore.getState().fireFinisher();
    const s = useGameStore.getState();
    expect(s.deckerState.finisherEnergy).toBe(100);
    expect(s.deckerState.finisherUsedThisBoss).toBe(false);
  });

  it('refuses when form below dynamic', async () => {
    const { useGameStore, game } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'strong',
        energy: 60,
        finisherEnergy: 100,
        finisherUsedThisBoss: false,
        lastTransitionAt: null,
      },
      game: {
        ...game,
        phase: 'boss',
        bossBattle: {
          bossId: 'zetton',
          bossName: '杰顿',
          maxHp: 1000,
          currentHp: 1000,
          currentAttackerId: game.players[0]!.id,
          contributions: {},
          status: 'in-progress',
        },
      },
    });
    useGameStore.getState().fireFinisher();
    expect(useGameStore.getState().game!.bossBattle!.currentHp).toBe(1000);
  });

  it('halves HP and flips used flag when valid, and refuses reuse', async () => {
    const { useGameStore, game } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'dynamic',
        energy: 100,
        finisherEnergy: 100,
        finisherUsedThisBoss: false,
        lastTransitionAt: null,
      },
      game: {
        ...game,
        phase: 'boss',
        bossBattle: {
          bossId: 'zetton',
          bossName: '杰顿',
          maxHp: 2000,
          currentHp: 2000,
          currentAttackerId: game.players[0]!.id,
          contributions: {},
          status: 'in-progress',
        },
      },
    });
    useGameStore.getState().fireFinisher();
    let s = useGameStore.getState();
    expect(s.game!.bossBattle!.currentHp).toBe(1000);
    expect(s.deckerState.finisherEnergy).toBe(0);
    expect(s.deckerState.finisherUsedThisBoss).toBe(true);

    // charge back to 100 and ensure second call is refused
    useGameStore.setState({
      deckerState: { ...s.deckerState, finisherEnergy: 100 },
    });
    useGameStore.getState().fireFinisher();
    s = useGameStore.getState();
    expect(s.game!.bossBattle!.currentHp).toBe(1000);
    expect(s.deckerState.finisherEnergy).toBe(100);
  });

  it('enterBossBattle resets finisherUsedThisBoss', async () => {
    const { useGameStore, game } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'dynamic',
        energy: 100,
        finisherEnergy: 0,
        finisherUsedThisBoss: true,
        lastTransitionAt: null,
      },
      game: { ...game, phase: 'settle' },
      combatSummary: {},
    });
    useGameStore.getState().enterBossBattle();
    expect(useGameStore.getState().deckerState.finisherUsedThisBoss).toBe(false);
  });
});

describe('clearTransitionMark', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('clears lastTransitionAt', async () => {
    const { useGameStore } = await startBasicGame();
    useGameStore.setState({
      deckerState: {
        currentForm: 'miracle',
        energy: 30,
        finisherEnergy: 0,
        finisherUsedThisBoss: false,
        lastTransitionAt: 123,
      },
    });
    useGameStore.getState().clearTransitionMark();
    expect(useGameStore.getState().deckerState.lastTransitionAt).toBeNull();
  });
});
