/**
 * Seeded RNG service for deterministic simulations
 * Server-only module - do not expose to frontend
 */

import seedrandom from 'seedrandom';

/**
 * RNG interface providing various random number generation utilities
 */
export type Rng = {
  /** Generate a random float in [0, 1) */
  random(): number;

  /** Generate a random integer in [minInclusive, maxInclusive] */
  int(minInclusive: number, maxInclusive: number): number;

  /** Generate a random float in [minInclusive, maxExclusive) */
  float(minInclusive: number, maxExclusive: number): number;

  /** Pick a random element from an array */
  pick<T>(arr: readonly T[]): T;

  /** Shuffle an array (returns new array, does not mutate) */
  shuffle<T>(arr: readonly T[]): T[];
};

/**
 * Create a new RNG instance
 * @param seed - Optional seed string for deterministic generation
 * @returns RNG instance
 */
export function createRng(seed?: string | null): Rng {
  // Create seeded or unseeded PRNG
  const prng = seed ? seedrandom(seed) : seedrandom();

  return {
    random(): number {
      return prng();
    },

    int(minInclusive: number, maxInclusive: number): number {
      // Validate inputs
      if (!Number.isFinite(minInclusive) || !Number.isFinite(maxInclusive)) {
        throw new Error('min and max must be finite numbers');
      }

      if (!Number.isInteger(minInclusive) || !Number.isInteger(maxInclusive)) {
        throw new Error('min and max must be integers');
      }

      if (maxInclusive < minInclusive) {
        throw new Error('max must be >= min');
      }

      // Generate random integer in range [min, max]
      const range = maxInclusive - minInclusive + 1;
      return minInclusive + Math.floor(prng() * range);
    },

    float(minInclusive: number, maxExclusive: number): number {
      // Validate inputs
      if (!Number.isFinite(minInclusive) || !Number.isFinite(maxExclusive)) {
        throw new Error('min and max must be finite numbers');
      }

      if (maxExclusive <= minInclusive) {
        throw new Error('max must be > min');
      }

      // Generate random float in range [min, max)
      const range = maxExclusive - minInclusive;
      return minInclusive + prng() * range;
    },

    pick<T>(arr: readonly T[]): T {
      if (arr.length === 0) {
        throw new Error('Cannot pick from empty array');
      }

      const index = this.int(0, arr.length - 1);
      return arr[index];
    },

    shuffle<T>(arr: readonly T[]): T[] {
      // Create a copy to avoid mutation
      const result = [...arr];

      // Fisher-Yates shuffle
      for (let i = result.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        // Swap elements
        [result[i], result[j]] = [result[j], result[i]];
      }

      return result;
    },
  };
}

/**
 * Get the configured seed from environment
 * @returns Trimmed seed string or null if not configured
 */
export function getConfiguredSeed(): string | null {
  const seed = process.env.RNG_SEED;
  if (!seed || seed.trim() === '') {
    return null;
  }
  return seed.trim();
}

// Global RNG singleton
let globalRng: Rng | null = null;

/**
 * Get the global RNG instance (singleton)
 * Uses RNG_SEED from environment if available
 * @returns Global RNG instance
 */
export function getGlobalRng(): Rng {
  if (!globalRng) {
    const seed = getConfiguredSeed();
    globalRng = createRng(seed);
  }
  return globalRng;
}
