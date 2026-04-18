import type { Question, WrongBookEntry } from '@ultraman/shared';

import { getDb } from './wrongBookDb';

const makeEntryId = (childId: string, questionId: string): string => `${childId}::${questionId}`;

type RecordArgs = {
  childId: string;
  question: Question;
  wrongAnswer: string;
  week: number;
};

export const recordWrong = async ({
  childId,
  question,
  wrongAnswer,
  week,
}: RecordArgs): Promise<WrongBookEntry> => {
  const db = getDb();
  const id = makeEntryId(childId, question.id);
  const now = Date.now();
  const existing = await db.wrongBook.get(id);

  if (existing) {
    const updated: WrongBookEntry = {
      ...existing,
      wrongAnswer,
      lastWrongAt: now,
      wrongCount: existing.wrongCount + 1,
      isMastered: false,
    };
    if (existing.masteredAt !== undefined) {
      const { masteredAt: _masteredAt, ...withoutMastered } = updated;
      await db.wrongBook.put(withoutMastered as WrongBookEntry);
      return withoutMastered as WrongBookEntry;
    }
    await db.wrongBook.put(updated);
    return updated;
  }

  const entry: WrongBookEntry = {
    id,
    childId,
    questionId: question.id,
    subject: question.subject,
    week,
    stem: question.stem,
    wrongAnswer,
    correctAnswer: question.answer,
    firstWrongAt: now,
    lastWrongAt: now,
    wrongCount: 1,
    isMastered: false,
  };
  await db.wrongBook.put(entry);
  return entry;
};

export const listActive = async (childId: string): Promise<WrongBookEntry[]> => {
  const db = getDb();
  const all = await db.wrongBook.where({ childId }).toArray();
  return all.filter((e) => !e.isMastered).sort((a, b) => b.wrongCount - a.wrongCount);
};

export const listAll = async (childId: string): Promise<WrongBookEntry[]> => {
  const db = getDb();
  const all = await db.wrongBook.where({ childId }).toArray();
  return all.sort((a, b) => b.lastWrongAt - a.lastWrongAt);
};

export const markMastered = async (id: string): Promise<void> => {
  const db = getDb();
  const entry = await db.wrongBook.get(id);
  if (!entry) return;
  await db.wrongBook.put({ ...entry, isMastered: true, masteredAt: Date.now() });
};
