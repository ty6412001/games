import { Router, type Router as ExpressRouter } from 'express';

import { getDb } from '../db/client.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';

type WeaponRow = {
  childId: string;
  weaponId: string;
  heroId: string;
  unlockedAt: number;
};

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get('/api/weapons', (req, res, next) => {
  try {
    const { childId } = req.query as Record<string, string | undefined>;
    if (!childId) throw new AppError('childId required', 400, 'BAD_INPUT');
    const rows = getDb()
      .prepare('SELECT * FROM weapon_collection WHERE childId = ? ORDER BY unlockedAt')
      .all(childId) as WeaponRow[];
    res.json({ weapons: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/api/weapons', (req, res, next) => {
  try {
    const body = req.body as WeaponRow;
    if (!body?.childId || !body?.weaponId) {
      throw new AppError('childId and weaponId required', 400, 'BAD_INPUT');
    }
    getDb()
      .prepare(
        'INSERT INTO weapon_collection (childId, weaponId, heroId, unlockedAt) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING',
      )
      .run(body.childId, body.weaponId, body.heroId, body.unlockedAt ?? Date.now());
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
