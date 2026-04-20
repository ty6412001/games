import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Question } from '@ultraman/shared';

import {
  clearCorrectForChild,
  listCorrectIdsByChild,
  recordCorrect,
} from '../correctBookRepo';
import { getDb } from '../wrongBookDb';

const buildQuestion = (overrides: Partial<Question> = {}): Question =>
  ({
    id: 'q1',
    subject: 'math',
    difficulty: 1,
    topic: 't',
    type: 'choice',
    stem: '1+1',
    options: ['2', '3'],
    answer: '2',
    ...overrides,
  }) as Question;

describe('correctBookRepo', () => {
  beforeEach(async () => {
    const db = getDb();
    await db.correctBook.clear();
  });

  afterEach(async () => {
    const db = getDb();
    await db.correctBook.clear();
  });

  it('records a correct answer and lists it back grouped by subject', async () => {
    await recordCorrect({
      childId: 'child-default',
      question: buildQuestion({ id: 'm1', subject: 'math' }),
      week: 1,
    });
    await recordCorrect({
      childId: 'child-default',
      question: buildQuestion({ id: 'c1', subject: 'chinese' }),
      week: 1,
    });
    const grouped = await listCorrectIdsByChild('child-default');
    expect(grouped.math.has('m1')).toBe(true);
    expect(grouped.chinese.has('c1')).toBe(true);
    expect(grouped.english.size).toBe(0);
    expect(grouped.brain.size).toBe(0);
  });

  it('is idempotent when the same question is recorded twice', async () => {
    await recordCorrect({
      childId: 'child-default',
      question: buildQuestion({ id: 'm1' }),
      week: 1,
    });
    await recordCorrect({
      childId: 'child-default',
      question: buildQuestion({ id: 'm1' }),
      week: 1,
    });
    const grouped = await listCorrectIdsByChild('child-default');
    expect(grouped.math.size).toBe(1);
  });

  it('filters by childId', async () => {
    await recordCorrect({
      childId: 'child-default',
      question: buildQuestion({ id: 'm1' }),
      week: 1,
    });
    await recordCorrect({
      childId: 'other-child',
      question: buildQuestion({ id: 'm2' }),
      week: 1,
    });
    const defaultKid = await listCorrectIdsByChild('child-default');
    const otherKid = await listCorrectIdsByChild('other-child');
    expect(defaultKid.math.has('m1')).toBe(true);
    expect(defaultKid.math.has('m2')).toBe(false);
    expect(otherKid.math.has('m2')).toBe(true);
  });

  it('clearCorrectForChild removes all records for that child', async () => {
    await recordCorrect({
      childId: 'child-default',
      question: buildQuestion({ id: 'm1' }),
      week: 1,
    });
    await clearCorrectForChild('child-default');
    const grouped = await listCorrectIdsByChild('child-default');
    expect(grouped.math.size).toBe(0);
  });
});
