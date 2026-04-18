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
