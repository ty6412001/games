import { Router, type Router as ExpressRouter } from 'express';

import { getDb } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

type BossLogRow = {
  id: string;
  childId: string;
  week: number;
  bossId: string;
  defeated: number;
  totalCombatPower: number;
  topContributor: string | null;
  playedAt: number;
};

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get('/api/boss-log', (req, res, next) => {
  try {
    const { childId } = req.query as Record<string, string | undefined>;
    if (!childId) throw new AppError('childId required', 400, 'BAD_INPUT');
    const rows = getDb()
      .prepare('SELECT * FROM boss_log WHERE childId = ? ORDER BY playedAt DESC LIMIT 100')
      .all(childId) as BossLogRow[];
    res.json({ logs: rows.map((r) => ({ ...r, defeated: Boolean(r.defeated) })) });
  } catch (err) {
    next(err);
  }
});

router.post('/api/boss-log', (req, res, next) => {
  try {
    const body = req.body as {
      id: string;
      childId: string;
      week: number;
      bossId: string;
      defeated: boolean;
      totalCombatPower: number;
      topContributor?: string | null;
      playedAt: number;
    };
    if (!body?.id || !body?.childId) {
      throw new AppError('id and childId required', 400, 'BAD_INPUT');
    }
    getDb()
      .prepare(
        'INSERT INTO boss_log (id, childId, week, bossId, defeated, totalCombatPower, topContributor, playedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
      )
      .run(
        body.id,
        body.childId,
        body.week,
        body.bossId,
        body.defeated ? 1 : 0,
        body.totalCombatPower,
        body.topContributor ?? null,
        body.playedAt,
      );
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
