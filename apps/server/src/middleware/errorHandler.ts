import type { ErrorRequestHandler } from 'express';

import logger from '../lib/logger.js';

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;

  constructor(message: string, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError('Internal Server Error', 500, 'INTERNAL_SERVER_ERROR');
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const appError = toAppError(error);
  if (!(error instanceof AppError)) {
    logger.error({ err: error }, 'Unhandled error');
  }
  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
    },
  });
};
