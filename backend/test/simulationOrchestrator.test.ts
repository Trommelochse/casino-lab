import 'dotenv/config'
import { describe, it, before, after, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { pool } from '../src/db/pool.js'
import { createPlayer } from '../src/services/playerService.js'
import { simulateHourTick } from '../src/simulation/simulationOrchestrator.js'
import { buildApp } from '../src/app.js'
import { loadWorldState } from '../src/state/worldState.js'

describe('Simulation Orchestrator', () => {
  // Initialize world state before tests
  before(async () => {
    await loadWorldState()
  })

  // Clean up test players after each test to prevent interference
  afterEach(async () => {
    await pool.query('DELETE FROM game_rounds WHERE session_id IN (SELECT id FROM sessions WHERE player_id IN (SELECT id FROM players WHERE archetype IN ($1, $2, $3)))', [
      'Recreational',
      'VIP',
      'Bonus Hunter'
    ])
    await pool.query('DELETE FROM sessions WHERE player_id IN (SELECT id FROM players WHERE archetype IN ($1, $2, $3))', [
      'Recreational',
      'VIP',
      'Bonus Hunter'
    ])
    await pool.query('DELETE FROM players WHERE archetype IN ($1, $2, $3)', [
      'Recreational',
      'VIP',
      'Bonus Hunter'
    ])
  })

  // Clean up test data
  after(async () => {
    await pool.query('DELETE FROM game_rounds WHERE session_id IN (SELECT id FROM sessions WHERE player_id IN (SELECT id FROM players WHERE archetype IN ($1, $2, $3)))', [
      'Recreational',
      'VIP',
      'Bonus Hunter'
    ])
    await pool.query('DELETE FROM sessions WHERE player_id IN (SELECT id FROM players WHERE archetype IN ($1, $2, $3))', [
      'Recreational',
      'VIP',
      'Bonus Hunter'
    ])
    await pool.query('DELETE FROM players WHERE archetype IN ($1, $2, $3)', [
      'Recreational',
      'VIP',
      'Bonus Hunter'
    ])
    await pool.end()
  })

  describe('simulateHourTick', () => {
    it('should return zero results when no active players', async () => {
      const summary = await simulateHourTick()

      assert.strictEqual(summary.message, 'No active players')
      assert.strictEqual(summary.playersProcessed, 0)
      assert.strictEqual(summary.totalSpins, 0)
      assert.strictEqual(summary.houseRevenue, '0.00')
    })

    it('should process single active player', async () => {
      // Create player with Active status
      const player = await createPlayer({ archetype: 'Recreational' })

      // Set player to Active status
      await pool.query('UPDATE players SET status = $1 WHERE id = $2', ['Active', player.id])

      // Run simulation
      const summary = await simulateHourTick()

      // Verify summary
      assert.strictEqual(summary.playersProcessed, 1)
      assert.ok(summary.totalSpins > 0, 'Should have executed spins')
      assert.ok(summary.houseRevenue !== '0.00', 'Should have house revenue')
      assert.ok(summary.playerStatuses)
      assert.strictEqual(
        summary.playerStatuses.active + summary.playerStatuses.idle + summary.playerStatuses.broke,
        1
      )

      // Verify player status updated
      const playerResult = await pool.query('SELECT status FROM players WHERE id = $1', [player.id])
      const newStatus = playerResult.rows[0].status
      assert.ok(['Idle', 'Broke'].includes(newStatus), `Player should be Idle or Broke, got: ${newStatus}`)

      // Verify session created and closed
      const sessionResult = await pool.query(
        'SELECT * FROM sessions WHERE player_id = $1',
        [player.id]
      )
      assert.strictEqual(sessionResult.rows.length, 1)
      assert.ok(sessionResult.rows[0].ended_at !== null, 'Session should be closed')
      assert.ok(sessionResult.rows[0].final_balance !== null, 'Session should have final balance')

      // Verify game rounds created
      const roundsResult = await pool.query(
        'SELECT COUNT(*) FROM game_rounds WHERE session_id = $1',
        [sessionResult.rows[0].id]
      )
      const roundCount = parseInt(roundsResult.rows[0].count)
      assert.strictEqual(roundCount, summary.totalSpins)
    })

    it('should process multiple active players', async () => {
      // Create 5 active players
      const players = []
      for (let i = 0; i < 5; i++) {
        const player = await createPlayer({ archetype: 'Recreational' })
        await pool.query('UPDATE players SET status = $1 WHERE id = $2', ['Active', player.id])
        players.push(player)
      }

      // Run simulation
      const summary = await simulateHourTick()

      // Verify summary
      assert.strictEqual(summary.playersProcessed, 5)
      assert.ok(summary.totalSpins > 0)
      assert.ok(summary.playerStatuses)
      assert.strictEqual(
        summary.playerStatuses.active + summary.playerStatuses.idle + summary.playerStatuses.broke,
        5
      )

      // Verify all players updated
      for (const player of players) {
        const result = await pool.query('SELECT status FROM players WHERE id = $1', [player.id])
        const status = result.rows[0].status
        assert.ok(['Idle', 'Broke'].includes(status))
      }
    })

    it('should handle VIP players with higher spins', async () => {
      // Create VIP player
      const player = await createPlayer({ archetype: 'VIP' })
      await pool.query('UPDATE players SET status = $1 WHERE id = $2', ['Active', player.id])

      // Run simulation
      const summary = await simulateHourTick()

      // VIPs should have more spins (300-600 range vs Recreational 60-180)
      assert.strictEqual(summary.playersProcessed, 1)
      assert.ok(summary.totalSpins >= 300, `VIP should have >= 300 spins, got ${summary.totalSpins}`)
    })

    it('should calculate house revenue correctly', async () => {
      // Create player
      const player = await createPlayer({ archetype: 'Recreational' })
      await pool.query('UPDATE players SET status = $1, wallet_balance = $2 WHERE id = $3', [
        'Active',
        '1000.00',
        player.id
      ])

      // Get casino state before
      const beforeResult = await pool.query('SELECT house_revenue FROM casino_state WHERE id = 1')
      const revenueBefore = parseFloat(beforeResult.rows[0].house_revenue)

      // Run simulation
      const summary = await simulateHourTick()

      // Get casino state after
      const afterResult = await pool.query('SELECT house_revenue FROM casino_state WHERE id = 1')
      const revenueAfter = parseFloat(afterResult.rows[0].house_revenue)

      // Verify revenue increased by summary amount
      const expectedRevenue = revenueBefore + parseFloat(summary.houseRevenue)
      assert.strictEqual(revenueAfter, expectedRevenue)
    })

    it('should handle player going broke', async () => {
      // Create player with low balance
      const player = await createPlayer({ archetype: 'Recreational' })
      await pool.query('UPDATE players SET status = $1, wallet_balance = $2 WHERE id = $3', [
        'Active',
        '0.50', // Just enough for a few spins
        player.id
      ])

      // Run simulation
      const summary = await simulateHourTick()

      // Check if player went broke (probabilistic, but with 0.50 balance likely)
      const playerResult = await pool.query('SELECT status, wallet_balance FROM players WHERE id = $1', [
        player.id
      ])
      const finalBalance = parseFloat(playerResult.rows[0].wallet_balance)

      // Player should have very low balance
      assert.ok(finalBalance < 1.00, 'Player should have lost most balance')
    })
  })

  describe('POST /simulate/hour endpoint', () => {
    it('should return 200 with simulation summary', async () => {
      const app = buildApp({ logger: false })

      // Create active player
      const player = await createPlayer({ archetype: 'Recreational' })
      await pool.query('UPDATE players SET status = $1 WHERE id = $2', ['Active', player.id])

      // Call endpoint
      const response = await app.inject({
        method: 'POST',
        url: '/simulate/hour'
      })

      // Verify response
      assert.strictEqual(response.statusCode, 200)

      const body = JSON.parse(response.body)
      assert.strictEqual(body.message, 'Hour simulation completed')
      assert.strictEqual(body.playersProcessed, 1)
      assert.ok(body.totalSpins > 0)
      assert.ok(body.houseRevenue)
      assert.ok(body.playerStatuses)

      await app.close()
    })

    it('should handle no active players gracefully', async () => {
      const app = buildApp({ logger: false })

      // Ensure no active players
      await pool.query('UPDATE players SET status = $1 WHERE status = $2', ['Idle', 'Active'])

      // Call endpoint
      const response = await app.inject({
        method: 'POST',
        url: '/simulate/hour'
      })

      // Verify response
      assert.strictEqual(response.statusCode, 200)

      const body = JSON.parse(response.body)
      assert.strictEqual(body.message, 'No active players')
      assert.strictEqual(body.playersProcessed, 0)

      await app.close()
    })
  })
})
