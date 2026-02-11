/**
 * Batch database operations for simulation engine
 * Optimized for high-volume inserts and updates (50k+ game rounds per hour tick)
 */

import { pool } from '../db/pool.js'
import { GameRound } from '../models/gameRound.js'
import { PlayerStatus } from '../models/player.js'

/**
 * Player update payload for batch operations
 */
export interface PlayerUpdate {
  id: string
  balance: string
  status: PlayerStatus
}

/**
 * Batch insert game rounds using multi-row INSERT statements
 * Handles PostgreSQL parameter limit (~1000) by batching into chunks of 140 rounds
 *
 * @param rounds - Array of game rounds to insert
 * @returns Promise that resolves when all rounds are inserted
 */
export async function batchInsertGameRounds(rounds: GameRound[]): Promise<void> {
  if (rounds.length === 0) return

  // PostgreSQL limit: ~1000 parameters per query
  // 7 params per round → batch size = 140 rounds (7 * 140 = 980)
  const BATCH_SIZE = 140

  for (let i = 0; i < rounds.length; i += BATCH_SIZE) {
    const batch = rounds.slice(i, i + BATCH_SIZE)

    // Build multi-row INSERT
    const values: any[] = []
    const placeholders: string[] = []

    batch.forEach((round, idx) => {
      const base = idx * 7
      placeholders.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
      )
      values.push(
        round.id,
        round.sessionId,
        round.betAmount,
        round.multiplier,
        round.payout,
        round.resultingBalance,
        round.occurredAt
      )
    })

    const query = `
      INSERT INTO game_rounds (
        id, session_id, bet_amount, multiplier, payout,
        resulting_balance, occurred_at
      )
      VALUES ${placeholders.join(', ')}
    `

    await pool.query(query, values)
  }
}

/**
 * Batch update players using PostgreSQL UNNEST for single-query updates
 * Updates wallet_balance, status, and updated_at for multiple players
 *
 * @param updates - Array of player updates (id, balance, status)
 * @returns Promise that resolves when all players are updated
 */
export async function batchUpdatePlayers(updates: PlayerUpdate[]): Promise<void> {
  if (updates.length === 0) return

  const ids = updates.map(u => u.id)
  const balances = updates.map(u => u.balance)
  const statuses = updates.map(u => u.status)

  const query = `
    UPDATE players
    SET
      wallet_balance = data.balance,
      status = data.status,
      updated_at = NOW()
    FROM (
      SELECT
        UNNEST($1::uuid[]) AS id,
        UNNEST($2::numeric[]) AS balance,
        UNNEST($3::text[]) AS status
    ) AS data
    WHERE players.id = data.id
  `

  await pool.query(query, [ids, balances, statuses])
}

/**
 * Update casino state singleton with aggregated revenue and player counts
 * Adds to house_revenue and sets active_player_count
 *
 * @param houseRevenue - Revenue to add (can be negative if house lost)
 * @param activePlayerCount - Current count of active players
 * @returns Promise that resolves when state is updated
 */
export async function updateCasinoState(
  houseRevenue: string,
  activePlayerCount: number
): Promise<void> {
  const query = `
    UPDATE casino_state
    SET
      house_revenue = house_revenue + $1::numeric,
      active_player_count = $2,
      updated_at = NOW()
    WHERE id = 1
  `

  await pool.query(query, [houseRevenue, activePlayerCount])
}

/**
 * Batch update sessions to mark them as ended
 * Sets ended_at timestamp and final_balance for multiple sessions
 *
 * @param sessionIds - Array of session IDs to close
 * @param finalBalances - Corresponding final balances (same order as sessionIds)
 * @returns Promise that resolves when all sessions are updated
 */
export async function batchUpdateSessions(
  sessionIds: string[],
  finalBalances: string[]
): Promise<void> {
  if (sessionIds.length === 0) return

  if (sessionIds.length !== finalBalances.length) {
    throw new Error('sessionIds and finalBalances arrays must have same length')
  }

  const query = `
    UPDATE sessions
    SET
      ended_at = NOW(),
      final_balance = data.final_balance,
      updated_at = NOW()
    FROM (
      SELECT
        UNNEST($1::uuid[]) AS id,
        UNNEST($2::numeric[]) AS final_balance
    ) AS data
    WHERE sessions.id = data.id
  `

  await pool.query(query, [sessionIds, finalBalances])
}
