import { Router, type Router as ExpressRouter } from 'express';

import { getConfig } from '../config.js';

const router: ExpressRouter = Router();

router.get('/healthz', (_req, res) => {
  const { appVersion } = getConfig();
  res.status(200).json({
    status: 'ok',
    uptime: Number(process.uptime().toFixed(3)),
    version: appVersion,
  });
});

export default router;
