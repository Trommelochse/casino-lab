import { GameRound } from '../models/gameRound.js'
import { PlayerStatus } from '../models/player.js'
import { PlayerDNA } from '../services/playerService.js'
import { spin } from '../engine/spin.js'
import {
  MicroBetLoopInput,
  MicroBetLoopResult,
  ArchetypeName
} from './types.js'
import {
  MIN_BET,
  MAX_BET,
  calculateInitialBet,
  calculateNextBet
} from './betCalculator.js'

/**
 * Execute micro-bet loop for a single player's hour of play
 *
 * Core simulation logic that:
 * 1. Determines initial bet from balance
 * 2. Executes N spins (spinsPerHour)
 * 3. Applies bet progression (conservative - wins only)
 * 4. Checks exit conditions (broke, stop-loss, profit goal)
 * 5. Accumulates game rounds for batch insert
 * 6. Returns final balance and status
 *
 * @param input - Player, session, spin count, and RNG
 * @returns Final balance, status, rounds, and exit reason
 */
export function executeMicroBetLoop(input: MicroBetLoopInput): MicroBetLoopResult {
  const { player, session, spinsPerHour, rng, simulationTimestamp } = input
  const dna = player.dnaTraits as PlayerDNA
  const archetype = player.archetype as ArchetypeName

  // Initialize balance tracking
  let currentBalance = parseFloat(player.walletBalance)
  const startingBalance = currentBalance

  // Calculate bet constraints
  const minBet = MIN_BET[archetype]
  const maxBet = MAX_BET[archetype]
  let currentBet = calculateInitialBet(currentBalance, archetype)

  // Get slot model from session volatility
  const slotName = session.slotVolatility

  // Defensive check: session must have volatility set
  if (slotName === null) {
    throw new Error(`Session ${session.id} has null slotVolatility - cannot execute simulation`)
  }

  // Accumulate rounds in memory
  const rounds: GameRound[] = []
  let exitReason: 'spins_exhausted' | 'broke' | 'profit_goal' | 'stop_loss' = 'spins_exhausted'

  // Main spin loop
  for (let i = 0; i < spinsPerHour; i++) {
    // Exit condition 1: Insufficient balance (broke)
    if (currentBalance < minBet) {
      exitReason = 'broke'
      break
    }

    // Exit condition 2: Stop-loss hit
    if (currentBalance < startingBalance) {
      const lossPercent = (startingBalance - currentBalance) / startingBalance
      if (lossPercent >= dna.stopLossLimit) {
        exitReason = 'stop_loss'
        break
      }
    }

    // Exit condition 3: Profit goal achieved (if defined)
    if (dna.profitGoal !== null && currentBalance > startingBalance) {
      const profitMultiplier = currentBalance / startingBalance
      if (profitMultiplier >= dna.profitGoal) {
        exitReason = 'profit_goal'
        break
      }
    }

    // Ensure bet doesn't exceed balance
    const actualBet = Math.min(currentBet, currentBalance)

    // Execute spin
    const spinResult = spin({
      slotName,
      wager: actualBet.toFixed(2),
      startingBalance: currentBalance.toFixed(2),
      rng,
      simulationTimestamp
    })

    // Update balance immediately (in-memory mutation)
    currentBalance = parseFloat(spinResult.endedBalance)

    // Store round for batch insert
    rounds.push({
      id: spinResult.id,
      sessionId: session.id,
      betAmount: spinResult.outcome.betAmount,
      multiplier: spinResult.outcome.multiplier,
      payout: spinResult.outcome.payout,
      resultingBalance: spinResult.endedBalance,
      occurredAt: spinResult.timestamp,
      createdAt: spinResult.timestamp
    })

    // Calculate next bet (conservative progression)
    const wasWin = parseFloat(spinResult.outcome.profitLoss) > 0
    currentBet = calculateNextBet(
      actualBet,
      wasWin ? 'win' : 'loss',
      dna.betFlexibility,
      minBet,
      maxBet
    )
  }

  // Determine final status
  const finalStatus: PlayerStatus = currentBalance < minBet ? 'Broke' : 'Idle'

  return {
    rounds,
    finalBalance: currentBalance.toFixed(2),
    finalStatus,
    exitReason
  }
}
