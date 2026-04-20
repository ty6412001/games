import { QuestionPackIndexSchema, QuestionPackSchema, type QuestionPack } from '@ultraman/shared';

const cache = new Map<number, QuestionPack>();
let brainPackCache: QuestionPack | null = null;

export const loadPackIndex = async (): Promise<{ week: number; title: string; path: string }[]> => {
  const res = await fetch('/question-packs/index.json');
  if (!res.ok) {
    throw new Error(`failed to load pack index: ${res.status}`);
  }
  const raw = await res.json();
  const parsed = QuestionPackIndexSchema.parse(raw);
  return [...parsed.packs];
};

export const loadQuestionPack = async (week: number): Promise<QuestionPack> => {
  const cached = cache.get(week);
  if (cached) return cached;
  const padded = String(week).padStart(2, '0');
  const res = await fetch(`/question-packs/week-${padded}.json`);
  if (!res.ok) {
    throw new Error(`failed to load question pack week ${week}: ${res.status}`);
  }
  const raw = await res.json();
  const pack = QuestionPackSchema.parse(raw);
  cache.set(week, pack);
  return pack;
};

export const loadBrainPack = async (): Promise<QuestionPack> => {
  if (brainPackCache) return brainPackCache;
  const res = await fetch('/question-packs/brain-pack.json');
  if (!res.ok) {
    throw new Error(`failed to load brain pack: ${res.status}`);
  }
  const raw = await res.json();
  const pack = QuestionPackSchema.parse(raw);
  brainPackCache = pack;
  return pack;
};
