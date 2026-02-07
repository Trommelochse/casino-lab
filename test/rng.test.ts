import 'dotenv/config';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, getConfiguredSeed } from '../src/services/rng.js';

describe('RNG Service', () => {
  describe('Determinism', () => {
    it('should produce identical sequences with same seed', () => {
      const seed = 'test-seed-123';
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      // Test random()
      for (let i = 0; i < 10; i++) {
        assert.equal(rng1.random(), rng2.random());
      }
    });

    it('should produce identical int() sequences with same seed', () => {
      const seed = 'test-seed-456';
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      // Test int()
      for (let i = 0; i < 20; i++) {
        const val1 = rng1.int(1, 100);
        const val2 = rng2.int(1, 100);
        assert.equal(val1, val2);
      }
    });

    it('should produce identical float() sequences with same seed', () => {
      const seed = 'test-seed-789';
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      // Test float()
      for (let i = 0; i < 15; i++) {
        const val1 = rng1.float(0, 100);
        const val2 = rng2.float(0, 100);
        assert.equal(val1, val2);
      }
    });

    it('should produce identical pick() sequences with same seed', () => {
      const seed = 'test-seed-pick';
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      const arr = ['a', 'b', 'c', 'd', 'e'];

      // Test pick()
      for (let i = 0; i < 10; i++) {
        const val1 = rng1.pick(arr);
        const val2 = rng2.pick(arr);
        assert.equal(val1, val2);
      }
    });

    it('should produce identical shuffle() sequences with same seed', () => {
      const seed = 'test-seed-shuffle';
      const rng1 = createRng(seed);
      const rng2 = createRng(seed);

      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      // Test shuffle()
      for (let i = 0; i < 5; i++) {
        const shuffled1 = rng1.shuffle(arr);
        const shuffled2 = rng2.shuffle(arr);
        assert.deepEqual(shuffled1, shuffled2);
      }
    });
  });

  describe('Non-determinism sanity check', () => {
    it('should produce different sequences without seed', () => {
      const rng1 = createRng();
      const rng2 = createRng();

      // Generate sequences
      const seq1 = Array.from({ length: 10 }, () => rng1.random());
      const seq2 = Array.from({ length: 10 }, () => rng2.random());

      // At least one value should differ (extremely unlikely to be all same)
      const allSame = seq1.every((val, idx) => val === seq2[idx]);
      assert.equal(allSame, false, 'Expected at least one difference in sequences');
    });

    it('should produce different int sequences without seed', () => {
      const rng1 = createRng();
      const rng2 = createRng();

      // Generate sequences
      const seq1 = Array.from({ length: 10 }, () => rng1.int(1, 1000));
      const seq2 = Array.from({ length: 10 }, () => rng2.int(1, 1000));

      // At least one value should differ
      const allSame = seq1.every((val, idx) => val === seq2[idx]);
      assert.equal(allSame, false, 'Expected at least one difference in int sequences');
    });
  });

  describe('random()', () => {
    it('should return values in [0, 1)', () => {
      const rng = createRng('test');

      for (let i = 0; i < 100; i++) {
        const val = rng.random();
        assert.ok(val >= 0, `Expected >= 0, got ${val}`);
        assert.ok(val < 1, `Expected < 1, got ${val}`);
      }
    });
  });

  describe('int()', () => {
    it('should return integers in specified range', () => {
      const rng = createRng('test-int');

      for (let i = 0; i < 100; i++) {
        const val = rng.int(5, 10);
        assert.ok(Number.isInteger(val), `Expected integer, got ${val}`);
        assert.ok(val >= 5, `Expected >= 5, got ${val}`);
        assert.ok(val <= 10, `Expected <= 10, got ${val}`);
      }
    });

    it('should handle single-value range', () => {
      const rng = createRng('test-single');

      for (let i = 0; i < 10; i++) {
        const val = rng.int(42, 42);
        assert.equal(val, 42);
      }
    });

    it('should throw on non-integer min', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.int(1.5, 10),
        { message: 'min and max must be integers' }
      );
    });

    it('should throw on non-integer max', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.int(1, 10.5),
        { message: 'min and max must be integers' }
      );
    });

    it('should throw on non-finite values', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.int(NaN, 10),
        { message: 'min and max must be finite numbers' }
      );
      assert.throws(
        () => rng.int(1, Infinity),
        { message: 'min and max must be finite numbers' }
      );
    });

    it('should throw when max < min', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.int(10, 5),
        { message: 'max must be >= min' }
      );
    });
  });

  describe('float()', () => {
    it('should return floats in specified range', () => {
      const rng = createRng('test-float');

      for (let i = 0; i < 100; i++) {
        const val = rng.float(5.0, 10.0);
        assert.ok(val >= 5.0, `Expected >= 5.0, got ${val}`);
        assert.ok(val < 10.0, `Expected < 10.0, got ${val}`);
      }
    });

    it('should handle very small ranges', () => {
      const rng = createRng('test-small');

      for (let i = 0; i < 10; i++) {
        const val = rng.float(0.0, 0.001);
        assert.ok(val >= 0.0, `Expected >= 0.0, got ${val}`);
        assert.ok(val < 0.001, `Expected < 0.001, got ${val}`);
      }
    });

    it('should throw on non-finite values', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.float(NaN, 10),
        { message: 'min and max must be finite numbers' }
      );
      assert.throws(
        () => rng.float(1, Infinity),
        { message: 'min and max must be finite numbers' }
      );
    });

    it('should throw when max <= min', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.float(10, 10),
        { message: 'max must be > min' }
      );
      assert.throws(
        () => rng.float(10, 5),
        { message: 'max must be > min' }
      );
    });
  });

  describe('pick()', () => {
    it('should pick elements from array', () => {
      const rng = createRng('test-pick');
      const arr = ['a', 'b', 'c', 'd', 'e'];

      for (let i = 0; i < 50; i++) {
        const picked = rng.pick(arr);
        assert.ok(arr.includes(picked), `Picked value "${picked}" not in array`);
      }
    });

    it('should pick from single-element array', () => {
      const rng = createRng('test-single-pick');
      const arr = ['only'];

      for (let i = 0; i < 10; i++) {
        assert.equal(rng.pick(arr), 'only');
      }
    });

    it('should throw on empty array', () => {
      const rng = createRng('test');
      assert.throws(
        () => rng.pick([]),
        { message: 'Cannot pick from empty array' }
      );
    });

    it('should eventually pick all elements (statistical)', () => {
      const rng = createRng('test-coverage');
      const arr = ['a', 'b', 'c'];
      const picked = new Set<string>();

      // Pick many times - should eventually get all elements
      for (let i = 0; i < 100; i++) {
        picked.add(rng.pick(arr));
      }

      assert.equal(picked.size, 3, 'Expected to pick all elements eventually');
      assert.ok(picked.has('a'));
      assert.ok(picked.has('b'));
      assert.ok(picked.has('c'));
    });
  });

  describe('shuffle()', () => {
    it('should return new array without mutating original', () => {
      const rng = createRng('test-shuffle');
      const arr = [1, 2, 3, 4, 5];
      const original = [...arr];

      const shuffled = rng.shuffle(arr);

      // Original should be unchanged
      assert.deepEqual(arr, original);
      // Should be a new array
      assert.notEqual(shuffled, arr);
    });

    it('should contain same elements', () => {
      const rng = createRng('test-shuffle-elements');
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const shuffled = rng.shuffle(arr);

      assert.equal(shuffled.length, arr.length);
      // Same elements, possibly different order
      const sortedOriginal = [...arr].sort((a, b) => a - b);
      const sortedShuffled = [...shuffled].sort((a, b) => a - b);
      assert.deepEqual(sortedShuffled, sortedOriginal);
    });

    it('should handle empty array', () => {
      const rng = createRng('test-empty-shuffle');
      const arr: number[] = [];

      const shuffled = rng.shuffle(arr);

      assert.deepEqual(shuffled, []);
    });

    it('should handle single-element array', () => {
      const rng = createRng('test-single-shuffle');
      const arr = [42];

      const shuffled = rng.shuffle(arr);

      assert.deepEqual(shuffled, [42]);
    });

    it('should produce different orders with different seeds', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const shuffled1 = createRng('seed1').shuffle(arr);
      const shuffled2 = createRng('seed2').shuffle(arr);

      // Different seeds should produce different shuffles
      const allSame = shuffled1.every((val, idx) => val === shuffled2[idx]);
      assert.equal(allSame, false, 'Expected different shuffles with different seeds');
    });
  });

  describe('getConfiguredSeed()', () => {
    it('should return seed from environment if set', () => {
      // This test depends on .env file or environment setup
      // If RNG_SEED is not set, it should return null
      const seed = getConfiguredSeed();

      if (process.env.RNG_SEED) {
        assert.equal(typeof seed, 'string');
        assert.equal(seed, process.env.RNG_SEED.trim());
      } else {
        assert.equal(seed, null);
      }
    });
  });
});
