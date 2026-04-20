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

CREATE TABLE IF NOT EXISTS knowledge_question_item (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  semester TEXT NOT NULL,
  difficulty INTEGER NOT NULL,
  topic TEXT NOT NULL,
  stem TEXT NOT NULL,
  type TEXT NOT NULL,
  optionsJson TEXT,
  itemsJson TEXT,
  correctOrderJson TEXT,
  answer TEXT NOT NULL,
  knowledgePointsJson TEXT NOT NULL,
  gameModesJson TEXT NOT NULL,
  explanation TEXT,
  status TEXT NOT NULL,
  metadataJson TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_question_lookup
  ON knowledge_question_item(subject, grade, semester, status, updatedAt DESC);

CREATE TABLE IF NOT EXISTS knowledge_answer_log (
  id TEXT PRIMARY KEY,
  learnerId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  semester TEXT NOT NULL,
  gameMode TEXT NOT NULL,
  outcome TEXT NOT NULL,
  questionStem TEXT NOT NULL,
  submittedAnswer TEXT NOT NULL,
  correctAnswer TEXT NOT NULL,
  durationMs INTEGER,
  sourceSessionId TEXT,
  answeredAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_answer_log_lookup
  ON knowledge_answer_log(learnerId, answeredAt DESC);

CREATE TABLE IF NOT EXISTS knowledge_mastery_record (
  id TEXT PRIMARY KEY,
  learnerId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  semester TEXT NOT NULL,
  gameModesJson TEXT NOT NULL,
  masteryScore INTEGER NOT NULL,
  totalAttempts INTEGER NOT NULL,
  correctAttempts INTEGER NOT NULL,
  wrongAttempts INTEGER NOT NULL,
  lastAnsweredAt INTEGER,
  masteredAt INTEGER,
  updatedAt INTEGER NOT NULL,
  UNIQUE(learnerId, questionId)
);

CREATE INDEX IF NOT EXISTS idx_knowledge_mastery_lookup
  ON knowledge_mastery_record(learnerId, masteryScore DESC, updatedAt DESC);

CREATE TABLE IF NOT EXISTS learning_reward_event (
  id TEXT PRIMARY KEY,
  learnerId TEXT NOT NULL,
  questionId TEXT,
  gameMode TEXT NOT NULL,
  eventType TEXT NOT NULL,
  amount INTEGER NOT NULL,
  payloadJson TEXT NOT NULL,
  createdAt INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_learning_reward_event_lookup
  ON learning_reward_event(learnerId, createdAt DESC);

CREATE TABLE IF NOT EXISTS auth_attempts (
  ip TEXT PRIMARY KEY,
  failedCount INTEGER NOT NULL DEFAULT 0,
  lockedUntil INTEGER
);
