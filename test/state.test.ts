import 'dotenv/config';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';
import {
  __setCasinoStateForTests,
  __clearCasinoStateForTests,
  type CasinoState,
} from '../src/state/casinoState.js';

describe('Casino State Endpoint', () => {
  beforeEach(() => {
    // Clear state before each test
    __clearCasinoStateForTests();
  });

  it('GET /state should return 200 with casino state when loaded', async () => {
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
    const body = response.json<CasinoState>();
    assert.equal(body.id, 1);
    assert.equal(body.house_revenue, '0');
    assert.equal(body.active_player_count, 0);

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
    const body = response.json<CasinoState>();
    assert.equal(body.id, 1);
    assert.equal(body.house_revenue, '12345.67');
    assert.equal(body.active_player_count, 42);
    assert.equal(body.updated_at, '2025-02-07T12:00:00Z');

    await app.close();
  });
});
