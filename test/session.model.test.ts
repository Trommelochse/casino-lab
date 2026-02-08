import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapSessionRow, type SessionRow, type Session } from '../src/models/session.js';

describe('Session Model', () => {
  describe('mapSessionRow', () => {
    it('should correctly map all fields from snake_case to camelCase', () => {
      const row: SessionRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        player_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        started_at: '2026-02-07T10:00:00.000Z',
        ended_at: '2026-02-07T11:30:00.000Z',
        initial_balance: '1000.00',
        final_balance: '1250.50',
        created_at: '2026-02-07T10:00:00.000Z',
        updated_at: '2026-02-07T11:30:00.000Z',
      };

      const session: Session = mapSessionRow(row);

      assert.equal(session.id, '123e4567-e89b-12d3-a456-426614174000');
      assert.equal(session.playerId, '987fcdeb-51a2-43d7-b123-456789abcdef');
      assert.equal(session.startedAt, '2026-02-07T10:00:00.000Z');
      assert.equal(session.endedAt, '2026-02-07T11:30:00.000Z');
      assert.equal(session.initialBalance, '1000.00');
      assert.equal(session.finalBalance, '1250.50');
      assert.equal(session.createdAt, '2026-02-07T10:00:00.000Z');
      assert.equal(session.updatedAt, '2026-02-07T11:30:00.000Z');
    });

    it('should handle null endedAt and finalBalance (open session)', () => {
      const row: SessionRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        player_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        started_at: '2026-02-07T10:00:00.000Z',
        ended_at: null,
        initial_balance: '1000.00',
        final_balance: null,
        created_at: '2026-02-07T10:00:00.000Z',
        updated_at: '2026-02-07T10:00:00.000Z',
      };

      const session = mapSessionRow(row);

      assert.equal(session.endedAt, null);
      assert.equal(session.finalBalance, null);
    });

    it('should preserve numeric strings without conversion', () => {
      const row: SessionRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        player_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        started_at: '2026-02-07T10:00:00.000Z',
        ended_at: '2026-02-07T11:00:00.000Z',
        initial_balance: '12345.67890',
        final_balance: '9876.54321',
        created_at: '2026-02-07T10:00:00.000Z',
        updated_at: '2026-02-07T11:00:00.000Z',
      };

      const session = mapSessionRow(row);

      // Verify strings are preserved exactly
      assert.equal(session.initialBalance, '12345.67890');
      assert.equal(session.finalBalance, '9876.54321');
    });

    it('should convert Date objects to ISO strings', () => {
      const startedDate = new Date('2026-02-07T10:00:00.000Z');
      const endedDate = new Date('2026-02-07T11:30:00.000Z');
      const createdDate = new Date('2026-02-07T10:00:00.000Z');
      const updatedDate = new Date('2026-02-07T11:30:00.000Z');

      const row: SessionRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        player_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        started_at: startedDate,
        ended_at: endedDate,
        initial_balance: '1000.00',
        final_balance: '1100.00',
        created_at: createdDate,
        updated_at: updatedDate,
      };

      const session = mapSessionRow(row);

      assert.equal(session.startedAt, '2026-02-07T10:00:00.000Z');
      assert.equal(session.endedAt, '2026-02-07T11:30:00.000Z');
      assert.equal(session.createdAt, '2026-02-07T10:00:00.000Z');
      assert.equal(session.updatedAt, '2026-02-07T11:30:00.000Z');
    });

    it('should keep string timestamps as-is', () => {
      const row: SessionRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        player_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        started_at: '2026-02-07T10:15:30.123Z',
        ended_at: '2026-02-07T11:20:45.456Z',
        initial_balance: '1000.00',
        final_balance: '1050.00',
        created_at: '2026-02-07T10:15:30.123Z',
        updated_at: '2026-02-07T11:20:45.456Z',
      };

      const session = mapSessionRow(row);

      // String should be preserved exactly
      assert.equal(session.startedAt, '2026-02-07T10:15:30.123Z');
      assert.equal(session.endedAt, '2026-02-07T11:20:45.456Z');
      assert.equal(session.createdAt, '2026-02-07T10:15:30.123Z');
      assert.equal(session.updatedAt, '2026-02-07T11:20:45.456Z');
    });

    it('should handle session with zero balances', () => {
      const row: SessionRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        player_id: '987fcdeb-51a2-43d7-b123-456789abcdef',
        started_at: '2026-02-07T10:00:00.000Z',
        ended_at: '2026-02-07T10:30:00.000Z',
        initial_balance: '100.00',
        final_balance: '0',
        created_at: '2026-02-07T10:00:00.000Z',
        updated_at: '2026-02-07T10:30:00.000Z',
      };

      const session = mapSessionRow(row);

      assert.equal(session.initialBalance, '100.00');
      assert.equal(session.finalBalance, '0');
    });
  });
});
