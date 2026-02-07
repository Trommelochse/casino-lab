import Fastify, { FastifyServerOptions } from 'fastify';
import { getCasinoState } from './state/casinoState.js';

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

  return app;
}
