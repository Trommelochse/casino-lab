import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapPlayerRow,
  isPlayerStatus,
  type PlayerRow,
  type Player,
} from '../src/models/player.js';

describe('Player Model', () => {
  describe('isPlayerStatus', () => {
    it('should return true for valid status values', () => {
      assert.equal(isPlayerStatus('Idle'), true);
      assert.equal(isPlayerStatus('Active'), true);
      assert.equal(isPlayerStatus('Broke'), true);
    });

    it('should return false for invalid status values', () => {
      assert.equal(isPlayerStatus('invalid'), false);
      assert.equal(isPlayerStatus(''), false);
      assert.equal(isPlayerStatus(null), false);
      assert.equal(isPlayerStatus(undefined), false);
      assert.equal(isPlayerStatus(123), false);
    });
  });

  describe('mapPlayerRow', () => {
    it('should correctly map all fields from snake_case to camelCase', () => {
      const row: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'Recreational',
        status: 'Idle',
        wallet_balance: '100.50',
        lifetime_pl: '-25.75',
        remaining_capital: '500.00',
        dna_traits: { base_p_return: 0.5, risk_appetite: 0.3 },
        created_at: '2026-02-07T12:00:00.000Z',
        updated_at: '2026-02-07T13:00:00.000Z',
      };

      const player: Player = mapPlayerRow(row);

      assert.equal(player.id, '123e4567-e89b-12d3-a456-426614174000');
      assert.equal(player.archetype, 'Recreational');
      assert.equal(player.status, 'Idle');
      assert.equal(player.walletBalance, '100.50');
      assert.equal(player.lifetimePL, '-25.75');
      assert.equal(player.remainingCapital, '500.00');
      assert.deepEqual(player.dnaTraits, {
        base_p_return: 0.5,
        risk_appetite: 0.3,
      });
      assert.equal(player.createdAt, '2026-02-07T12:00:00.000Z');
      assert.equal(player.updatedAt, '2026-02-07T13:00:00.000Z');
    });

    it('should preserve numeric strings without conversion', () => {
      const row: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'VIP',
        status: 'Active',
        wallet_balance: '12345.67890',
        lifetime_pl: '9999.99999',
        remaining_capital: '0.00001',
        dna_traits: null,
        created_at: '2026-02-07T12:00:00.000Z',
        updated_at: '2026-02-07T12:00:00.000Z',
      };

      const player = mapPlayerRow(row);

      // Verify strings are preserved exactly
      assert.equal(player.walletBalance, '12345.67890');
      assert.equal(player.lifetimePL, '9999.99999');
      assert.equal(player.remainingCapital, '0.00001');
    });

    it('should handle null dna_traits', () => {
      const row: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'Bonus Hunter',
        status: 'Broke',
        wallet_balance: '0',
        lifetime_pl: '0',
        remaining_capital: '0',
        dna_traits: null,
        created_at: '2026-02-07T12:00:00.000Z',
        updated_at: '2026-02-07T12:00:00.000Z',
      };

      const player = mapPlayerRow(row);

      assert.equal(player.dnaTraits, null);
    });

    it('should convert Date objects to ISO strings', () => {
      const createdDate = new Date('2026-02-07T12:00:00.000Z');
      const updatedDate = new Date('2026-02-07T13:30:00.000Z');

      const row: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'Recreational',
        status: 'Idle',
        wallet_balance: '100',
        lifetime_pl: '0',
        remaining_capital: '200',
        dna_traits: null,
        created_at: createdDate,
        updated_at: updatedDate,
      };

      const player = mapPlayerRow(row);

      assert.equal(player.createdAt, '2026-02-07T12:00:00.000Z');
      assert.equal(player.updatedAt, '2026-02-07T13:30:00.000Z');
    });

    it('should keep string timestamps as-is', () => {
      const row: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'VIP',
        status: 'Active',
        wallet_balance: '1000',
        lifetime_pl: '500',
        remaining_capital: '5000',
        dna_traits: null,
        created_at: '2026-02-07T10:15:30.123Z',
        updated_at: '2026-02-07T10:15:30.123Z',
      };

      const player = mapPlayerRow(row);

      // String should be preserved exactly
      assert.equal(player.createdAt, '2026-02-07T10:15:30.123Z');
      assert.equal(player.updatedAt, '2026-02-07T10:15:30.123Z');
    });

    it('should throw error for invalid status', () => {
      const row: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'Recreational',
        status: 'InvalidStatus',
        wallet_balance: '100',
        lifetime_pl: '0',
        remaining_capital: '200',
        dna_traits: null,
        created_at: '2026-02-07T12:00:00.000Z',
        updated_at: '2026-02-07T12:00:00.000Z',
      };

      assert.throws(
        () => mapPlayerRow(row),
        {
          name: 'Error',
          message:
            'Invalid player status: "InvalidStatus". Expected one of: Idle, Active, Broke',
        }
      );
    });

    it('should handle all valid status values', () => {
      const baseRow: PlayerRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        archetype: 'Recreational',
        status: 'Idle',
        wallet_balance: '100',
        lifetime_pl: '0',
        remaining_capital: '200',
        dna_traits: null,
        created_at: '2026-02-07T12:00:00.000Z',
        updated_at: '2026-02-07T12:00:00.000Z',
      };

      // Test each valid status
      const idlePlayer = mapPlayerRow({ ...baseRow, status: 'Idle' });
      assert.equal(idlePlayer.status, 'Idle');

      const activePlayer = mapPlayerRow({ ...baseRow, status: 'Active' });
      assert.equal(activePlayer.status, 'Active');

      const brokePlayer = mapPlayerRow({ ...baseRow, status: 'Broke' });
      assert.equal(brokePlayer.status, 'Broke');
    });
  });
});
