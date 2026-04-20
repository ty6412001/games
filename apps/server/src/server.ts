import express, { type Express } from 'express';

import { getDb } from './db/client.js';
import { AppError, errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import bossLogRouter from './routes/bossLog.js';
import healthRouter from './routes/health.js';
import knowledgeBankRouter from './routes/knowledgeBank.js';
import weaponsRouter from './routes/weapons.js';
import wrongBookRouter from './routes/wrongBook.js';

export const createServer = (): Express => {
  getDb();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.header('origin') ?? '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(healthRouter);
  app.use(authRouter);
  app.use(knowledgeBankRouter);
  app.use(wrongBookRouter);
  app.use(weaponsRouter);
  app.use(bossLogRouter);
  app.use((_req, _res, next) => next(new AppError('Route not found', 404, 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
};
