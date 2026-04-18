import type { Question, WrongBookEntry } from '@ultraman/shared';

import { upsertWrongBook, masterWrongBook } from '../cloud/apiClient';
import { getDb } from './wrongBookDb';

const makeEntryId = (childId: string, questionId: string): string => `${childId}::${questionId}`;

type RecordArgs = {
  childId: string;
  question: Question;
  wrongAnswer: string;
  week: number;
};

const scheduleCloudSync = (entry: WrongBookEntry): void => {
  void upsertWrongBook(entry).catch((err) => {
    console.warn('cloud sync (wrong-book upsert) failed', err);
  });
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

  const prepared: WrongBookEntry = existing
    ? {
        ...existing,
        wrongAnswer,
        lastWrongAt: now,
        wrongCount: existing.wrongCount + 1,
        isMastered: false,
      }
    : {
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

  if (existing?.masteredAt !== undefined) {
    const { masteredAt: _unused, ...rest } = prepared;
    void _unused;
    await db.wrongBook.put(rest as WrongBookEntry);
    scheduleCloudSync(rest as WrongBookEntry);
    return rest as WrongBookEntry;
  }

  await db.wrongBook.put(prepared);
  scheduleCloudSync(prepared);
  return prepared;
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
  const updated: WrongBookEntry = { ...entry, isMastered: true, masteredAt: Date.now() };
  await db.wrongBook.put(updated);
  void masterWrongBook(id).catch((err) => {
    console.warn('cloud sync (master) failed', err);
  });
};
