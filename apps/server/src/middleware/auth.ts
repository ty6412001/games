import type { NextFunction, Request, Response } from 'express';

import { getConfig } from '../config.js';
import { verifyJwt, type JwtPayload } from '../lib/jwt.js';
import { AppError } from './errorHandler.js';

export type AuthenticatedRequest = Request & { auth: JwtPayload };

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.header('authorization');
  if (!header) {
    next(new AppError('Missing Authorization header', 401, 'NO_AUTH'));
    return;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    next(new AppError('Invalid Authorization header', 401, 'BAD_AUTH'));
    return;
  }
  const payload = verifyJwt(token, getConfig().jwtSecret);
  if (!payload) {
    next(new AppError('Invalid or expired token', 401, 'BAD_TOKEN'));
    return;
  }
  (req as AuthenticatedRequest).auth = payload;
  next();
};
