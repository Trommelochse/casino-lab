import { ArchetypeName } from './types.js'
import { Rng } from '../services/rng.js'

// Spins per hour ranges by archetype
export const SPINS_PER_HOUR: Record<ArchetypeName, { min: number; max: number }> = {
  'Recreational': { min: 60, max: 180 },     // Casual play, 1-3 spins/min
  'VIP': { min: 300, max: 600 },            // Aggressive, 5-10 spins/min
  'Bonus Hunter': { min: 150, max: 300 }    // Methodical, 2.5-5 spins/min
}

// Bet percentage of balance by archetype
export const BET_PERCENTAGE: Record<ArchetypeName, number> = {
  'Recreational': 0.005,   // 0.5% of balance (conservative)
  'VIP': 0.01,            // 1.0% of balance (aggressive)
  'Bonus Hunter': 0.008   // 0.8% of balance (calculated)
}

// Minimum bet by archetype
export const MIN_BET: Record<ArchetypeName, number> = {
  'Recreational': 0.10,
  'VIP': 0.50,
  'Bonus Hunter': 0.20
}

// Maximum bet by archetype
export const MAX_BET: Record<ArchetypeName, number> = {
  'Recreational': 1.00,
  'VIP': 5.00,
  'Bonus Hunter': 2.00
}

/**
 * Calculate number of spins for this hour based on archetype
 * Uses RNG for variation within archetype-specific ranges
 */
export function calculateSpinsPerHour(archetype: ArchetypeName, rng: Rng): number {
  const range = SPINS_PER_HOUR[archetype]
  return rng.int(range.min, range.max)
}

/**
 * Calculate initial bet amount as percentage of wallet balance
 * Constrained by archetype min/max
 */
export function calculateInitialBet(
  walletBalance: number,
  archetype: ArchetypeName
): number {
  const rawBet = walletBalance * BET_PERCENTAGE[archetype]
  const minBet = MIN_BET[archetype]
  const maxBet = MAX_BET[archetype]

  // Round to 2 decimal places
  return Math.round(Math.max(minBet, Math.min(maxBet, rawBet)) * 100) / 100
}

/**
 * Calculate next bet amount based on last result and bet flexibility
 * Conservative progression: increase only on wins (no martingale)
 *
 * @param currentBet - Current bet amount
 * @param lastResult - Result of last spin ('win' or 'loss')
 * @param betFlexibility - Player DNA trait (0.0-1.0)
 * @param minBet - Minimum allowed bet
 * @param maxBet - Maximum allowed bet
 */
export function calculateNextBet(
  currentBet: number,
  lastResult: 'win' | 'loss',
  betFlexibility: number,
  minBet: number,
  maxBet: number
): number {
  // Static betting (betFlexibility < 0.3)
  // Recreational and Bonus Hunters typically fall here
  if (betFlexibility < 0.3) {
    return currentBet
  }

  // Conservative dynamic betting (betFlexibility >= 0.7)
  // User preference: NO martingale - only increase on wins
  if (betFlexibility >= 0.7 && lastResult === 'win') {
    // VIPs increase bet by 10-30% after wins
    const increasePercent = 0.1 + (betFlexibility * 0.2)
    const newBet = currentBet * (1 + increasePercent)
    return Math.round(Math.max(minBet, Math.min(maxBet, newBet)) * 100) / 100
  }

  // Moderate flexibility (0.3-0.7): small increases on wins only
  if (betFlexibility >= 0.3 && lastResult === 'win') {
    const increasePercent = 0.05 + (betFlexibility * 0.1)
    const newBet = currentBet * (1 + increasePercent)
    return Math.round(Math.max(minBet, Math.min(maxBet, newBet)) * 100) / 100
  }

  // No change on losses or for low flexibility
  return currentBet
}
