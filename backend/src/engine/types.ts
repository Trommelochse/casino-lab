/**
 * Spin engine types
 * Defines the structure of a Round and its components
 */

/**
 * Outcome of a single round (bet/spin)
 */
export type RoundOutcome = {
  key: string; // Outcome identifier (e.g., "2.00")
  roll: number; // RNG roll value in [0, 1)
  multiplier: string; // Win multiplier as numeric string
  betAmount: string; // Wager amount as numeric string
  payout: string; // Total payout (betAmount * multiplier)
  profitLoss: string; // Net profit/loss (payout - betAmount)
};

/**
 * RNG information for reproducibility
 */
export type RoundRngInfo = {
  globalSeed: string | null; // Global RNG seed from environment
  roundSeed: string | null; // Per-round seed override
  roll: number; // The actual RNG roll used
};

/**
 * Complete round result
 */
export type Round = {
  id: string; // Unique round identifier (UUID v4)
  slotName: string; // Slot model used
  startedBalance: string; // Balance before the round
  endedBalance: string; // Balance after the round
  timestamp: string; // ISO timestamp when round occurred
  outcome: RoundOutcome; // Detailed outcome information
  rng: RoundRngInfo; // RNG information for debugging/reproducibility
};
