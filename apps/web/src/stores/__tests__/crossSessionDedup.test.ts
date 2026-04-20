import { beforeEach, describe, expect, it, vi } from 'vitest';

const hydratedCorrect = {
  math: new Set<string>(['m1']),
  chinese: new Set<string>(),
  english: new Set<string>(),
  brain: new Set<string>(),
};

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
      {
        id: 'm2',
        subject: 'math',
        difficulty: 1,
        topic: '减',
        type: 'choice',
        stem: '2-1',
        options: ['0', '1'],
        answer: '1',
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
  listCorrectIdsByChild: vi.fn(async () => hydratedCorrect),
  clearCorrectForChild: vi.fn(async () => undefined),
}));

const importStore = async () => {
  const mod = await import('../gameStore.js');
  return mod.useGameStore;
};

describe('cross-session correct-answer dedup', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('startGame hydrates correctQuestionIds from IndexedDB so previously-correct questions are excluded', async () => {
    const useGameStore = await importStore();
    await useGameStore.getState().startGame({
      duration: 20,
      week: 1,
      players: [
        { name: '爸爸', heroId: 'zero', badge: 1, isChild: false },
        { name: '小明', heroId: 'tiga', badge: 1, isChild: true },
      ],
    });
    const state = useGameStore.getState();
    expect(state.correctQuestionIds.math.has('m1')).toBe(true);
    expect(state.correctQuestionIds.math.has('m2')).toBe(false);

    const availableMath = state.currentPack!.questions.filter(
      (q) => q.subject === 'math' && !state.correctQuestionIds.math.has(q.id),
    );
    expect(availableMath.map((q) => q.id)).toEqual(['m2']);
  });
});
