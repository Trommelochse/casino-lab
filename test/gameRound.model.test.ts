import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapGameRoundRow,
  type GameRoundRow,
  type GameRound,
} from '../src/models/gameRound.js';

describe('GameRound Model', () => {
  describe('mapGameRoundRow', () => {
    it('should correctly map all fields from snake_case to camelCase', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '10.00',
        multiplier: '2.50',
        payout: '25.00',
        resulting_balance: '1015.00',
        occurred_at: '2026-02-07T10:15:30.000Z',
        created_at: '2026-02-07T10:15:30.000Z',
      };

      const gameRound: GameRound = mapGameRoundRow(row);

      assert.equal(gameRound.id, '123e4567-e89b-12d3-a456-426614174000');
      assert.equal(gameRound.sessionId, '987fcdeb-51a2-43d7-b123-456789abcdef');
      assert.equal(gameRound.betAmount, '10.00');
      assert.equal(gameRound.multiplier, '2.50');
      assert.equal(gameRound.payout, '25.00');
      assert.equal(gameRound.resultingBalance, '1015.00');
      assert.equal(gameRound.occurredAt, '2026-02-07T10:15:30.000Z');
      assert.equal(gameRound.createdAt, '2026-02-07T10:15:30.000Z');
    });

    it('should preserve numeric strings without conversion', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '0.50',
        multiplier: '100.00',
        payout: '50.00',
        resulting_balance: '1234.56789',
        occurred_at: '2026-02-07T10:15:30.000Z',
        created_at: '2026-02-07T10:15:30.000Z',
      };

      const gameRound = mapGameRoundRow(row);

      // Verify strings are preserved exactly
      assert.equal(gameRound.betAmount, '0.50');
      assert.equal(gameRound.multiplier, '100.00');
      assert.equal(gameRound.payout, '50.00');
      assert.equal(gameRound.resultingBalance, '1234.56789');
    });

    it('should handle losing round (zero multiplier and payout)', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '5.00',
        multiplier: '0',
        payout: '0',
        resulting_balance: '995.00',
        occurred_at: '2026-02-07T10:15:30.000Z',
        created_at: '2026-02-07T10:15:30.000Z',
      };

      const gameRound = mapGameRoundRow(row);

      assert.equal(gameRound.multiplier, '0');
      assert.equal(gameRound.payout, '0');
      assert.equal(gameRound.resultingBalance, '995.00');
    });

    it('should handle break-even round (1x multiplier)', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '10.00',
        multiplier: '1.00',
        payout: '10.00',
        resulting_balance: '1000.00',
        occurred_at: '2026-02-07T10:15:30.000Z',
        created_at: '2026-02-07T10:15:30.000Z',
      };

      const gameRound = mapGameRoundRow(row);

      assert.equal(gameRound.betAmount, '10.00');
      assert.equal(gameRound.multiplier, '1.00');
      assert.equal(gameRound.payout, '10.00');
    });

    it('should handle big win (high multiplier)', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '1.00',
        multiplier: '500.00',
        payout: '500.00',
        resulting_balance: '1499.00',
        occurred_at: '2026-02-07T10:15:30.000Z',
        created_at: '2026-02-07T10:15:30.000Z',
      };

      const gameRound = mapGameRoundRow(row);

      assert.equal(gameRound.betAmount, '1.00');
      assert.equal(gameRound.multiplier, '500.00');
      assert.equal(gameRound.payout, '500.00');
      assert.equal(gameRound.resultingBalance, '1499.00');
    });

    it('should convert Date objects to ISO strings', () => {
      const occurredDate = new Date('2026-02-07T10:15:30.123Z');
      const createdDate = new Date('2026-02-07T10:15:30.456Z');

      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '5.00',
        multiplier: '1.50',
        payout: '7.50',
        resulting_balance: '1002.50',
        occurred_at: occurredDate,
        created_at: createdDate,
      };

      const gameRound = mapGameRoundRow(row);

      assert.equal(gameRound.occurredAt, '2026-02-07T10:15:30.123Z');
      assert.equal(gameRound.createdAt, '2026-02-07T10:15:30.456Z');
    });

    it('should keep string timestamps as-is', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '5.00',
        multiplier: '2.00',
        payout: '10.00',
        resulting_balance: '1005.00',
        occurred_at: '2026-02-07T10:15:30.999Z',
        created_at: '2026-02-07T10:15:31.000Z',
      };

      const gameRound = mapGameRoundRow(row);

      // String should be preserved exactly
      assert.equal(gameRound.occurredAt, '2026-02-07T10:15:30.999Z');
      assert.equal(gameRound.createdAt, '2026-02-07T10:15:31.000Z');
    });

    it('should handle fractional multipliers', () => {
      const row: GameRoundRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        session_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        bet_amount: '10.00',
        multiplier: '0.50',
        payout: '5.00',
        resulting_balance: '995.00',
        occurred_at: '2026-02-07T10:15:30.000Z',
        created_at: '2026-02-07T10:15:30.000Z',
      };

      const gameRound = mapGameRoundRow(row);

      assert.equal(gameRound.multiplier, '0.50');
      assert.equal(gameRound.payout, '5.00');
    });
  });
});
