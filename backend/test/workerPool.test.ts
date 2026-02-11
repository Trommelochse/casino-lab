import 'dotenv/config'
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { WorkerPool, calculateWorkerCount } from '../src/workers/workerPool.js'
import { Player } from '../src/models/player.js'
import { Session } from '../src/models/session.js'
import { PlayerDNA } from '../src/services/playerService.js'

describe('Worker Pool', () => {
  // Helper to create test player
  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    const defaultDNA: PlayerDNA = {
      baseReturnProbability: 0.5,
      riskAppetite: 0.5,
      betFlexibility: 0.1,
      promoDependency: 0.0,
      stopLossLimit: 0.5,
      profitGoal: null,
      preferredVolatility: 'medium'
    }

    return {
      id: randomUUID(),
      archetype: 'Recreational',
      walletBalance: '100.00',
      remainingCapital: '500.00',
      lifetimeProfitLoss: '0.00',
      lifetimeDeposits: '100.00',
      lifetimeWithdrawals: '0.00',
      lifetimeTurnover: '0.00',
      status: 'Active',
      dnaTraits: defaultDNA,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    }
  }

  // Helper to create test session
  function createTestSession(playerId: string, volatility: 'low' | 'medium' | 'high' = 'medium'): Session {
    return {
      id: randomUUID(),
      playerId,
      slotVolatility: volatility,
      initialBalance: '100.00',
      finalBalance: null,
      startedAt: new Date().toISOString(),
      endedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  describe('calculateWorkerCount', () => {
    it('should return 1 worker for <= 250 players', () => {
      assert.strictEqual(calculateWorkerCount(1), 1)
      assert.strictEqual(calculateWorkerCount(100), 1)
      assert.strictEqual(calculateWorkerCount(250), 1)
    })

    it('should return 2 workers for 251-500 players', () => {
      assert.strictEqual(calculateWorkerCount(251), 2)
      assert.strictEqual(calculateWorkerCount(400), 2)
      assert.strictEqual(calculateWorkerCount(500), 2)
    })

    it('should return 3 workers for 501-750 players', () => {
      assert.strictEqual(calculateWorkerCount(501), 3)
      assert.strictEqual(calculateWorkerCount(650), 3)
      assert.strictEqual(calculateWorkerCount(750), 3)
    })

    it('should return 4 workers for > 750 players', () => {
      assert.strictEqual(calculateWorkerCount(751), 4)
      assert.strictEqual(calculateWorkerCount(1000), 4)
      assert.strictEqual(calculateWorkerCount(10000), 4)
    })
  })

  describe('WorkerPool', () => {
    it('should reject invalid worker counts', () => {
      assert.throws(() => new WorkerPool(0), /must be between 1 and 4/)
      assert.throws(() => new WorkerPool(5), /must be between 1 and 4/)
      assert.throws(() => new WorkerPool(-1), /must be between 1 and 4/)
    })

    it('should process small batch with 1 worker', async () => {
      const pool = new WorkerPool(1)

      // Create 10 test players and sessions
      const players: Player[] = []
      const sessions: Session[] = []

      for (let i = 0; i < 10; i++) {
        const player = createTestPlayer({
          walletBalance: '100.00'
        })
        players.push(player)
        sessions.push(createTestSession(player.id))
      }

      // Execute simulation
      const results = await pool.executeSimulation(players, sessions, 'test-seed-1')

      // Verify results
      assert.strictEqual(results.length, 1)
      assert.strictEqual(results[0].type, 'BATCH_COMPLETE')
      assert.strictEqual(results[0].results.length, 10)

      // Verify each player result has expected structure
      results[0].results.forEach(result => {
        assert.ok(result.playerId)
        assert.ok(result.finalBalance)
        assert.ok(result.finalStatus)
        assert.ok(Array.isArray(result.rounds))
        assert.ok(result.exitReason)
      })

      await pool.shutdown()
    })

    it('should process large batch with 4 workers', async () => {
      const pool = new WorkerPool(4)

      // Create 100 test players and sessions
      const players: Player[] = []
      const sessions: Session[] = []

      for (let i = 0; i < 100; i++) {
        const player = createTestPlayer({
          walletBalance: '100.00'
        })
        players.push(player)
        sessions.push(createTestSession(player.id))
      }

      // Execute simulation
      const results = await pool.executeSimulation(players, sessions, 'test-seed-4')

      // Verify results (4 workers, each processing ~25 players)
      assert.strictEqual(results.length, 4)

      let totalPlayers = 0
      results.forEach(workerResult => {
        assert.strictEqual(workerResult.type, 'BATCH_COMPLETE')
        assert.ok(workerResult.results.length > 0)
        totalPlayers += workerResult.results.length
      })

      assert.strictEqual(totalPlayers, 100)

      await pool.shutdown()
    })

    it('should handle empty player array', async () => {
      const pool = new WorkerPool(2)

      const results = await pool.executeSimulation([], [], 'test-seed-empty')

      assert.strictEqual(results.length, 0)

      await pool.shutdown()
    })

    it('should reject mismatched players and sessions arrays', async () => {
      const pool = new WorkerPool(1)

      const players = [createTestPlayer()]
      const sessions: Session[] = []

      await assert.rejects(
        async () => {
          await pool.executeSimulation(players, sessions, 'test-seed-mismatch')
        },
        /must have same length/
      )

      await pool.shutdown()
    })

    it('should produce deterministic results with same seed', async () => {
      const pool1 = new WorkerPool(2)
      const pool2 = new WorkerPool(2)

      // Create identical player sets
      const players1: Player[] = []
      const sessions1: Session[] = []
      const players2: Player[] = []
      const sessions2: Session[] = []

      for (let i = 0; i < 20; i++) {
        const player1 = createTestPlayer({
          id: `player-${i}`,
          walletBalance: '100.00'
        })
        const player2 = createTestPlayer({
          id: `player-${i}`,
          walletBalance: '100.00'
        })

        players1.push(player1)
        players2.push(player2)

        sessions1.push(createTestSession(player1.id))
        sessions2.push(createTestSession(player2.id))
      }

      // Run with same seed
      const results1 = await pool1.executeSimulation(players1, sessions1, 'deterministic-seed')
      const results2 = await pool2.executeSimulation(players2, sessions2, 'deterministic-seed')

      // Collect all results
      const allResults1 = results1.flatMap(r => r.results)
      const allResults2 = results2.flatMap(r => r.results)

      // Sort by player ID for comparison
      allResults1.sort((a, b) => a.playerId.localeCompare(b.playerId))
      allResults2.sort((a, b) => a.playerId.localeCompare(b.playerId))

      // Verify identical outcomes
      assert.strictEqual(allResults1.length, allResults2.length)

      allResults1.forEach((result1, idx) => {
        const result2 = allResults2[idx]
        assert.strictEqual(result1.playerId, result2.playerId)
        assert.strictEqual(result1.finalBalance, result2.finalBalance)
        assert.strictEqual(result1.finalStatus, result2.finalStatus)
        assert.strictEqual(result1.exitReason, result2.exitReason)
        assert.strictEqual(result1.rounds.length, result2.rounds.length)
      })

      await pool1.shutdown()
      await pool2.shutdown()
    })

    it('should distribute work evenly across workers', async () => {
      const pool = new WorkerPool(3)

      // Create 30 players (should be 10 per worker)
      const players: Player[] = []
      const sessions: Session[] = []

      for (let i = 0; i < 30; i++) {
        const player = createTestPlayer()
        players.push(player)
        sessions.push(createTestSession(player.id))
      }

      const results = await pool.executeSimulation(players, sessions, 'test-seed-distribution')

      // Verify distribution
      assert.strictEqual(results.length, 3)
      assert.strictEqual(results[0].results.length, 10)
      assert.strictEqual(results[1].results.length, 10)
      assert.strictEqual(results[2].results.length, 10)

      await pool.shutdown()
    })

    it('should handle uneven distribution correctly', async () => {
      const pool = new WorkerPool(3)

      // Create 25 players (should be 9, 8, 8 per worker)
      const players: Player[] = []
      const sessions: Session[] = []

      for (let i = 0; i < 25; i++) {
        const player = createTestPlayer()
        players.push(player)
        sessions.push(createTestSession(player.id))
      }

      const results = await pool.executeSimulation(players, sessions, 'test-seed-uneven')

      // Verify distribution
      assert.strictEqual(results.length, 3)

      const totalProcessed = results.reduce((sum, r) => sum + r.results.length, 0)
      assert.strictEqual(totalProcessed, 25)

      await pool.shutdown()
    })
  })
})
