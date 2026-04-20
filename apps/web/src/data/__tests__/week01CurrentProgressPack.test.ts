import { describe, expect, it } from 'vitest';

import pack from '../../../public/question-packs/week-01.json';

type Q = {
  subject: string;
  topic: string;
  type: string;
  stem: string;
  options?: string[];
  answer: string;
};

const questions = pack.questions as Q[];
const mathQuestions = questions.filter((q) => q.subject === 'math');
const chineseQuestions = questions.filter((q) => q.subject === 'chinese');
const englishQuestions = questions.filter((q) => q.subject === 'english');
const objectiveQuestions = questions.filter((q) => q.type === 'choice' || q.type === 'image-choice');

describe('week-01 当前教材进度包', () => {
  it('contains 95 questions with 40/40/15 subject split', () => {
    expect(questions).toHaveLength(95);
    expect(mathQuestions).toHaveLength(40);
    expect(chineseQuestions).toHaveLength(40);
    expect(englishQuestions).toHaveLength(15);
  });

  it('keeps the pack title aligned with the current progress theme', () => {
    expect(pack.title).toContain('当前教材进度包');
    expect(pack.title).toContain('语文至练习4');
  });

  it('uses only math/chinese/english subjects', () => {
    expect(new Set(questions.map((q) => q.subject))).toEqual(
      new Set(['math', 'chinese', 'english']),
    );
  });

  it('contains no brain questions', () => {
    expect(questions.some((q) => q.subject === 'brain')).toBe(false);
  });

  it('keeps question stems unique', () => {
    const stems = questions.map((q) => q.stem);
    expect(new Set(stems).size).toBe(stems.length);
  });

  it('ensures every objective question answer appears in options', () => {
    objectiveQuestions.forEach((q) => expect(q.options).toContain(q.answer));
  });

  it('keeps every objective options list free of duplicates', () => {
    objectiveQuestions.forEach((q) => {
      expect(new Set(q.options).size).toBe(q.options?.length ?? 0);
    });
  });
});
