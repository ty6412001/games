import type { Question, QuestionPack, Subject } from '@ultraman/shared';

type Rand = () => number;

export type RecentQuestionMeta = {
  questionId: string;
  topic: string;
  type: Question['type'];
  difficulty: Question['difficulty'];
};

const preferDifferent = <T>(
  pool: readonly T[],
  predicate: (item: T) => boolean,
): readonly T[] => {
  const preferred = pool.filter(predicate);
  return preferred.length > 0 ? preferred : pool;
};

export const pickRandomQuestion = (
  pack: QuestionPack,
  options: {
    excludeIds?: Iterable<string>;
    recentQuestions?: readonly RecentQuestionMeta[];
    subject?: Subject;
    rand?: Rand;
  } = {},
): Question | null => {
  const rand = options.rand ?? Math.random;
  const excludeSet = new Set(options.excludeIds ?? []);
  const pool = pack.questions.filter((q) => {
    if (excludeSet.has(q.id)) return false;
    if (options.subject && q.subject !== options.subject) return false;
    return true;
  });
  if (pool.length === 0) return null;

  const recent = options.recentQuestions?.[options.recentQuestions.length - 1];
  const variedPool = recent
    ? preferDifferent(pool, (q) => q.topic !== recent.topic)
    : pool;
  const typeVariedPool = recent
    ? preferDifferent(variedPool, (q) => q.type !== recent.type)
    : variedPool;
  const difficultyVariedPool = recent
    ? preferDifferent(typeVariedPool, (q) => q.difficulty !== recent.difficulty)
    : typeVariedPool;

  const idx = Math.floor(rand() * difficultyVariedPool.length);
  return difficultyVariedPool[idx] ?? null;
};

export const findQuestion = (pack: QuestionPack, id: string): Question | null => {
  return pack.questions.find((q) => q.id === id) ?? null;
};

export const isAnswerCorrect = (question: Question, submitted: string): boolean => {
  if (question.subject === 'english') {
    return submitted.trim().toLowerCase() === question.answer.trim().toLowerCase();
  }
  return submitted.trim() === question.answer.trim();
};

export const countdownSeconds = (question: Question): number => {
  const base = question.difficulty === 1 ? 20 : question.difficulty === 2 ? 35 : 50;
  if (question.type === 'input' || question.type === 'ordering') {
    return base === 20 ? 30 : base === 35 ? 50 : 70;
  }
  if (question.type === 'true-false') {
    return base === 20 ? 15 : base === 35 ? 25 : 35;
  }
  return base;
};

export const rewardFor = (question: Question): { correct: number; wrong: number } => {
  if (question.reward) return question.reward;
  const base = question.difficulty === 1 ? 80 : question.difficulty === 2 ? 120 : 180;
  return { correct: base, wrong: -Math.floor(base / 2) };
};
