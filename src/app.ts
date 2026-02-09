import Fastify, { FastifyServerOptions } from 'fastify';
import { getCasinoState } from './state/casinoState.js';
import { createPlayer } from './services/playerService.js';
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
      const state = getCasinoState();
      return reply.status(200).send(state);
    } catch (err) {
      const error = err as Error;
      return reply.status(503).send({
        error: 'Service Unavailable',
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
