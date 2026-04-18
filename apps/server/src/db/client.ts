import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Database from 'better-sqlite3';

import { getConfig } from '../config.js';

type DatabaseInstance = InstanceType<typeof Database>;

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = resolve(__dirname, 'schema.sql');

let db: DatabaseInstance | null = null;

export const getDb = (): DatabaseInstance => {
  if (db) {
    return db;
  }
  const { databasePath } = getConfig();
  mkdirSync(dirname(databasePath), { recursive: true });
  db = new Database(databasePath);
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  runMigrations(db);
  return db;
};

export const closeDb = (): void => {
  if (!db) {
    return;
  }
  db.close();
  db = null;
};

const runMigrations = (database: DatabaseInstance): void => {
  try {
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    database.exec(schema);
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`failed to apply schema: ${err.message}`);
    }
    throw err;
  }
};
