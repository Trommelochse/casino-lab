import Fastify, { FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import { getCasinoState } from './state/casinoState.js';
import { getWorldState } from './state/worldState.js';
import { createPlayer, getAllPlayers } from './services/playerService.js';
import { isArchetypeName } from './constants/archetypes.js';
import { simulateHourTick } from './simulation/simulationOrchestrator.js';

export function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    ...opts,
  });

  // Register CORS plugin for frontend access
  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Health check route
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ status: 'ok' });
  });

  // Casino state endpoint
  app.get('/state', async (_request, reply) => {
    try {
      // Get cached casino state (fails fast if not loaded)
      const casinoState = getCasinoState();

      // Fetch all players from database
      const players = await getAllPlayers();

      // Return combined state
      return reply.status(200).send({
        casino: casinoState,
        players: players,
      });
    } catch (err) {
      const error = err as Error;
      app.log.error(error);

      // Distinguish initialization errors (503) from runtime errors (500)
      const isInitError = error.message.includes('not loaded');
      const statusCode = isInitError ? 503 : 500;
      const errorType = isInitError ? 'Service Unavailable' : 'Internal Server Error';

      return reply.status(statusCode).send({
        error: errorType,
        message: error.message,
      });
    }
  });

  // World state endpoint
  app.get('/world', async (_request, reply) => {
    try {
      // Get cached world state (fails fast if not loaded)
      const worldState = getWorldState();

      // Convert BigInt fields to strings for JSON serialization
      return reply.status(200).send({
        id: worldState.id,
        currentHour: worldState.currentHour.toString(),
        totalSpins: worldState.totalSpins.toString(),
        masterSeed: worldState.masterSeed,
        simulationStartedAt: worldState.simulationStartedAt,
        lastHourCompletedAt: worldState.lastHourCompletedAt,
        totalHouseRevenue: worldState.totalHouseRevenue,
        totalSessions: worldState.totalSessions.toString(),
        createdAt: worldState.createdAt,
        updatedAt: worldState.updatedAt,
      });
    } catch (err) {
      const error = err as Error;
      app.log.error(error);

      // Distinguish initialization errors (503) from runtime errors (500)
      const isInitError = error.message.includes('not loaded');
      const statusCode = isInitError ? 503 : 500;
      const errorType = isInitError ? 'Service Unavailable' : 'Internal Server Error';

      return reply.status(statusCode).send({
        error: errorType,
        message: error.message,
      });
    }
  });

  // Player creation endpoint
  app.post<{
    Body: { archetype: string; username?: string };
  }>('/players', async (request, reply) => {
    try {
      const { archetype, username } = request.body;

      // Validate archetype
      if (!archetype) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'archetype is required',
        });
      }

      if (!isArchetypeName(archetype)) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: `Invalid archetype: "${archetype}". Must be one of: Recreational, VIP, Bonus Hunter`,
        });
      }

      // Create player
      const player = await createPlayer({
        archetype,
        username,
      });

      return reply.status(201).send(player);
    } catch (err) {
      const error = err as Error;
      app.log.error(error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message,
      });
    }
  });

  // Simulate hour tick endpoint
  app.post('/simulate/hour', async (_request, reply) => {
    try {
      app.log.info('Starting hour simulation...');

      const summary = await simulateHourTick();

      app.log.info({
        playersProcessed: summary.playersProcessed,
        totalSpins: summary.totalSpins,
        houseRevenue: summary.houseRevenue
      }, 'Hour simulation completed');

      return reply.status(200).send(summary);
    } catch (err) {
      const error = err as Error;
      app.log.error(error, 'Hour simulation failed');
      return reply.status(500).send({
        error: 'Simulation Failed',
        message: error.message,
      });
    }
  });

  return app;
}
