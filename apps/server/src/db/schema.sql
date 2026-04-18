CREATE TABLE IF NOT EXISTS child (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wrong_book (
  id TEXT PRIMARY KEY,
  childId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  subject TEXT NOT NULL,
  week INTEGER NOT NULL,
  stem TEXT NOT NULL,
  wrongAnswer TEXT NOT NULL,
  correctAnswer TEXT NOT NULL,
  firstWrongAt INTEGER NOT NULL,
  lastWrongAt INTEGER NOT NULL,
  wrongCount INTEGER NOT NULL DEFAULT 1,
  isMastered INTEGER NOT NULL DEFAULT 0,
  masteredAt INTEGER,
  UNIQUE(childId, questionId)
);

CREATE INDEX IF NOT EXISTS idx_wrong_book_child_mastered
  ON wrong_book(childId, isMastered);
CREATE INDEX IF NOT EXISTS idx_wrong_book_last_wrong
  ON wrong_book(childId, lastWrongAt);

CREATE TABLE IF NOT EXISTS weapon_collection (
  childId TEXT NOT NULL,
  weaponId TEXT NOT NULL,
  heroId TEXT NOT NULL,
  unlockedAt INTEGER NOT NULL,
  PRIMARY KEY (childId, weaponId)
);

CREATE TABLE IF NOT EXISTS boss_log (
  id TEXT PRIMARY KEY,
  childId TEXT NOT NULL,
  week INTEGER NOT NULL,
  bossId TEXT NOT NULL,
  defeated INTEGER NOT NULL,
  totalCombatPower INTEGER NOT NULL,
  topContributor TEXT,
  playedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boss_log_child
  ON boss_log(childId, playedAt);

CREATE TABLE IF NOT EXISTS custom_question (
  id TEXT PRIMARY KEY,
  week INTEGER NOT NULL,
  subject TEXT NOT NULL,
  stem TEXT NOT NULL,
  options TEXT,
  answer TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_attempts (
  ip TEXT PRIMARY KEY,
  failedCount INTEGER NOT NULL DEFAULT 0,
  lockedUntil INTEGER
);
