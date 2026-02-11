/**
 * Simulation orchestrator - Main entry point for hour tick simulation
 * Coordinates worker pool, batch operations, and state updates
 */

import { pool } from '../db/pool.js'
import { getPlayersByStatus } from '../services/playerService.js'
import { WorkerPool, calculateWorkerCount } from '../workers/workerPool.js'
import {
  batchInsertGameRounds,
  batchUpdatePlayers,
  updateCasinoState,
  batchUpdateSessions,
  PlayerUpdate
} from '../database/batchOperations.js'
import { Session } from '../models/session.js'
import { Player } from '../models/player.js'
import { PlayerDNA } from '../services/playerService.js'
import { getConfiguredSeed } from '../services/rng.js'
import { GameRound } from '../models/gameRound.js'

/**
 * Summary returned by hour simulation
 */
export interface SimulationSummary {
  message: string
  playersProcessed: number
  totalSpins: number
  houseRevenue: string
  playerStatuses?: {
    active: number
    idle: number
    broke: number
  }
}

/**
 * Get or create active session for a player
 * Reuses existing active session or creates new one with slot volatility from DNA
 */
async function getOrCreateActiveSession(
  playerId: string,
  walletBalance: string,
  preferredVolatility: 'low' | 'medium' | 'high'
): Promise<Session> {
  // Check for existing active session (ended_at IS NULL)
  const existingResult = await pool.query(
    `SELECT * FROM sessions
     WHERE player_id = $1 AND ended_at IS NULL
     ORDER BY started_at DESC LIMIT 1`,
    [playerId]
  )

  if (existingResult.rows.length > 0) {
    const row = existingResult.rows[0]
    return {
      id: row.id,
      playerId: row.player_id,
      initialBalance: row.initial_balance,
      finalBalance: row.final_balance,
      slotVolatility: row.slot_volatility,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }
  }

  // Create new session
  const result = await pool.query(
    `INSERT INTO sessions (player_id, initial_balance, slot_volatility, started_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [playerId, walletBalance, preferredVolatility]
  )

  const row = result.rows[0]
  return {
    id: row.id,
    playerId: row.player_id,
    initialBalance: row.initial_balance,
    finalBalance: row.final_balance,
    slotVolatility: row.slot_volatility,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

/**
 * Execute one hour tick of simulation
 *
 * Flow:
 * 1. Get all Active players
 * 2. Get/create sessions for each player
 * 3. Distribute players to worker pool
 * 4. Execute simulation in parallel
 * 5. Aggregate results
 * 6. Batch update database (in transaction)
 * 7. Update casino state
 * 8. Return summary
 *
 * @returns Summary of simulation results
 */
export async function simulateHourTick(): Promise<SimulationSummary> {
  // 1. Get all Active players
  const activePlayers = await getPlayersByStatus('Active')

  if (activePlayers.length === 0) {
    return {
      message: 'No active players',
      playersProcessed: 0,
      totalSpins: 0,
      houseRevenue: '0.00',
      playerStatuses: {
        active: 0,
        idle: 0,
        broke: 0
      }
    }
  }

  // 2. Get/create sessions for each player
  const sessions: Session[] = []
  for (const player of activePlayers) {
    const dna = player.dnaTraits as PlayerDNA
    const session = await getOrCreateActiveSession(
      player.id,
      player.walletBalance,
      dna.preferredVolatility
    )
    sessions.push(session)
  }

  // 3. Initialize worker pool
  const workerCount = calculateWorkerCount(activePlayers.length)
  const workerPool = new WorkerPool(workerCount)

  try {
    // 4. Execute simulation in workers
    const globalSeed = getConfiguredSeed() || 'default-seed'
    const workerResults = await workerPool.executeSimulation(
      activePlayers,
      sessions,
      globalSeed
    )

    // 5. Aggregate results from all workers
    const allRounds: GameRound[] = []
    const playerUpdates: PlayerUpdate[] = []
    let totalHouseRevenue = 0

    for (const workerResult of workerResults) {
      for (const playerResult of workerResult.results) {
        // Collect game rounds
        allRounds.push(...playerResult.rounds)

        // Collect player updates
        playerUpdates.push({
          id: playerResult.playerId,
          balance: playerResult.finalBalance,
          status: playerResult.finalStatus
        })

        // Calculate house revenue
        // House revenue = sum of all bets - sum of all payouts
        for (const round of playerResult.rounds) {
          const betAmount = parseFloat(round.betAmount)
          const payout = parseFloat(round.payout)
          totalHouseRevenue += (betAmount - payout)
        }
      }
    }

    // 6. Database operations in transaction
    await pool.query('BEGIN')

    try {
      // Insert all game rounds
      await batchInsertGameRounds(allRounds)

      // Update all player states
      await batchUpdatePlayers(playerUpdates)

      // Close all sessions
      const sessionIds = sessions.map(s => s.id)
      const finalBalances = playerUpdates.map(u => u.balance)
      await batchUpdateSessions(sessionIds, finalBalances)

      // Update casino state
      const activeCount = playerUpdates.filter(u => u.status === 'Active').length
      await updateCasinoState(totalHouseRevenue.toFixed(2), activeCount)

      await pool.query('COMMIT')
    } catch (err) {
      await pool.query('ROLLBACK')
      throw err
    }

    // 7. Return summary
    return {
      message: 'Hour simulation completed',
      playersProcessed: activePlayers.length,
      totalSpins: allRounds.length,
      houseRevenue: totalHouseRevenue.toFixed(2),
      playerStatuses: {
        active: playerUpdates.filter(u => u.status === 'Active').length,
        idle: playerUpdates.filter(u => u.status === 'Idle').length,
        broke: playerUpdates.filter(u => u.status === 'Broke').length
      }
    }
  } finally {
    // 8. Cleanup - always shutdown worker pool
    await workerPool.shutdown()
  }
}
