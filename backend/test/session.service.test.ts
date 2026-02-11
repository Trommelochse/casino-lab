import 'dotenv/config';
import { describe, it, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { pool } from '../src/db/pool.js';
import { createPlayer } from '../src/services/playerService.js';
import {
  createSession,
  shouldPlayerStartSession,
  selectVolatilityForSession,
} from '../src/services/sessionService.js';

describe('Session Service', () => {
  beforeEach(async () => {
    // Clean up before each test
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM players');
  });

  after(async () => {
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM players');
    await pool.end();
  });

  describe('shouldPlayerStartSession', () => {
    it('should return false for Bonus Hunter with high promoDependency', async () => {
      const player = await createPlayer({
        archetype: 'Bonus Hunter',
        seed: 'test-bonus-hunter',
      });

      // Run multiple times to verify consistent behavior
      const results = Array.from({ length: 10 }, () =>
        shouldPlayerStartSession(player)
      );

      // Should always return false (no bonuses available)
      assert.ok(results.every((r) => r === false));
    });

    it('should use basePReturn for Recreational players', async () => {
      const player = await createPlayer({
        archetype: 'Recreational',
        seed: 'test-rec',
      });

      // Run many times to check probabilistic behavior
      const results = Array.from({ length: 100 }, () =>
        shouldPlayerStartSession(player)
      );

      const trueCount = results.filter((r) => r === true).length;
      const falseCount = results.filter((r) => r === false).length;

      // Should have both true and false (non-deterministic)
      assert.ok(trueCount > 0, 'Should trigger some sessions');
      assert.ok(falseCount > 0, 'Should skip some sessions');
    });

    it('should use basePReturn for VIP players', async () => {
      const player = await createPlayer({
        archetype: 'VIP',
        seed: 'test-vip',
      });

      const results = Array.from({ length: 100 }, () =>
        shouldPlayerStartSession(player)
      );

      const trueCount = results.filter((r) => r === true).length;

      // VIPs have high basePReturn (0.85-0.98), should trigger most sessions
      assert.ok(trueCount > 70, `Expected >70% sessions, got ${trueCount}%`);
    });
  });

  describe('selectVolatilityForSession', () => {
    it('should return preferredVolatility from DNA', async () => {
      const player = await createPlayer({
        archetype: 'Recreational',
        seed: 'test-volatility',
      });

      const volatility = selectVolatilityForSession(player);

      // Recreational prefers low or medium
      assert.ok(['low', 'medium'].includes(volatility));
    });

    it('should select medium for Bonus Hunters', async () => {
      const player = await createPlayer({
        archetype: 'Bonus Hunter',
        seed: 'test-bh-vol',
      });

      const volatility = selectVolatilityForSession(player);

      // Bonus Hunters prefer medium volatility
      assert.equal(volatility, 'medium');
    });
  });

  describe('createSession', () => {
    it('should create session with all required fields', async () => {
      const player = await createPlayer({ archetype: 'Recreational' });

      const session = await createSession({
        playerId: player.id,
        initialBalance: player.walletBalance,
        slotVolatility: 'low',
      });

      assert.ok(session.id);
      assert.equal(session.playerId, player.id);
      assert.equal(session.initialBalance, player.walletBalance);
      assert.equal(session.slotVolatility, 'low');
      assert.ok(session.startedAt);
      assert.equal(session.endedAt, null); // Session is open
      assert.equal(session.finalBalance, null); // Not ended yet
    });

    it('should persist session to database', async () => {
      const player = await createPlayer({ archetype: 'VIP' });

      const session = await createSession({
        playerId: player.id,
        initialBalance: player.walletBalance,
        slotVolatility: 'high',
      });

      // Query database directly to verify persistence
      const result = await pool.query(
        'SELECT * FROM sessions WHERE id = $1',
        [session.id]
      );

      assert.equal(result.rows.length, 1);
      assert.equal(result.rows[0].player_id, player.id);
      assert.equal(result.rows[0].slot_volatility, 'high');
    });

    it('should handle different volatility values', async () => {
      const player = await createPlayer({ archetype: 'VIP' });

      const lowSession = await createSession({
        playerId: player.id,
        initialBalance: '1000.00',
        slotVolatility: 'low',
      });

      const mediumSession = await createSession({
        playerId: player.id,
        initialBalance: '1000.00',
        slotVolatility: 'medium',
      });

      const highSession = await createSession({
        playerId: player.id,
        initialBalance: '1000.00',
        slotVolatility: 'high',
      });

      assert.equal(lowSession.slotVolatility, 'low');
      assert.equal(mediumSession.slotVolatility, 'medium');
      assert.equal(highSession.slotVolatility, 'high');
    });
  });
});
