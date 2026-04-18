import 'dotenv/config';

import { getConfig } from './config.js';
import { closeDb } from './db/client.js';
import logger from './lib/logger.js';
import { createServer } from './server.js';

const app = createServer();
const { port } = getConfig();
const server = app.listen(port, () => {
  logger.info({ port }, 'Server listening');
});

let shuttingDown = false;

const shutdown = (signal: NodeJS.Signals): void => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received');

  server.close((error) => {
    closeDb();
    if (error) {
      logger.error({ err: error }, 'Server shutdown failed');
      process.exit(1);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
