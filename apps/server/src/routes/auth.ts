import { Router, type Router as ExpressRouter } from 'express';

import { getConfig } from '../config.js';
import { getDb } from '../db/client.js';
import { signJwt } from '../lib/jwt.js';
import { AppError } from '../middleware/errorHandler.js';

const router: ExpressRouter = Router();
const MAX_FAILED = 5;
const LOCK_MS = 10 * 60 * 1000;
const JWT_TTL_SEC = 30 * 24 * 60 * 60;

type AttemptRow = { ip: string; failedCount: number; lockedUntil: number | null };

const now = (): number => Date.now();

const getAttempts = (ip: string): AttemptRow => {
  const db = getDb();
  const row = db
    .prepare('SELECT ip, failedCount, lockedUntil FROM auth_attempts WHERE ip = ?')
    .get(ip) as AttemptRow | undefined;
  return row ?? { ip, failedCount: 0, lockedUntil: null };
};

const incrementFailed = (ip: string): void => {
  const db = getDb();
  const current = getAttempts(ip);
  const failedCount = current.failedCount + 1;
  const lockedUntil = failedCount >= MAX_FAILED ? now() + LOCK_MS : null;
  db.prepare(
    'INSERT INTO auth_attempts (ip, failedCount, lockedUntil) VALUES (?, ?, ?) ON CONFLICT(ip) DO UPDATE SET failedCount=excluded.failedCount, lockedUntil=excluded.lockedUntil',
  ).run(ip, failedCount, lockedUntil);
};

const resetAttempts = (ip: string): void => {
  const db = getDb();
  db.prepare('DELETE FROM auth_attempts WHERE ip = ?').run(ip);
};

router.post('/api/auth/login', (req, res, next) => {
  try {
    const { password } = (req.body ?? {}) as { password?: string };
    if (typeof password !== 'string' || password.length === 0) {
      throw new AppError('password required', 400, 'BAD_INPUT');
    }
    const ip = req.ip ?? 'unknown';
    const attempts = getAttempts(ip);
    if (attempts.lockedUntil && attempts.lockedUntil > now()) {
      throw new AppError('locked, try later', 429, 'LOCKED');
    }
    if (password !== getConfig().familyPassword) {
      incrementFailed(ip);
      throw new AppError('invalid password', 401, 'WRONG_PASSWORD');
    }
    resetAttempts(ip);
    const token = signJwt({ sub: 'family' }, JWT_TTL_SEC, getConfig().jwtSecret);
    res.json({ token, expiresIn: JWT_TTL_SEC });
  } catch (err) {
    next(err);
  }
});

export default router;
