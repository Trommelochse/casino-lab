import 'dotenv/config';
import { buildApp } from './app.js';
import { loadCasinoState } from './state/casinoState.js';
import { closePool } from './db/pool.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const app = buildApp();

// Graceful shutdown handlers
const closeGracefully = async (signal: string) => {
  app.log.info(`Received ${signal}, closing server gracefully...`);
  await app.close();
  await closePool();
  app.log.info('Database pool closed');
  process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

// Start server
const start = async () => {
  try {
    // Load casino state from database
    app.log.info('Loading casino state from database...');
    await loadCasinoState();
    app.log.info('Casino state loaded successfully');

    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    await closePool();
    process.exit(1);
  }
};

start();
