import Dexie, { type Table } from 'dexie';
import type { WrongBookEntry } from '@ultraman/shared';

export class UltramanDb extends Dexie {
  wrongBook!: Table<WrongBookEntry, string>;
  settings!: Table<{ key: string; value: string }, string>;

  constructor() {
    super('ultraman-monopoly');
    this.version(1).stores({
      wrongBook: 'id, childId, questionId, subject, week, isMastered, lastWrongAt',
      settings: 'key',
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
