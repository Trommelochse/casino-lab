import 'dotenv/config';
import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  __setCasinoStateForTests,
  __clearCasinoStateForTests,
  type CasinoState,
} from '../src/state/casinoState.js';
import { createPlayer } from '../src/services/playerService.js';
import { pool } from '../src/db/pool.js';

describe('Casino State Endpoint', () => {
  beforeEach(async () => {
    // Clear state before each test
    __clearCasinoStateForTests();
    // Clear players table before each test
    await pool.query('DELETE FROM players');
  });

  after(async () => {
    // Clean up database and close pool
    await pool.query('DELETE FROM players');
    await pool.end();
  });

  it('GET /state should return 200 with casino state and empty players', async () => {
    const app = buildApp({ logger: false });

    // Set up test state
    const testState: CasinoState = {
      id: 1,
      house_revenue: '0',
      active_player_count: 0,
      updated_at: new Date().toISOString(),
    };
    __setCasinoStateForTests(testState);

    const response = await app.inject({
      method: 'GET',
      url: '/state',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    // Validate casino state nested under "casino" key
    assert.ok(body.casino);
    assert.equal(body.casino.id, 1);
    assert.equal(body.casino.house_revenue, '0');
    assert.equal(body.casino.active_player_count, 0);

    // Validate players array exists (empty initially)
    assert.ok(Array.isArray(body.players));
    assert.equal(body.players.length, 0);

    await app.close();
  });

  it('GET /state should return 503 when state is not loaded', async () => {
    const app = buildApp({ logger: false });

    const response = await app.inject({
      method: 'GET',
      url: '/state',
    });

    assert.equal(response.statusCode, 503);
    const body = response.json();
    assert.equal(body.error, 'Service Unavailable');
    assert.ok(body.message.includes('not loaded'));

    await app.close();
  });

  it('GET /state should return casino state with non-zero values', async () => {
    const app = buildApp({ logger: false });

    // Set up test state with non-zero values
    const testState: CasinoState = {
      id: 1,
      house_revenue: '12345.67',
      active_player_count: 42,
      updated_at: '2025-02-07T12:00:00Z',
    };
    __setCasinoStateForTests(testState);

    const response = await app.inject({
      method: 'GET',
      url: '/state',
    });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    // Validate casino state nested under "casino" key
    assert.ok(body.casino);
    assert.equal(body.casino.id, 1);
    assert.equal(body.casino.house_revenue, '12345.67');
    assert.equal(body.casino.active_player_count, 42);
    assert.equal(body.casino.updated_at, '2025-02-07T12:00:00Z');

    // Validate players array exists (empty initially)
    assert.ok(Array.isArray(body.players));
    assert.equal(body.players.length, 0);

    await app.close();
  });

  it('GET /state should return casino + single player with all fields', async () => {
    const app = buildApp({ logger: false });
    __setCasinoStateForTests({
      id: 1,
      house_revenue: '100.00',
      active_player_count: 1,
      updated_at: new Date().toISOString(),
    });

    const player = await createPlayer({ archetype: 'Recreational' });

    const response = await app.inject({ method: 'GET', url: '/state' });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.players.length, 1);
    assert.equal(body.players[0].id, player.id);
    assert.equal(body.players[0].archetype, 'Recreational');
    assert.ok(body.players[0].dnaTraits);
    assert.ok(body.players[0].walletBalance);
    assert.ok(body.players[0].lifetimePL);
    assert.ok(body.players[0].remainingCapital);

    await app.close();
  });

  it('GET /state should return multiple players ordered by creation (newest first)', async () => {
    const app = buildApp({ logger: false });
    __setCasinoStateForTests({
      id: 1,
      house_revenue: '500.00',
      active_player_count: 3,
      updated_at: new Date().toISOString(),
    });

    const p1 = await createPlayer({ archetype: 'Recreational' });
    const p2 = await createPlayer({ archetype: 'VIP' });
    const p3 = await createPlayer({ archetype: 'Bonus Hunter' });

    const response = await app.inject({ method: 'GET', url: '/state' });

    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.players.length, 3);

    // Verify DESC order (newest first)
    assert.equal(body.players[0].id, p3.id);
    assert.equal(body.players[1].id, p2.id);
    assert.equal(body.players[2].id, p1.id);

    await app.close();
  });
});
