import { Router, type Router as ExpressRouter } from 'express';

import { getDb } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

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

const router: ExpressRouter = Router();
router.use(requireAuth);

const mapRow = (row: WrongBookRow) => ({
  ...row,
  isMastered: Boolean(row.isMastered),
  ...(row.masteredAt !== null ? { masteredAt: row.masteredAt } : {}),
});

router.get('/api/wrong-book', (req, res, next) => {
  try {
    const { childId, subject, mastered, since } = req.query as Record<string, string | undefined>;
    if (!childId) throw new AppError('childId required', 400, 'BAD_INPUT');
    let sql = 'SELECT * FROM wrong_book WHERE childId = ?';
    const params: (string | number)[] = [childId];
    if (subject) {
      sql += ' AND subject = ?';
      params.push(subject);
    }
    if (mastered === 'false') sql += ' AND isMastered = 0';
    if (mastered === 'true') sql += ' AND isMastered = 1';
    if (since) {
      sql += ' AND lastWrongAt >= ?';
      params.push(Number(since));
    }
    sql += ' ORDER BY wrongCount DESC, lastWrongAt DESC';
    const rows = getDb().prepare(sql).all(...params) as WrongBookRow[];
    res.json({ entries: rows.map(mapRow) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/wrong-book', (req, res, next) => {
  try {
    const body = req.body as {
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
      isMastered: boolean;
      masteredAt?: number | null;
    };
    if (!body?.id || !body?.childId) throw new AppError('id and childId required', 400, 'BAD_INPUT');
    const db = getDb();
    db.prepare(
      `INSERT INTO wrong_book
       (id, childId, questionId, subject, week, stem, wrongAnswer, correctAnswer, firstWrongAt, lastWrongAt, wrongCount, isMastered, masteredAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         wrongAnswer = excluded.wrongAnswer,
         lastWrongAt = CASE WHEN excluded.lastWrongAt >= wrong_book.lastWrongAt THEN excluded.lastWrongAt ELSE wrong_book.lastWrongAt END,
         wrongCount = CASE WHEN excluded.lastWrongAt >= wrong_book.lastWrongAt THEN excluded.wrongCount ELSE wrong_book.wrongCount END,
         isMastered = MAX(wrong_book.isMastered, excluded.isMastered),
         masteredAt = COALESCE(excluded.masteredAt, wrong_book.masteredAt)`,
    ).run(
      body.id,
      body.childId,
      body.questionId,
      body.subject,
      body.week,
      body.stem,
      body.wrongAnswer,
      body.correctAnswer,
      body.firstWrongAt,
      body.lastWrongAt,
      body.wrongCount,
      body.isMastered ? 1 : 0,
      body.masteredAt ?? null,
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/api/wrong-book/:id/master', (req, res, next) => {
  try {
    const id = req.params.id;
    getDb()
      .prepare('UPDATE wrong_book SET isMastered = 1, masteredAt = ? WHERE id = ?')
      .run(Date.now(), id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/api/wrong-book/:id', (req, res, next) => {
  try {
    const id = req.params.id;
    getDb().prepare('DELETE FROM wrong_book WHERE id = ?').run(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
