import Fastify, { FastifyServerOptions } from 'fastify';
import { getCasinoState } from './state/casinoState.js';
import { createPlayer, getAllPlayers } from './services/playerService.js';
import { isArchetypeName } from './constants/archetypes.js';

export function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
    ...opts,
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

  return app;
}
