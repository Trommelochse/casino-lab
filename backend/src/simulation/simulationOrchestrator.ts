/**
 * Simulation orchestrator - Main entry point for hour tick simulation
 * Coordinates worker pool, batch operations, and state updates
 */

import { pool } from '../db/pool.js'
import { getPlayersByStatus, updatePlayerStatus } from '../services/playerService.js'
import { WorkerPool, calculateWorkerCount } from '../workers/workerPool.js'
import {
  batchInsertGameRounds,
  batchUpdatePlayers,
  updateCasinoState,
  batchUpdateSessions,
  PlayerUpdate
} from '../database/batchOperations.js'
import {
  shouldPlayerStartSession,
  selectVolatilityForSession,
  createSession
} from '../services/sessionService.js'
import { Session } from '../models/session.js'
import { Player } from '../models/player.js'
import { PlayerDNA } from '../services/playerService.js'
import { getConfiguredSeed } from '../services/rng.js'
import { GameRound } from '../models/gameRound.js'
import { SimulationSummary } from './types.js'
import { refreshCasinoState } from '../state/casinoState.js'
import { getWorldState, getHourSeed, getSimulationTimestamp, incrementWorldHour, refreshWorldState } from '../state/worldState.js'

/**
 * Advisory lock ID for world state operations
 */
const WORLD_STATE_LOCK_ID = 999;

/**
 * Validate preconditions before executing hour tick
 * Ensures no concurrent executions and world state is ready
 */
async function validateHourTickPreconditions(): Promise<void> {
  // Check 1: Acquire advisory lock to prevent concurrent ticks
  const lockResult = await pool.query<{ acquired: boolean }>(
    'SELECT pg_try_advisory_lock($1) AS acquired',
    [WORLD_STATE_LOCK_ID]
  );

  if (!lockResult.rows[0].acquired) {
    throw new Error('Another hour tick is in progress. Wait for completion.');
  }

  // Check 2: Verify no in-progress hour in log
  const logResult = await pool.query<{ hour: string }>(
    "SELECT hour FROM hour_execution_log WHERE status = 'in_progress'"
  );

  if (logResult.rows.length > 0) {
    throw new Error(
      `Hour ${logResult.rows[0].hour} is already in progress. Cannot start new hour tick.`
    );
  }
}

/**
 * Release advisory lock
 */
async function releaseAdvisoryLock(): Promise<void> {
  await pool.query('SELECT pg_advisory_unlock($1)', [WORLD_STATE_LOCK_ID]);
}

/**
 * Get or create active session for a player
 * Reuses existing active session or creates new one with slot volatility from DNA
 */
async function getOrCreateActiveSession(
  playerId: string,
  walletBalance: string,
  preferredVolatility: 'low' | 'medium' | 'high',
  simulationHour: bigint,
  simulationTimestamp: string
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
    `INSERT INTO sessions (player_id, initial_balance, slot_volatility, simulation_hour, simulation_timestamp, started_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     RETURNING *`,
    [playerId, walletBalance, preferredVolatility, simulationHour.toString(), simulationTimestamp]
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
 * 1. Load world state and validate preconditions
 * 2. Session Trigger Phase: Evaluate Idle players and create sessions
 * 3. Get all Active players (includes newly triggered)
 * 4. Get/create sessions for each player
 * 5. Distribute players to worker pool
 * 6. Execute simulation in parallel
 * 7. Aggregate results
 * 8. Batch update database (in transaction)
 * 9. Update casino state and world state
 * 10. Return summary
 *
 * @returns Summary of simulation results
 */
export async function simulateHourTick(): Promise<SimulationSummary> {
  // Load world state and validate
  const worldState = getWorldState();
  await validateHourTickPreconditions();

  // Start transaction for entire hour tick
  await pool.query('BEGIN')

  try {
    // Log hour execution start
    await pool.query(
      "INSERT INTO hour_execution_log (hour, status, started_at) VALUES ($1, 'in_progress', NOW())",
      [worldState.currentHour.toString()]
    );

    // ===== PHASE 1: SESSION TRIGGERING =====
    const idlePlayers = await getPlayersByStatus('Idle')
    const triggeredPlayerIds: string[] = []

    // Generate deterministic seed from world state
    const hourSeed = getHourSeed(worldState);
    const simulationTimestamp = getSimulationTimestamp(worldState);

    for (const player of idlePlayers) {
      try {
        // Check if player should start session
        if (await shouldPlayerStartSession(player, hourSeed)) {
          // Select slot volatility based on player DNA
          const volatility = selectVolatilityForSession(player)

          // Create session in database with simulation time
          await createSession({
            playerId: player.id,
            initialBalance: player.walletBalance,
            slotVolatility: volatility,
            simulationHour: worldState.currentHour,
            simulationTimestamp: simulationTimestamp
          })

          // Update player status to Active
          await updatePlayerStatus(player.id, 'Active')
          triggeredPlayerIds.push(player.id)
        }
      } catch (err) {
        // Log error but don't halt simulation
        console.error(`Failed to trigger session for player ${player.id}:`, err)
        // Player stays Idle, will retry next hour
      }
    }

    console.log(`Session trigger phase: ${triggeredPlayerIds.length}/${idlePlayers.length} players activated`)

    // ===== PHASE 2: MICRO-BET LOOPS =====
    // 1. Get all Active players (includes newly triggered)
    const activePlayers = await getPlayersByStatus('Active')

    if (activePlayers.length === 0) {
      // Log completed hour even with no active players
      await pool.query(
        `UPDATE hour_execution_log
         SET status = 'completed',
             completed_at = NOW(),
             sessions_triggered = $2,
             total_spins = 0,
             house_revenue = 0
         WHERE hour = $1`,
        [worldState.currentHour.toString(), triggeredPlayerIds.length]
      );

      // Increment world hour counter
      await incrementWorldHour();

      await pool.query('COMMIT')

      // Refresh world state cache
      const updatedWorldState = await refreshWorldState();

      return {
        message: 'No active players',
        currentHour: updatedWorldState.currentHour.toString(),
        simulationTime: new Date(
          new Date(updatedWorldState.simulationStartedAt).getTime() +
          Number(updatedWorldState.currentHour) * 3600000
        ).toISOString(),
        sessionsTriggered: triggeredPlayerIds.length,
        playersProcessed: 0,
        totalSpins: 0,
        houseRevenue: '0.00',
        playerStatuses: {
          active: 0,
          idle: triggeredPlayerIds.length,
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
        dna.preferredVolatility,
        worldState.currentHour,
        simulationTimestamp
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
        globalSeed,
        worldState.currentHour,
        simulationTimestamp
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

      // 6. Database operations (already in transaction from PHASE 1)
      // Insert all game rounds with simulation hour
      await batchInsertGameRounds(allRounds, worldState.currentHour)

      // Update all player states
      await batchUpdatePlayers(playerUpdates)

      // Close all sessions
      const sessionIds = sessions.map(s => s.id)
      const finalBalances = playerUpdates.map(u => u.balance)
      await batchUpdateSessions(sessionIds, finalBalances)

      // Update casino state
      const activeCount = playerUpdates.filter(u => u.status === 'Active').length
      await updateCasinoState(totalHouseRevenue.toFixed(2), activeCount)

      // Update hour execution log
      await pool.query(
        `UPDATE hour_execution_log
         SET status = 'completed',
             completed_at = NOW(),
             sessions_triggered = $2,
             total_spins = $3,
             house_revenue = $4
         WHERE hour = $1`,
        [
          worldState.currentHour.toString(),
          triggeredPlayerIds.length,
          allRounds.length,
          totalHouseRevenue.toFixed(2)
        ]
      );

      // Increment world hour counter
      await incrementWorldHour();

      // Commit transaction
      await pool.query('COMMIT')

      // Refresh in-memory caches after transaction commits
      await refreshCasinoState();
      const updatedWorldState = await refreshWorldState();

      // 7. Return summary with world state info
      return {
        message: 'Hour simulation completed',
        currentHour: updatedWorldState.currentHour.toString(),
        simulationTime: new Date(
          new Date(updatedWorldState.simulationStartedAt).getTime() +
          Number(updatedWorldState.currentHour) * 3600000
        ).toISOString(),
        sessionsTriggered: triggeredPlayerIds.length,
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
  } catch (error) {
    // Rollback entire hour tick on error
    await pool.query('ROLLBACK')

    // Log failed hour execution
    try {
      await pool.query(
        `UPDATE hour_execution_log
         SET status = 'failed',
             error = $2
         WHERE hour = $1`,
        [worldState.currentHour.toString(), (error as Error).message]
      );
    } catch (logError) {
      console.error('Failed to log hour execution error:', logError);
    }

    throw error
  } finally {
    // Always release advisory lock
    await releaseAdvisoryLock();
  }
}
