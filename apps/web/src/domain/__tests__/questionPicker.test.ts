import type { QuestionPack } from '@ultraman/shared';
import { describe, expect, it } from 'vitest';

import {
  countdownSeconds,
  findQuestion,
  isAnswerCorrect,
  pickRandomQuestion,
  rewardFor,
} from '../questionPicker.js';

const pack: QuestionPack = {
  week: 1,
  title: 'W1',
  boss: { id: 'zetton', name: '杰顿', hp: 3000 },
  questions: [
    {
      id: 'm1',
      subject: 'math',
      difficulty: 1,
      topic: '加法',
      stem: '1+1',
      type: 'choice',
      options: ['1', '2'],
      answer: '2',
    },
    {
      id: 'c1',
      subject: 'chinese',
      difficulty: 2,
      topic: '声母',
      stem: 'x',
      type: 'input',
      answer: 'b',
    },
    {
      id: 'e1',
      subject: 'english',
      difficulty: 3,
      topic: '词汇',
      stem: 'x',
      type: 'input',
      answer: 'hello',
    },
  ],
};

describe('pickRandomQuestion', () => {
  it('returns a question from the pool', () => {
    const result = pickRandomQuestion(pack, { rand: () => 0 });
    expect(result?.id).toBe('m1');
  });

  it('respects excludeIds', () => {
    const result = pickRandomQuestion(pack, {
      excludeIds: ['m1', 'c1'],
      rand: () => 0,
    });
    expect(result?.id).toBe('e1');
  });

  it('respects subject filter', () => {
    const result = pickRandomQuestion(pack, { subject: 'chinese' });
    expect(result?.subject).toBe('chinese');
  });

  it('returns null when pool empty', () => {
    const result = pickRandomQuestion(pack, { excludeIds: ['m1', 'c1', 'e1'] });
    expect(result).toBeNull();
  });

  it('returns null when a subject pool is fully excluded', () => {
    const result = pickRandomQuestion(pack, { subject: 'math', excludeIds: ['m1'] });
    expect(result).toBeNull();
  });

  it('prefers a different topic when another candidate exists', () => {
    const result = pickRandomQuestion(
      {
        ...pack,
        questions: [
          pack.questions[0]!,
          {
            id: 'm2',
            subject: 'math',
            difficulty: 2,
            topic: '乘法',
            stem: '2x2',
            type: 'choice',
            options: ['2', '4'],
            answer: '4',
          },
        ],
      },
      {
        recentQuestions: [
          { questionId: 'prev', topic: '加法', type: 'choice', difficulty: 1 },
        ],
        rand: () => 0,
      },
    );

    expect(result?.id).toBe('m2');
  });

  it('falls back to the same topic when no other topic exists', () => {
    const result = pickRandomQuestion(
      {
        ...pack,
        questions: [
          {
            id: 'm3',
            subject: 'math',
            difficulty: 2,
            topic: '加法',
            stem: '2+2',
            type: 'choice',
            options: ['3', '4'],
            answer: '4',
          },
        ],
      },
      {
        recentQuestions: [
          { questionId: 'prev', topic: '加法', type: 'choice', difficulty: 1 },
        ],
        rand: () => 0,
      },
    );

    expect(result?.id).toBe('m3');
  });

  it('prefers a different type after topic is already varied', () => {
    const result = pickRandomQuestion(
      {
        ...pack,
        questions: [
          {
            id: 'm4',
            subject: 'math',
            difficulty: 2,
            topic: '乘法',
            stem: '2x3',
            type: 'choice',
            options: ['5', '6'],
            answer: '6',
          },
          {
            id: 'm5',
            subject: 'math',
            difficulty: 2,
            topic: '除法',
            stem: '6/2',
            type: 'input',
            answer: '3',
          },
        ],
      },
      {
        recentQuestions: [
          { questionId: 'prev', topic: '加法', type: 'choice', difficulty: 1 },
        ],
        rand: () => 0,
      },
    );

    expect(result?.id).toBe('m5');
  });

  it('prefers a different difficulty when topic and type can both vary', () => {
    const result = pickRandomQuestion(
      {
        ...pack,
        questions: [
          {
            id: 'm6',
            subject: 'math',
            difficulty: 1,
            topic: '乘法',
            stem: '2x1',
            type: 'input',
            answer: '2',
          },
          {
            id: 'm7',
            subject: 'math',
            difficulty: 3,
            topic: '除法',
            stem: '6/2',
            type: 'input',
            answer: '3',
          },
          {
            id: 'm8',
            subject: 'math',
            difficulty: 3,
            topic: '几何',
            stem: '2+2',
            type: 'choice',
            options: ['3', '4'],
            answer: '4',
          },
        ],
      },
      {
        recentQuestions: [
          { questionId: 'prev', topic: '加法', type: 'choice', difficulty: 1 },
        ],
        rand: () => 0,
      },
    );

    expect(result?.id).toBe('m7');
  });
});

describe('findQuestion', () => {
  it('returns matching question', () => {
    expect(findQuestion(pack, 'c1')?.subject).toBe('chinese');
  });

  it('returns null for unknown id', () => {
    expect(findQuestion(pack, 'x')).toBeNull();
  });
});

describe('isAnswerCorrect', () => {
  it('trims whitespace on both sides', () => {
    expect(isAnswerCorrect(pack.questions[0]!, '  2  ')).toBe(true);
    expect(isAnswerCorrect(pack.questions[0]!, '3')).toBe(false);
  });
});

describe('countdownSeconds', () => {
  it('returns longer time for input type', () => {
    expect(countdownSeconds(pack.questions[1]!)).toBe(50); // input + difficulty 2
  });

  it('returns base time for choice questions', () => {
    expect(countdownSeconds(pack.questions[0]!)).toBe(20);
  });

  it('scales with difficulty', () => {
    expect(countdownSeconds(pack.questions[2]!)).toBe(70); // input + difficulty 3
  });
});

describe('rewardFor', () => {
  it('scales base reward by difficulty', () => {
    expect(rewardFor(pack.questions[0]!).correct).toBe(80);
    expect(rewardFor(pack.questions[1]!).correct).toBe(120);
    expect(rewardFor(pack.questions[2]!).correct).toBe(180);
  });
});
