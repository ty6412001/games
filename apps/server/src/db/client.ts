import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';

import { getConfig } from '../config.js';

type DatabaseInstance = InstanceType<typeof Database>;

let db: DatabaseInstance | null = null;

export const getDb = (): DatabaseInstance => {
  if (db) {
    return db;
  }
  const { databasePath } = getConfig();
  mkdirSync(dirname(databasePath), { recursive: true });
  db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  return db;
};

export const closeDb = (): void => {
  if (!db) {
    return;
  }
  db.close();
  db = null;
};
