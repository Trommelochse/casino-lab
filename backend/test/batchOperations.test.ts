import 'dotenv/config'
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { pool } from '../src/db/pool.js'
import {
  batchInsertGameRounds,
  batchUpdatePlayers,
  updateCasinoState,
  batchUpdateSessions
} from '../src/database/batchOperations.js'
import { GameRound } from '../src/models/gameRound.js'
import { PlayerUpdate } from '../src/database/batchOperations.js'

describe('Batch Operations', () => {
  // Test data IDs
  let testPlayerIds: string[] = []
  let testSessionIds: string[] = []

  // Clean up after all tests
  after(async () => {
    // Delete test data
    if (testSessionIds.length > 0) {
      await pool.query('DELETE FROM game_rounds WHERE session_id = ANY($1)', [testSessionIds])
      await pool.query('DELETE FROM sessions WHERE id = ANY($1)', [testSessionIds])
    }
    if (testPlayerIds.length > 0) {
      await pool.query('DELETE FROM players WHERE id = ANY($1)', [testPlayerIds])
    }
    await pool.end()
  })

  describe('batchInsertGameRounds', () => {
    it('should insert small batch of game rounds (< 140)', async () => {
      // Create test player and session
      const playerId = randomUUID()
      const sessionId = randomUUID()
      testPlayerIds.push(playerId)
      testSessionIds.push(sessionId)

      await pool.query(
        `INSERT INTO players (id, archetype, wallet_balance, remaining_capital,
         lifetime_pl, status, dna_traits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [playerId, 'Recreational', '100.00', '500.00', '0.00', 'Active', '{}']
      )

      await pool.query(
        `INSERT INTO sessions (id, player_id, initial_balance, slot_volatility, simulation_hour, simulation_timestamp, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, playerId, '100.00', 'medium', '0', new Date().toISOString()]
      )

      // Create 10 test rounds
      const rounds: GameRound[] = []
      for (let i = 0; i < 10; i++) {
        rounds.push({
          id: randomUUID(),
          sessionId,
          betAmount: '1.00',
          multiplier: i % 2 === 0 ? '0.00' : '2.00',
          payout: i % 2 === 0 ? '0.00' : '2.00',
          resultingBalance: '100.00',
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      }

      // Insert batch
      await batchInsertGameRounds(rounds, BigInt(0))

      // Verify insertion
      const result = await pool.query(
        'SELECT COUNT(*) FROM game_rounds WHERE session_id = $1',
        [sessionId]
      )
      assert.strictEqual(result.rows[0].count, '10')
    })

    it('should insert large batch of game rounds (> 140)', async () => {
      // Create test player and session
      const playerId = randomUUID()
      const sessionId = randomUUID()
      testPlayerIds.push(playerId)
      testSessionIds.push(sessionId)

      await pool.query(
        `INSERT INTO players (id, archetype, wallet_balance, remaining_capital,
         lifetime_pl, status, dna_traits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [playerId, 'VIP', '1000.00', '5000.00', '0.00', 'Active', '{}']
      )

      await pool.query(
        `INSERT INTO sessions (id, player_id, initial_balance, slot_volatility, simulation_hour, simulation_timestamp, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, playerId, '1000.00', 'high', '0', new Date().toISOString()]
      )

      // Create 500 test rounds (will be split into 4 batches of 140, 140, 140, 80)
      const rounds: GameRound[] = []
      for (let i = 0; i < 500; i++) {
        rounds.push({
          id: randomUUID(),
          sessionId,
          betAmount: '5.00',
          multiplier: i % 10 === 0 ? '10.00' : '0.00',
          payout: i % 10 === 0 ? '50.00' : '0.00',
          resultingBalance: '1000.00',
          occurredAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        })
      }

      // Insert batch
      await batchInsertGameRounds(rounds, BigInt(0))

      // Verify insertion
      const result = await pool.query(
        'SELECT COUNT(*) FROM game_rounds WHERE session_id = $1',
        [sessionId]
      )
      assert.strictEqual(result.rows[0].count, '500')
    })

    it('should handle empty array gracefully', async () => {
      // Should not throw
      await batchInsertGameRounds([], BigInt(0))
    })

    it('should insert rounds with correct field values', async () => {
      // Create test player and session
      const playerId = randomUUID()
      const sessionId = randomUUID()
      testPlayerIds.push(playerId)
      testSessionIds.push(sessionId)

      await pool.query(
        `INSERT INTO players (id, archetype, wallet_balance, remaining_capital,
         lifetime_pl, status, dna_traits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [playerId, 'Recreational', '100.00', '500.00', '0.00', 'Active', '{}']
      )

      await pool.query(
        `INSERT INTO sessions (id, player_id, initial_balance, slot_volatility, simulation_hour, simulation_timestamp, started_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [sessionId, playerId, '100.00', 'low', '0', new Date().toISOString()]
      )

      const roundId = randomUUID()
      const rounds: GameRound[] = [
        {
          id: roundId,
          sessionId,
          betAmount: '2.50',
          multiplier: '5.00',
          payout: '12.50',
          resultingBalance: '110.00',
          occurredAt: '2025-01-01T12:00:00.000Z',
          createdAt: '2025-01-01T12:00:00.000Z'
        }
      ]

      await batchInsertGameRounds(rounds, BigInt(0))

      // Verify field values
      const result = await pool.query(
        'SELECT * FROM game_rounds WHERE id = $1',
        [roundId]
      )

      const row = result.rows[0]
      assert.strictEqual(row.id, roundId)
      assert.strictEqual(row.session_id, sessionId)
      assert.strictEqual(row.bet_amount, '2.50')
      assert.strictEqual(row.multiplier, '5.00')
      assert.strictEqual(row.payout, '12.50')
      assert.strictEqual(row.resulting_balance, '110.00')
    })
  })

  describe('batchUpdatePlayers', () => {
    it('should update multiple players in single query', async () => {
      // Create 3 test players
      const player1 = randomUUID()
      const player2 = randomUUID()
      const player3 = randomUUID()
      testPlayerIds.push(player1, player2, player3)

      for (const id of [player1, player2, player3]) {
        await pool.query(
          `INSERT INTO players (id, archetype, wallet_balance, remaining_capital,
           lifetime_pl, status, dna_traits)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, 'Recreational', '100.00', '500.00', '0.00', 'Active', '{}']
        )
      }

      // Update all players
      const updates: PlayerUpdate[] = [
        { id: player1, balance: '150.00', status: 'Idle' },
        { id: player2, balance: '75.50', status: 'Idle' },
        { id: player3, balance: '0.05', status: 'Broke' }
      ]

      await batchUpdatePlayers(updates)

      // Verify updates
      const result = await pool.query(
        'SELECT id, wallet_balance, status FROM players WHERE id = ANY($1) ORDER BY wallet_balance DESC',
        [[player1, player2, player3]]
      )

      assert.strictEqual(result.rows.length, 3)
      assert.strictEqual(result.rows[0].wallet_balance, '150.00')
      assert.strictEqual(result.rows[0].status, 'Idle')
      assert.strictEqual(result.rows[1].wallet_balance, '75.50')
      assert.strictEqual(result.rows[1].status, 'Idle')
      assert.strictEqual(result.rows[2].wallet_balance, '0.05')
      assert.strictEqual(result.rows[2].status, 'Broke')
    })

    it('should handle empty array gracefully', async () => {
      // Should not throw
      await batchUpdatePlayers([])
    })

    it('should update updated_at timestamp', async () => {
      // Create test player
      const playerId = randomUUID()
      testPlayerIds.push(playerId)

      await pool.query(
        `INSERT INTO players (id, archetype, wallet_balance, remaining_capital,
         lifetime_pl, status, dna_traits, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [playerId, 'VIP', '1000.00', '5000.00', '0.00', 'Active', '{}', '2020-01-01T00:00:00.000Z']
      )

      const oldTimestamp = await pool.query(
        'SELECT updated_at FROM players WHERE id = $1',
        [playerId]
      )

      // Wait a bit to ensure timestamp changes
      await new Promise(resolve => setTimeout(resolve, 10))

      // Update player
      await batchUpdatePlayers([{ id: playerId, balance: '1500.00', status: 'Idle' }])

      const newTimestamp = await pool.query(
        'SELECT updated_at FROM players WHERE id = $1',
        [playerId]
      )

      assert.notStrictEqual(
        newTimestamp.rows[0].updated_at.toISOString(),
        oldTimestamp.rows[0].updated_at.toISOString()
      )
    })
  })

  describe('updateCasinoState', () => {
    it('should add to house revenue and update player count', async () => {
      // Get current state
      const before = await pool.query('SELECT house_revenue, active_player_count FROM casino_state WHERE id = 1')
      const beforeRevenue = parseFloat(before.rows[0].house_revenue)

      // Update state
      await updateCasinoState('100.50', 42)

      // Verify update
      const after = await pool.query('SELECT house_revenue, active_player_count FROM casino_state WHERE id = 1')
      const afterRevenue = parseFloat(after.rows[0].house_revenue)

      assert.strictEqual(afterRevenue, beforeRevenue + 100.50)
      assert.strictEqual(after.rows[0].active_player_count, 42)

      // Revert the change for other tests
      await pool.query('UPDATE casino_state SET house_revenue = $1, active_player_count = 0 WHERE id = 1', [beforeRevenue])
    })

    it('should handle negative revenue (house loss)', async () => {
      // Get current state
      const before = await pool.query('SELECT house_revenue FROM casino_state WHERE id = 1')
      const beforeRevenue = parseFloat(before.rows[0].house_revenue)

      // Update with negative revenue
      await updateCasinoState('-250.00', 10)

      // Verify update
      const after = await pool.query('SELECT house_revenue FROM casino_state WHERE id = 1')
      const afterRevenue = parseFloat(after.rows[0].house_revenue)

      assert.strictEqual(afterRevenue, beforeRevenue - 250.00)

      // Revert the change
      await pool.query('UPDATE casino_state SET house_revenue = $1 WHERE id = 1', [beforeRevenue])
    })
  })

  describe('batchUpdateSessions', () => {
    it('should close multiple sessions with final balances', async () => {
      // Create test player
      const playerId = randomUUID()
      testPlayerIds.push(playerId)

      await pool.query(
        `INSERT INTO players (id, archetype, wallet_balance, remaining_capital,
         lifetime_pl, status, dna_traits)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [playerId, 'Recreational', '100.00', '500.00', '0.00', 'Active', '{}']
      )

      // Create 3 test sessions
      const session1 = randomUUID()
      const session2 = randomUUID()
      const session3 = randomUUID()
      testSessionIds.push(session1, session2, session3)

      for (const id of [session1, session2, session3]) {
        await pool.query(
          `INSERT INTO sessions (id, player_id, initial_balance, slot_volatility, simulation_hour, simulation_timestamp, started_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, playerId, '100.00', 'medium', '0', new Date().toISOString()]
        )
      }

      // Close all sessions
      await batchUpdateSessions(
        [session1, session2, session3],
        ['120.00', '85.50', '100.00']
      )

      // Verify sessions are closed
      const result = await pool.query(
        'SELECT id, ended_at, final_balance FROM sessions WHERE id = ANY($1) ORDER BY final_balance DESC',
        [[session1, session2, session3]]
      )

      assert.strictEqual(result.rows.length, 3)
      assert.ok(result.rows[0].ended_at !== null)
      assert.strictEqual(result.rows[0].final_balance, '120.00')
      assert.ok(result.rows[1].ended_at !== null)
      assert.strictEqual(result.rows[1].final_balance, '100.00')
      assert.ok(result.rows[2].ended_at !== null)
      assert.strictEqual(result.rows[2].final_balance, '85.50')
    })

    it('should handle empty array gracefully', async () => {
      // Should not throw
      await batchUpdateSessions([], [])
    })

    it('should throw if array lengths mismatch', async () => {
      await assert.rejects(
        async () => {
          await batchUpdateSessions(['id1', 'id2'], ['100.00'])
        },
        /arrays must have same length/
      )
    })
  })
})
