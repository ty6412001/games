import type { Question, Subject } from '@ultraman/shared';

import { getDb, type CorrectBookEntry } from './wrongBookDb';

export type CorrectBySubject = Record<Subject, Set<string>>;

const emptyCorrect = (): CorrectBySubject => ({
  math: new Set(),
  chinese: new Set(),
  english: new Set(),
  brain: new Set(),
});

const makeEntryId = (childId: string, questionId: string): string =>
  `${childId}::${questionId}`;

type RecordArgs = {
  childId: string;
  question: Question;
  week: number;
};

export const recordCorrect = async ({
  childId,
  question,
  week,
}: RecordArgs): Promise<CorrectBookEntry> => {
  const db = getDb();
  const id = makeEntryId(childId, question.id);
  const now = Date.now();
  const existing = await db.correctBook.get(id);
  const prepared: CorrectBookEntry = existing
    ? { ...existing, lastCorrectAt: now }
    : {
        id,
        childId,
        questionId: question.id,
        subject: question.subject,
        week,
        firstCorrectAt: now,
        lastCorrectAt: now,
      };
  await db.correctBook.put(prepared);
  return prepared;
};

export const listCorrectIdsByChild = async (
  childId: string,
): Promise<CorrectBySubject> => {
  const db = getDb();
  const rows = await db.correctBook.where({ childId }).toArray();
  const result = emptyCorrect();
  for (const row of rows) {
    const bucket = result[row.subject];
    if (bucket) bucket.add(row.questionId);
  }
  return result;
};

export const clearCorrectForChild = async (childId: string): Promise<void> => {
  const db = getDb();
  const rows = await db.correctBook.where({ childId }).toArray();
  await db.correctBook.bulkDelete(rows.map((r) => r.id));
};
