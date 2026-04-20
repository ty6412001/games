import Dexie, { type Table } from 'dexie';
import type { Subject, WrongBookEntry } from '@ultraman/shared';

export type CorrectBookEntry = {
  id: string;
  childId: string;
  questionId: string;
  subject: Subject;
  week: number;
  firstCorrectAt: number;
  lastCorrectAt: number;
};

export class UltramanDb extends Dexie {
  wrongBook!: Table<WrongBookEntry, string>;
  settings!: Table<{ key: string; value: string }, string>;
  correctBook!: Table<CorrectBookEntry, string>;

  constructor() {
    super('ultraman-monopoly');
    this.version(1).stores({
      wrongBook: 'id, childId, questionId, subject, week, isMastered, lastWrongAt',
      settings: 'key',
    });
    this.version(2).stores({
      wrongBook: 'id, childId, questionId, subject, week, isMastered, lastWrongAt',
      settings: 'key',
      correctBook: 'id, childId, questionId, subject, week, lastCorrectAt',
    });
  }
}

let instance: UltramanDb | null = null;

export const getDb = (): UltramanDb => {
  if (!instance) {
    instance = new UltramanDb();
  }
  return instance;
};
