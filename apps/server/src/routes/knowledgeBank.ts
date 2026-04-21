import { randomUUID } from 'node:crypto';

import {
  KnowledgeAnswerLogCreateSchema,
  KnowledgeExportBundleSchema,
  KnowledgeQuestionCreateSchema,
  KnowledgeQuestionItemSchema,
  KnowledgeQuestionUpdateSchema,
  LearningRewardEventSchema,
  type KnowledgeAnswerLog,
  type KnowledgeExportBundle,
  type KnowledgeMasteryRecord,
  type KnowledgeQuestionItem,
  type KnowledgeWrongBookRecord,
  type LearningRewardEvent,
  WrongBookEntrySchema,
} from '@ultraman/shared';
import { Router, type Router as ExpressRouter } from 'express';

import { getDb } from '../db/client.js';
import { type AuthenticatedRequest, requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

type KnowledgeQuestionRow = {
  id: string;
  subject: string;
  grade: string;
  semester: string;
  difficulty: number;
  topic: string;
  stem: string;
  type: string;
  optionsJson: string | null;
  itemsJson: string | null;
  correctOrderJson: string | null;
  answer: string;
  knowledgePointsJson: string;
  gameModesJson: string;
  explanation: string | null;
  status: string;
  metadataJson: string;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
};

type KnowledgeAnswerLogRow = {
  id: string;
  learnerId: string;
  questionId: string;
  subject: string;
  grade: string;
  semester: string;
  gameMode: string;
  outcome: string;
  questionStem: string;
  submittedAnswer: string;
  correctAnswer: string;
  durationMs: number | null;
  sourceSessionId: string | null;
  answeredAt: number;
};

type KnowledgeMasteryRecordRow = {
  id: string;
  learnerId: string;
  questionId: string;
  subject: string;
  grade: string;
  semester: string;
  gameModesJson: string;
  masteryScore: number;
  totalAttempts: number;
  correctAttempts: number;
  wrongAttempts: number;
  lastAnsweredAt: number | null;
  masteredAt: number | null;
  updatedAt: number;
};

type WrongBookRow = {
  id: string;
  childId: string;
  questionId: string;
  subject: string;
  week: number;
  stem: string;
  wrongAnswer: string;
  correctAnswer: string;
  firstWrongAt: number;
  lastWrongAt: number;
  wrongCount: number;
  isMastered: number;
  masteredAt: number | null;
};

type LearningRewardEventRow = {
  id: string;
  learnerId: string;
  questionId: string | null;
  gameMode: string;
  eventType: string;
  amount: number;
  payloadJson: string;
  createdAt: number;
};

const router: ExpressRouter = Router();
router.use(requireAuth);

const mapQuestionRow = (row: KnowledgeQuestionRow): KnowledgeQuestionItem => {
  const candidate = {
    id: row.id,
    subject: row.subject,
    grade: row.grade,
    semester: row.semester,
    difficulty: row.difficulty,
    topic: row.topic,
    stem: row.stem,
    type: row.type,
    answer: row.answer,
    knowledgePoints: JSON.parse(row.knowledgePointsJson) as string[],
    gameModes: JSON.parse(row.gameModesJson) as string[],
    status: row.status,
    metadata: JSON.parse(row.metadataJson) as Record<string, unknown>,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.explanation ? { explanation: row.explanation } : {}),
    ...(row.optionsJson ? { options: JSON.parse(row.optionsJson) as string[] } : {}),
    ...(row.itemsJson ? { items: JSON.parse(row.itemsJson) as string[] } : {}),
    ...(row.correctOrderJson ? { correctOrder: JSON.parse(row.correctOrderJson) as number[] } : {}),
  };

  return KnowledgeQuestionItemSchema.parse(candidate);
};

const mapAnswerLogRow = (row: KnowledgeAnswerLogRow): KnowledgeAnswerLog => ({
  id: row.id,
  learnerId: row.learnerId,
  questionId: row.questionId,
  subject: row.subject as KnowledgeAnswerLog['subject'],
  grade: row.grade as KnowledgeAnswerLog['grade'],
  semester: row.semester as KnowledgeAnswerLog['semester'],
  gameMode: row.gameMode as KnowledgeAnswerLog['gameMode'],
  outcome: row.outcome as KnowledgeAnswerLog['outcome'],
  questionStem: row.questionStem,
  submittedAnswer: row.submittedAnswer,
  correctAnswer: row.correctAnswer,
  ...(row.durationMs !== null ? { durationMs: row.durationMs } : {}),
  ...(row.sourceSessionId ? { sourceSessionId: row.sourceSessionId } : {}),
  answeredAt: row.answeredAt,
});

const mapMasteryRow = (row: KnowledgeMasteryRecordRow): KnowledgeMasteryRecord => ({
  id: row.id,
  learnerId: row.learnerId,
  questionId: row.questionId,
  subject: row.subject as KnowledgeMasteryRecord['subject'],
  grade: row.grade as KnowledgeMasteryRecord['grade'],
  semester: row.semester as KnowledgeMasteryRecord['semester'],
  gameModes: JSON.parse(row.gameModesJson) as KnowledgeMasteryRecord['gameModes'],
  masteryScore: row.masteryScore,
  totalAttempts: row.totalAttempts,
  correctAttempts: row.correctAttempts,
  wrongAttempts: row.wrongAttempts,
  ...(row.lastAnsweredAt !== null ? { lastAnsweredAt: row.lastAnsweredAt } : {}),
  ...(row.masteredAt !== null ? { masteredAt: row.masteredAt } : {}),
  updatedAt: row.updatedAt,
});

const mapWrongBookRow = (row: WrongBookRow): KnowledgeWrongBookRecord => ({
  id: row.id,
  learnerId: row.childId,
  questionId: row.questionId,
  subject: row.subject as KnowledgeWrongBookRecord['subject'],
  grade: 'grade1',
  semester: 'lower',
  questionStem: row.stem,
  wrongAnswer: row.wrongAnswer,
  correctAnswer: row.correctAnswer,
  firstWrongAt: row.firstWrongAt,
  lastWrongAt: row.lastWrongAt,
  wrongCount: row.wrongCount,
  isMastered: Boolean(row.isMastered),
  ...(row.masteredAt !== null ? { masteredAt: row.masteredAt } : {}),
  sourceMode: 'wrong-book',
});

const mapLearningRewardEventRow = (row: LearningRewardEventRow): LearningRewardEvent =>
  LearningRewardEventSchema.parse({
    id: row.id,
    learnerId: row.learnerId,
    ...(row.questionId ? { questionId: row.questionId } : {}),
    gameMode: row.gameMode,
    eventType: row.eventType,
    amount: row.amount,
    payload: JSON.parse(row.payloadJson) as Record<string, unknown>,
    createdAt: row.createdAt,
  });

const buildQuestionItem = (
  input: ReturnType<typeof KnowledgeQuestionCreateSchema.parse>,
  createdBy: string,
): KnowledgeQuestionItem => {
  const now = Date.now();
  const candidate = {
    id: input.id ?? `kb-${randomUUID()}`,
    subject: input.subject,
    grade: input.grade ?? 'grade1',
    semester: input.semester ?? 'lower',
    difficulty: input.difficulty,
    topic: input.topic,
    stem: input.stem,
    type: input.type,
    answer: input.answer,
    knowledgePoints: input.knowledgePoints,
    gameModes: input.gameModes,
    status: input.status ?? 'draft',
    metadata: input.metadata,
    createdBy,
    createdAt: now,
    updatedAt: now,
    ...(input.explanation ? { explanation: input.explanation } : {}),
    ...(input.options ? { options: input.options } : {}),
    ...(input.items ? { items: input.items } : {}),
    ...(input.correctOrder ? { correctOrder: input.correctOrder } : {}),
  };
  return KnowledgeQuestionItemSchema.parse(candidate);
};

const mergeQuestionUpdate = (
  current: KnowledgeQuestionItem,
  update: ReturnType<typeof KnowledgeQuestionUpdateSchema.parse>,
): KnowledgeQuestionItem => {
  const candidate = {
    ...current,
    ...update,
    updatedAt: Date.now(),
  };
  return KnowledgeQuestionItemSchema.parse(candidate);
};

const insertQuestion = (item: KnowledgeQuestionItem): void => {
  getDb()
    .prepare(
      `INSERT INTO knowledge_question_item
        (id, subject, grade, semester, difficulty, topic, stem, type, optionsJson, itemsJson, correctOrderJson, answer, knowledgePointsJson, gameModesJson, explanation, status, metadataJson, createdBy, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      item.id,
      item.subject,
      item.grade,
      item.semester,
      item.difficulty,
      item.topic,
      item.stem,
      item.type,
      'options' in item ? JSON.stringify(item.options) : null,
      'items' in item ? JSON.stringify(item.items) : null,
      'correctOrder' in item ? JSON.stringify(item.correctOrder) : null,
      item.answer,
      JSON.stringify(item.knowledgePoints),
      JSON.stringify(item.gameModes),
      item.explanation ?? null,
      item.status,
      JSON.stringify(item.metadata),
      item.createdBy,
      item.createdAt,
      item.updatedAt,
    );
};

const updateQuestion = (item: KnowledgeQuestionItem): void => {
  getDb()
    .prepare(
      `UPDATE knowledge_question_item
          SET subject = ?,
              grade = ?,
              semester = ?,
              difficulty = ?,
              topic = ?,
              stem = ?,
              type = ?,
              optionsJson = ?,
              itemsJson = ?,
              correctOrderJson = ?,
              answer = ?,
              knowledgePointsJson = ?,
              gameModesJson = ?,
              explanation = ?,
              status = ?,
              metadataJson = ?,
              updatedAt = ?
        WHERE id = ?`,
    )
    .run(
      item.subject,
      item.grade,
      item.semester,
      item.difficulty,
      item.topic,
      item.stem,
      item.type,
      'options' in item ? JSON.stringify(item.options) : null,
      'items' in item ? JSON.stringify(item.items) : null,
      'correctOrder' in item ? JSON.stringify(item.correctOrder) : null,
      item.answer,
      JSON.stringify(item.knowledgePoints),
      JSON.stringify(item.gameModes),
      item.explanation ?? null,
      item.status,
      JSON.stringify(item.metadata),
      item.updatedAt,
      item.id,
    );
};

const getQuestionById = (id: string): KnowledgeQuestionItem | null => {
  const row = getDb()
    .prepare('SELECT * FROM knowledge_question_item WHERE id = ?')
    .get(id) as KnowledgeQuestionRow | undefined;
  return row ? mapQuestionRow(row) : null;
};

router.get('/api/knowledge-bank/questions', (req, res, next) => {
  try {
    const { subject, status, grade, semester, mode, limit } = req.query as Record<string, string | undefined>;
    let sql = 'SELECT * FROM knowledge_question_item WHERE 1 = 1';
    const params: (string | number)[] = [];
    if (subject) {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (grade) {
      sql += ' AND grade = ?';
      params.push(grade);
    }
    if (semester) {
      sql += ' AND semester = ?';
      params.push(semester);
    }
    if (mode) {
      sql += ' AND gameModesJson LIKE ?';
      params.push(`%\"${mode}\"%`);
    }
    sql += ' ORDER BY updatedAt DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(Math.max(1, Math.min(200, Number(limit) || 50)));
    }
    const rows = getDb().prepare(sql).all(...params) as KnowledgeQuestionRow[];
    res.json({ items: rows.map(mapQuestionRow) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/knowledge-bank/questions', (req, res, next) => {
  try {
    const parsed = KnowledgeQuestionCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? 'invalid question payload', 400, 'BAD_INPUT');
    }
    const createdBy = (req as AuthenticatedRequest).auth.sub;
    const item = buildQuestionItem(parsed.data, createdBy);
    insertQuestion(item);
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

router.patch('/api/knowledge-bank/questions/:id', (req, res, next) => {
  try {
    const current = getQuestionById(req.params.id);
    if (!current) {
      throw new AppError('question item not found', 404, 'NOT_FOUND');
    }
    const parsed = KnowledgeQuestionUpdateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? 'invalid question payload', 400, 'BAD_INPUT');
    }
    const nextItem = mergeQuestionUpdate(current, parsed.data);
    updateQuestion(nextItem);
    res.json({ item: nextItem });
  } catch (err) {
    next(err);
  }
});

router.get('/api/knowledge-bank/answer-logs', (req, res, next) => {
  try {
    const { learnerId, subject, gameMode, since, limit } = req.query as Record<string, string | undefined>;
    let sql = 'SELECT * FROM knowledge_answer_log WHERE 1 = 1';
    const params: (string | number)[] = [];
    if (learnerId) {
      sql += ' AND learnerId = ?';
      params.push(learnerId);
    }
    if (subject) {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    if (gameMode) {
      sql += ' AND gameMode = ?';
      params.push(gameMode);
    }
    if (since) {
      sql += ' AND answeredAt >= ?';
      params.push(Number(since));
    }
    sql += ' ORDER BY answeredAt DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(Math.max(1, Math.min(500, Number(limit) || 100)));
    }
    const rows = getDb().prepare(sql).all(...params) as KnowledgeAnswerLogRow[];
    res.json({ logs: rows.map(mapAnswerLogRow) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/knowledge-bank/answer-logs', (req, res, next) => {
  try {
    const parsed = KnowledgeAnswerLogCreateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? 'invalid answer log payload', 400, 'BAD_INPUT');
    }

    const now = parsed.data.answeredAt;
    const log: KnowledgeAnswerLog = {
      id: `alog-${randomUUID()}`,
      learnerId: parsed.data.learnerId,
      questionId: parsed.data.questionId,
      subject: parsed.data.subject,
      grade: parsed.data.grade,
      semester: parsed.data.semester,
      gameMode: parsed.data.gameMode,
      outcome: parsed.data.outcome,
      questionStem: parsed.data.questionStem,
      submittedAnswer: parsed.data.submittedAnswer,
      correctAnswer: parsed.data.correctAnswer,
      ...(parsed.data.durationMs !== undefined ? { durationMs: parsed.data.durationMs } : {}),
      ...(parsed.data.sourceSessionId ? { sourceSessionId: parsed.data.sourceSessionId } : {}),
      answeredAt: now,
    };

    const db = getDb();
    db.prepare(
      `INSERT INTO knowledge_answer_log
       (id, learnerId, questionId, subject, grade, semester, gameMode, outcome, questionStem, submittedAnswer, correctAnswer, durationMs, sourceSessionId, answeredAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      log.id,
      log.learnerId,
      log.questionId,
      log.subject,
      log.grade,
      log.semester,
      log.gameMode,
      log.outcome,
      log.questionStem,
      log.submittedAnswer,
      log.correctAnswer,
      log.durationMs ?? null,
      log.sourceSessionId ?? null,
      log.answeredAt,
    );

    const masteryScore = log.outcome === 'correct' ? 100 : 0;
    const masteredAt = log.outcome === 'correct' ? now : null;
    db.prepare(
      `INSERT INTO knowledge_mastery_record
       (id, learnerId, questionId, subject, grade, semester, gameModesJson, masteryScore, totalAttempts, correctAttempts, wrongAttempts, lastAnsweredAt, masteredAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(learnerId, questionId) DO UPDATE SET
         gameModesJson = excluded.gameModesJson,
         masteryScore = CAST(((knowledge_mastery_record.masteryScore * knowledge_mastery_record.totalAttempts) + excluded.masteryScore) / (knowledge_mastery_record.totalAttempts + 1) AS INTEGER),
         totalAttempts = knowledge_mastery_record.totalAttempts + 1,
         correctAttempts = knowledge_mastery_record.correctAttempts + excluded.correctAttempts,
         wrongAttempts = knowledge_mastery_record.wrongAttempts + excluded.wrongAttempts,
         lastAnsweredAt = excluded.lastAnsweredAt,
         masteredAt = COALESCE(excluded.masteredAt, knowledge_mastery_record.masteredAt),
         updatedAt = excluded.updatedAt`,
    ).run(
      `mastery-${log.learnerId}-${log.questionId}`,
      log.learnerId,
      log.questionId,
      log.subject,
      log.grade,
      log.semester,
      JSON.stringify([log.gameMode]),
      masteryScore,
      1,
      log.outcome === 'correct' ? 1 : 0,
      log.outcome === 'correct' ? 0 : 1,
      now,
      masteredAt,
      now,
    );

    const rewardAmount = log.outcome === 'correct' ? 10 : 0;
    const rewardEvent: LearningRewardEvent = LearningRewardEventSchema.parse({
      id: `reward-${randomUUID()}`,
      learnerId: log.learnerId,
      questionId: log.questionId,
      gameMode: log.gameMode,
      eventType: log.outcome === 'correct' ? 'coins' : 'exp',
      amount: rewardAmount,
      payload: { outcome: log.outcome },
      createdAt: now,
    });
    db.prepare(
      `INSERT INTO learning_reward_event
       (id, learnerId, questionId, gameMode, eventType, amount, payloadJson, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      rewardEvent.id,
      rewardEvent.learnerId,
      rewardEvent.questionId ?? null,
      rewardEvent.gameMode,
      rewardEvent.eventType,
      rewardEvent.amount,
      JSON.stringify(rewardEvent.payload),
      rewardEvent.createdAt,
    );

    res.status(201).json({ log, rewardEvent });
  } catch (err) {
    next(err);
  }
});

router.get('/api/knowledge-bank/wrong-book', (req, res, next) => {
  try {
    const { learnerId, subject, mastered, since, limit } = req.query as Record<string, string | undefined>;
    let sql = 'SELECT * FROM wrong_book WHERE 1 = 1';
    const params: (string | number)[] = [];
    if (learnerId) {
      sql += ' AND childId = ?';
      params.push(learnerId);
    }
    if (subject) {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    if (mastered === 'true') sql += ' AND isMastered = 1';
    if (mastered === 'false') sql += ' AND isMastered = 0';
    if (since) {
      sql += ' AND lastWrongAt >= ?';
      params.push(Number(since));
    }
    sql += ' ORDER BY lastWrongAt DESC, wrongCount DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(Math.max(1, Math.min(500, Number(limit) || 100)));
    }
    const rows = getDb().prepare(sql).all(...params) as WrongBookRow[];
    const records = rows.map((row) => {
      const legacy = WrongBookEntrySchema.parse({
        ...row,
        isMastered: Boolean(row.isMastered),
        ...(row.masteredAt !== null ? { masteredAt: row.masteredAt } : {}),
      });
      return mapWrongBookRow({
        ...legacy,
        isMastered: legacy.isMastered ? 1 : 0,
        masteredAt: legacy.masteredAt ?? null,
      });
    });
    res.json({ records });
  } catch (err) {
    next(err);
  }
});

router.get('/api/knowledge-bank/reward-events', (req, res, next) => {
  try {
    const { learnerId, gameMode, limit } = req.query as Record<string, string | undefined>;
    let sql = 'SELECT * FROM learning_reward_event WHERE 1 = 1';
    const params: (string | number)[] = [];
    if (learnerId) {
      sql += ' AND learnerId = ?';
      params.push(learnerId);
    }
    if (gameMode) {
      sql += ' AND gameMode = ?';
      params.push(gameMode);
    }
    sql += ' ORDER BY createdAt DESC';
    if (limit) {
      sql += ' LIMIT ?';
      params.push(Math.max(1, Math.min(500, Number(limit) || 100)));
    }
    const rows = getDb().prepare(sql).all(...params) as LearningRewardEventRow[];
    res.json({ events: rows.map(mapLearningRewardEventRow) });
  } catch (err) {
    next(err);
  }
});

router.get('/api/knowledge-bank/export/health-safe', (_req, res, next) => {
  try {
    const db = getDb();
    const questions = (db
      .prepare('SELECT * FROM knowledge_question_item ORDER BY updatedAt DESC LIMIT 500')
      .all() as KnowledgeQuestionRow[]).map(mapQuestionRow);
    const answerLogs = (db
      .prepare('SELECT * FROM knowledge_answer_log ORDER BY answeredAt DESC LIMIT 1000')
      .all() as KnowledgeAnswerLogRow[]).map(mapAnswerLogRow);
    const wrongBookRecords = (db
      .prepare('SELECT * FROM wrong_book ORDER BY lastWrongAt DESC LIMIT 1000')
      .all() as WrongBookRow[]).map(mapWrongBookRow);
    const masteryRecords = (db
      .prepare('SELECT * FROM knowledge_mastery_record ORDER BY updatedAt DESC LIMIT 1000')
      .all() as KnowledgeMasteryRecordRow[]).map(mapMasteryRow);
    const rewardEvents = (db
      .prepare('SELECT * FROM learning_reward_event ORDER BY createdAt DESC LIMIT 1000')
      .all() as LearningRewardEventRow[]).map(mapLearningRewardEventRow);

    const payload: KnowledgeExportBundle = {
      metadata: {
        exportId: `health-safe-${Date.now()}`,
        exportedAt: Date.now(),
        exportScope: 'full',
        format: 'json',
        grade: 'grade1',
        semester: 'lower',
        questionCount: questions.length,
        answerLogCount: answerLogs.length,
        wrongBookCount: wrongBookRecords.length,
        masteryRecordCount: masteryRecords.length,
        rewardEventCount: rewardEvents.length,
      },
      questions,
      answerLogs,
      wrongBookRecords,
      masteryRecords,
      rewardEvents,
    };
    res.json(KnowledgeExportBundleSchema.parse(payload));
  } catch (err) {
    next(err);
  }
});

export default router;
