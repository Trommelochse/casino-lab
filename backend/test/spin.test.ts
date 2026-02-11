import 'dotenv/config';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { spin, type SpinInput } from '../src/engine/spin.js';
import {
  buildSlotRegistry,
  initSlotRegistry,
  __resetForTests,
} from '../src/slots/slotRegistry.js';
import { createRng, type Rng } from '../src/services/rng.js';
import type { SlotModelsConfig } from '../src/slots/slotModels.config.js';

describe('Spin Engine', () => {
  beforeEach(() => {
    // Reset slot registry and set up test models
    __resetForTests();

    const testConfig: SlotModelsConfig = [
      {
        name: 'test',
        outcomes: [
          { key: '0.00', p: 0.5, multiplier: 0.0 }, // cumP = 0.5
          { key: '1.00', p: 0.3, multiplier: 1.0 }, // cumP = 0.8
          { key: '2.00', p: 0.2, multiplier: 2.0 }, // cumP = 1.0
        ],
      },
    ];

    const registry = buildSlotRegistry(testConfig);
    initSlotRegistry(registry);
  });

  describe('Deterministic behavior', () => {
    it('should produce consistent results with same roundSeed', () => {
      const input: SpinInput = {
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        roundSeed: 'test-seed-123',
      };

      const round1 = spin(input);
      const round2 = spin(input);

      // Same outcome
      assert.equal(round1.outcome.key, round2.outcome.key);
      assert.equal(round1.outcome.roll, round2.outcome.roll);
      assert.equal(round1.outcome.multiplier, round2.outcome.multiplier);
      assert.equal(round1.endedBalance, round2.endedBalance);
    });
  });

  describe('Outcome selection', () => {
    it('should select first outcome when roll < 0.5', () => {
      // Create RNG that always returns 0.0
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.outcome.key, '0.00');
      assert.equal(round.outcome.multiplier, '0');
      assert.equal(round.outcome.roll, 0.0);
    });

    it('should select second outcome when 0.5 <= roll < 0.8', () => {
      const fixedRng: Rng = {
        random: () => 0.6,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.outcome.key, '1.00');
      assert.equal(round.outcome.multiplier, '1');
    });

    it('should select third outcome when roll >= 0.8', () => {
      const fixedRng: Rng = {
        random: () => 0.9,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.outcome.key, '2.00');
      assert.equal(round.outcome.multiplier, '2');
    });

    it('should handle edge case at cumP boundary', () => {
      const fixedRng: Rng = {
        random: () => 0.4999,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      // 0.4999 < 0.5, so should select first outcome
      assert.equal(round.outcome.key, '0.00');
    });
  });

  describe('Balance calculations', () => {
    it('should calculate correct balance for losing round (0x multiplier)', () => {
      const fixedRng: Rng = {
        random: () => 0.0, // First outcome (0x multiplier)
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.startedBalance, '1000');
      assert.equal(round.outcome.betAmount, '10');
      assert.equal(round.outcome.payout, '0');
      assert.equal(round.outcome.profitLoss, '-10');
      assert.equal(round.endedBalance, '990');
    });

    it('should calculate correct balance for break-even round (1x multiplier)', () => {
      const fixedRng: Rng = {
        random: () => 0.6, // Second outcome (1x multiplier)
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.outcome.betAmount, '10');
      assert.equal(round.outcome.payout, '10');
      assert.equal(round.outcome.profitLoss, '0');
      assert.equal(round.endedBalance, '1000');
    });

    it('should calculate correct balance for winning round (2x multiplier)', () => {
      const fixedRng: Rng = {
        random: () => 0.9, // Third outcome (2x multiplier)
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.outcome.betAmount, '10');
      assert.equal(round.outcome.payout, '20');
      assert.equal(round.outcome.profitLoss, '10');
      assert.equal(round.endedBalance, '1010');
    });

    it('should handle fractional wagers', () => {
      const fixedRng: Rng = {
        random: () => 0.9, // 2x multiplier
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '5.50',
        startingBalance: '100.25',
        rng: fixedRng,
      });

      assert.equal(round.outcome.betAmount, '5.5');
      assert.equal(round.outcome.payout, '11');
      assert.equal(round.outcome.profitLoss, '5.5');
      assert.equal(round.endedBalance, '105.75');
    });
  });

  describe('Input validation', () => {
    it('should throw on insufficient balance', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      assert.throws(
        () =>
          spin({
            slotName: 'test',
            wager: '100',
            startingBalance: '50',
            rng: fixedRng,
          }),
        {
          message: /Insufficient balance/,
        }
      );
    });

    it('should throw on zero wager', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      assert.throws(
        () =>
          spin({
            slotName: 'test',
            wager: '0',
            startingBalance: '100',
            rng: fixedRng,
          }),
        {
          message: /wager must be > 0/,
        }
      );
    });

    it('should throw on negative wager', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      assert.throws(
        () =>
          spin({
            slotName: 'test',
            wager: '-10',
            startingBalance: '100',
            rng: fixedRng,
          }),
        {
          message: /wager must be > 0/,
        }
      );
    });

    it('should throw on negative balance', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      assert.throws(
        () =>
          spin({
            slotName: 'test',
            wager: '10',
            startingBalance: '-100',
            rng: fixedRng,
          }),
        {
          message: /startingBalance must be non-negative/,
        }
      );
    });

    it('should throw on invalid numeric strings', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      assert.throws(
        () =>
          spin({
            slotName: 'test',
            wager: 'not-a-number',
            startingBalance: '100',
            rng: fixedRng,
          }),
        {
          message: /wager must be a valid number/,
        }
      );
    });
  });

  describe('Round structure', () => {
    it('should return complete Round object with all fields', () => {
      const fixedRng: Rng = {
        random: () => 0.6,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        roundSeed: 'test-seed',
        rng: fixedRng,
      });

      // Check Round structure
      assert.ok(round.id);
      assert.equal(typeof round.id, 'string');
      assert.equal(round.slotName, 'test');
      assert.equal(round.startedBalance, '1000');
      assert.ok(round.endedBalance);
      assert.ok(round.timestamp);

      // Check RoundOutcome structure
      assert.ok(round.outcome);
      assert.equal(typeof round.outcome.key, 'string');
      assert.equal(typeof round.outcome.roll, 'number');
      assert.equal(typeof round.outcome.multiplier, 'string');
      assert.equal(typeof round.outcome.betAmount, 'string');
      assert.equal(typeof round.outcome.payout, 'string');
      assert.equal(typeof round.outcome.profitLoss, 'string');

      // Check RoundRngInfo structure
      assert.ok(round.rng);
      assert.equal(round.rng.roundSeed, 'test-seed');
      assert.equal(typeof round.rng.roll, 'number');
    });

    it('should generate unique IDs for each round', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round1 = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      const round2 = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.notEqual(round1.id, round2.id);
    });

    it('should include ISO timestamp', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      // Verify timestamp is valid ISO format
      const date = new Date(round.timestamp);
      assert.ok(!isNaN(date.getTime()));
      assert.equal(round.timestamp, date.toISOString());
    });
  });

  describe('RNG seed handling', () => {
    it('should use roundSeed when provided', () => {
      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        roundSeed: 'my-round-seed',
      });

      assert.equal(round.rng.roundSeed, 'my-round-seed');
    });

    it('should handle null roundSeed', () => {
      const fixedRng: Rng = {
        random: () => 0.0,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        roundSeed: null,
        rng: fixedRng,
      });

      assert.equal(round.rng.roundSeed, null);
    });

    it('should record the roll value in RNG info', () => {
      const fixedRng: Rng = {
        random: () => 0.12345,
        int: (min, max) => min,
        float: (min, max) => min,
        pick: (arr) => arr[0],
        shuffle: (arr) => [...arr],
      };

      const round = spin({
        slotName: 'test',
        wager: '10',
        startingBalance: '1000',
        rng: fixedRng,
      });

      assert.equal(round.outcome.roll, 0.12345);
      assert.equal(round.rng.roll, 0.12345);
    });
  });
});
