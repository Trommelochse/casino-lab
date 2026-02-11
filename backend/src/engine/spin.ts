/**
 * Spin engine - deterministic slot game round execution
 */

import { randomUUID } from 'crypto';
import { getSlotModel } from '../slots/slotRegistry.js';
import { getGlobalRng, createRng, getConfiguredSeed, type Rng } from '../services/rng.js';
import type { Round, RoundOutcome, RoundRngInfo } from './types.js';

/**
 * Input parameters for spin function
 */
export type SpinInput = {
  slotName: string; // Slot model to use
  wager: string; // Bet amount as numeric string
  startingBalance: string; // Balance before spin
  roundSeed?: string | null; // Optional per-round seed for RNG
  rng?: Rng; // Optional RNG instance (else uses global or per-round)
  simulationTimestamp?: string; // Optional simulation timestamp (overrides wall-clock time)
};

/**
 * Format a number to a consistent numeric string
 * Uses 8 decimal places and trims trailing zeros
 */
function formatNumeric(n: number): string {
  return n.toFixed(8).replace(/\.?0+$/, '');
}

/**
 * Parse and validate a numeric string
 * @throws {Error} if invalid
 */
function parseNumeric(
  value: string,
  fieldName: string,
  allowZero: boolean = true
): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new Error(`${fieldName} must be a valid number, got: ${value}`);
  }
  if (allowZero && num < 0) {
    throw new Error(`${fieldName} must be non-negative, got: ${value}`);
  }
  if (!allowZero && num <= 0) {
    throw new Error(`${fieldName} must be > 0, got: ${value}`);
  }
  return num;
}

/**
 * Execute a single slot spin with full determinism
 * @throws {Error} if inputs are invalid or insufficient balance
 */
export function spin(input: SpinInput): Round {
  const { slotName, wager, startingBalance, roundSeed, rng: providedRng, simulationTimestamp } = input;

  // Step 1: Validate inputs
  const wagerNum = parseNumeric(wager, 'wager', false);

  const balanceNum = parseNumeric(startingBalance, 'startingBalance', true);

  if (wagerNum > balanceNum) {
    throw new Error(
      `Insufficient balance: wager ${wager} exceeds balance ${startingBalance}`
    );
  }

  // Step 2: Determine RNG and seeds
  const globalSeed = getConfiguredSeed();
  let effectiveRoundSeed: string | null = null;
  let rngForRound: Rng;

  if (roundSeed && roundSeed.trim() !== '') {
    // Use per-round seed
    effectiveRoundSeed = roundSeed.trim();
    rngForRound = createRng(effectiveRoundSeed);
  } else if (providedRng) {
    // Use provided RNG
    rngForRound = providedRng;
  } else {
    // Use global RNG
    rngForRound = getGlobalRng();
  }

  // Step 3: Roll
  const roll = rngForRound.random();

  // Step 4: Get slot model and perform cumulative lookup
  const model = getSlotModel(slotName);

  // Find first outcome where roll < cumP
  let selectedOutcome = model.outcomes.find((outcome) => roll < outcome.cumP);

  // Defensive: if none found (shouldn't happen with cumP=1.0), use last outcome
  if (!selectedOutcome) {
    selectedOutcome = model.outcomes[model.outcomes.length - 1];
  }

  // Step 5: Resolve multiplier
  const multiplier = selectedOutcome.multiplier;

  // Step 6: Compute payout and balance
  const payout = wagerNum * multiplier;
  const endedBalanceNum = balanceNum - wagerNum + payout;
  const profitLoss = payout - wagerNum;

  // Step 7: Construct Round
  const outcome: RoundOutcome = {
    key: selectedOutcome.key,
    roll,
    multiplier: formatNumeric(multiplier),
    betAmount: formatNumeric(wagerNum),
    payout: formatNumeric(payout),
    profitLoss: formatNumeric(profitLoss),
  };

  const rngInfo: RoundRngInfo = {
    globalSeed,
    roundSeed: effectiveRoundSeed,
    roll,
  };

  const round: Round = {
    id: randomUUID(),
    slotName,
    startedBalance: formatNumeric(balanceNum),
    endedBalance: formatNumeric(endedBalanceNum),
    timestamp: simulationTimestamp || new Date().toISOString(),
    outcome,
    rng: rngInfo,
  };

  return round;
}
