import express, { type Express } from 'express';

import { getDb } from './db/client.js';
import { AppError, errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';

export const createServer = (): Express => {
  getDb();

  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use(healthRouter);
  app.use((_req, _res, next) => next(new AppError('Route not found', 404, 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
};
