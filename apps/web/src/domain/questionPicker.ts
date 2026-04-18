import type { Question, QuestionPack, Subject } from '@ultraman/shared';

type Rand = () => number;

export const pickRandomQuestion = (
  pack: QuestionPack,
  options: {
    excludeIds?: Iterable<string>;
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
  const idx = Math.floor(rand() * pool.length);
  return pool[idx] ?? null;
};

export const findQuestion = (pack: QuestionPack, id: string): Question | null => {
  return pack.questions.find((q) => q.id === id) ?? null;
};

export const isAnswerCorrect = (question: Question, submitted: string): boolean => {
  return submitted.trim() === question.answer.trim();
};

export const countdownSeconds = (question: Question): number => {
  const base = question.difficulty === 1 ? 20 : question.difficulty === 2 ? 35 : 50;
  if (question.type === 'input' || question.type === 'ordering') {
    return base === 20 ? 30 : base === 35 ? 50 : 70;
  }
  return base;
};

export const rewardFor = (question: Question): { correct: number; wrong: number } => {
  if (question.reward) return question.reward;
  const base = question.difficulty === 1 ? 80 : question.difficulty === 2 ? 120 : 180;
  return { correct: base, wrong: -Math.floor(base / 2) };
};
