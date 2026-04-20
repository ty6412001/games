import { describe, expect, it } from 'vitest';

import pack from '../../../public/question-packs/brain-pack.json';

type Q = {
  id: string;
  subject: string;
  difficulty: 1 | 2 | 3;
  topic: string;
  type: string;
  stem: string;
  options?: string[];
  answer: string;
};

const questions = pack.questions as Q[];
const choiceQuestions = questions.filter((q) => q.type === 'choice');
const expectedTopics = [
  '脑筋急转弯',
  '十万个为什么',
  '历史知识',
  '生活常识',
  '百科扩展',
];

describe('brain pack', () => {
  it('contains 100 brain questions with the expected title', () => {
    expect(questions).toHaveLength(100);
    expect(pack.title).toBe('通用题库');
    expect(new Set(questions.map((q) => q.subject))).toEqual(new Set(['brain']));
  });

  it('uses only choice and input questions', () => {
    expect(new Set(questions.map((q) => q.type))).toEqual(new Set(['choice', 'input']));
    expect(questions.filter((q) => q.type === 'input')).toHaveLength(10);
  });

  it('keeps the intended difficulty and per-topic balance', () => {
    expect(
      questions.reduce<Record<number, number>>((acc, q) => {
        acc[q.difficulty as 1 | 2 | 3] = (acc[q.difficulty as 1 | 2 | 3] ?? 0) + 1;
        return acc;
      }, {}),
    ).toEqual({ 1: 45, 2: 35, 3: 20 });

    expect(
      questions.reduce<Record<string, { choice: number; input: number }>>((acc, q) => {
        acc[q.topic] ??= { choice: 0, input: 0 };
        const bucket = acc[q.topic];
        if (!bucket) {
          throw new Error(`Missing bucket for topic ${q.topic}`);
        }
        bucket[q.type as 'choice' | 'input'] += 1;
        return acc;
      }, {}),
    ).toEqual({
      脑筋急转弯: { choice: 18, input: 2 },
      十万个为什么: { choice: 18, input: 2 },
      历史知识: { choice: 18, input: 2 },
      生活常识: { choice: 18, input: 2 },
      百科扩展: { choice: 18, input: 2 },
    });
  });

  it('covers the expected five topics and avoids numeric topics', () => {
    expect(new Set(questions.map((q) => q.topic))).toEqual(new Set(expectedTopics));
    questions.forEach((q) => {
      expect(q.topic).not.toContain('数字');
    });
  });

  it('keeps numeric brain-teaser stems out of the pack', () => {
    questions.forEach((q) => {
      expect(q.stem).not.toMatch(/[0-9]/);
    });
  });

  it('keeps question stems unique', () => {
    const stems = questions.map((q) => q.stem);
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('keeps choice answers in options and options free of duplicates', () => {
    choiceQuestions.forEach((q) => {
      expect(q.options).toContain(q.answer);
      expect(new Set(q.options).size).toBe(q.options?.length ?? 0);
    });
  });

  it('keeps every choice options set unique across the pack', () => {
    const optionSets = choiceQuestions.map((q) => q.options?.join('|') ?? '');
    expect(new Set(optionSets).size).toBe(optionSets.length);
  });
});
