import 'dotenv/config';
import { buildApp } from './app.js';
import { loadCasinoState } from './state/casinoState.js';
import { loadWorldState } from './state/worldState.js';
import { closePool } from './db/pool.js';
import slotModels from './slots/slotModels.config.js';
import { buildSlotRegistry, initSlotRegistry } from './slots/slotRegistry.js';

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
    // Initialize slot registry (fail fast)
    app.log.info('Loading slot models...');
    const slotRegistry = buildSlotRegistry(slotModels);
    initSlotRegistry(slotRegistry);
    app.log.info(`Loaded ${Object.keys(slotRegistry).length} slot models`);

    // Load casino state from database
    app.log.info('Loading casino state from database...');
    await loadCasinoState();
    app.log.info('Casino state loaded successfully');

    // Load world state from database
    app.log.info('Loading world state from database...');
    await loadWorldState();
    app.log.info('World state loaded successfully');

    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    await closePool();
    process.exit(1);
  }
};

start();
