import 'dotenv/config';
import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Player API', () => {
  // Clean up after tests
  after(async () => {
    // Delete test players
    await pool.query('DELETE FROM players WHERE archetype IN ($1, $2, $3)', [
      'Recreational',
      'VIP',
      'Bonus Hunter',
    ]);
    await pool.end();
  });

  describe('POST /players', () => {
    it('should create a Recreational player and return 201', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {
          archetype: 'Recreational',
        },
      });

      assert.equal(response.statusCode, 201);

      const player = response.json();
      assert.ok(player.id);
      assert.equal(player.archetype, 'Recreational');
      assert.equal(player.status, 'Idle');
      assert.ok(player.walletBalance);
      assert.equal(player.lifetimePL, '0.00');
      assert.ok(player.dnaTraits);
      assert.ok(player.createdAt);
      assert.ok(player.updatedAt);

      await app.close();
    });

    it('should create a VIP player and return 201', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {
          archetype: 'VIP',
        },
      });

      assert.equal(response.statusCode, 201);

      const player = response.json();
      assert.equal(player.archetype, 'VIP');

      // VIP should have high initial capital
      const walletBalance = parseFloat(player.walletBalance);
      assert.ok(walletBalance >= 500);

      await app.close();
    });

    it('should create a Bonus Hunter player and return 201', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {
          archetype: 'Bonus Hunter',
        },
      });

      assert.equal(response.statusCode, 201);

      const player = response.json();
      assert.equal(player.archetype, 'Bonus Hunter');

      await app.close();
    });

    it('should return 400 for missing archetype', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {},
      });

      assert.equal(response.statusCode, 400);

      const body = response.json();
      assert.equal(body.error, 'Bad Request');
      assert.ok(body.message.includes('archetype is required'));

      await app.close();
    });

    it('should return 400 for invalid archetype', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {
          archetype: 'InvalidArchetype',
        },
      });

      assert.equal(response.statusCode, 400);

      const body = response.json();
      assert.equal(body.error, 'Bad Request');
      assert.ok(body.message.includes('Invalid archetype'));
      assert.ok(body.message.includes('Recreational, VIP, Bonus Hunter'));

      await app.close();
    });

    it('should handle empty string archetype as invalid', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {
          archetype: '',
        },
      });

      assert.equal(response.statusCode, 400);

      const body = response.json();
      assert.equal(body.error, 'Bad Request');

      await app.close();
    });

    it('should store DNA traits as JSONB in database', async () => {
      const app = buildApp({ logger: false });

      const response = await app.inject({
        method: 'POST',
        url: '/players',
        payload: {
          archetype: 'Recreational',
        },
      });

      assert.equal(response.statusCode, 201);

      const player = response.json();

      // Verify DNA structure
      const dna = player.dnaTraits;
      assert.ok(dna);
      assert.ok(typeof dna.basePReturn === 'number');
      assert.ok(typeof dna.riskAppetite === 'number');
      assert.ok(typeof dna.betFlexibility === 'number');
      assert.ok(typeof dna.promoDependency === 'number');
      assert.ok(typeof dna.stopLossLimit === 'number');
      assert.ok(typeof dna.initialCapital === 'number');
      assert.ok(
        dna.preferredVolatility === 'low' ||
          dna.preferredVolatility === 'medium' ||
          dna.preferredVolatility === 'high'
      );

      await app.close();
    });
  });
});
