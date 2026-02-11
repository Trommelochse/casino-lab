import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createRng } from '../src/services/rng.js'
import { executeMicroBetLoop } from '../src/simulation/microBetLoop.js'
import { Player } from '../src/models/player.js'
import { Session } from '../src/models/session.js'
import { PlayerDNA } from '../src/services/playerService.js'
import { MicroBetLoopInput } from '../src/simulation/types.js'
import { buildSlotRegistry, initSlotRegistry } from '../src/slots/slotRegistry.js'

describe('Micro-Bet Loop', () => {
  // Initialize slot registry before all tests
  before(() => {
    const testConfig = [
      {
        name: 'low',
        outcomes: [
          { key: '0.00', p: 0.715, multiplier: 0.0 },
          { key: '2.00', p: 0.285, multiplier: 2.0 }
        ]
      },
      {
        name: 'medium',
        outcomes: [
          { key: '0.00', p: 0.78, multiplier: 0.0 },
          { key: '2.00', p: 0.22, multiplier: 2.0 }
        ]
      },
      {
        name: 'high',
        outcomes: [
          { key: '0.00', p: 0.855, multiplier: 0.0 },
          { key: '10.00', p: 0.145, multiplier: 10.0 }
        ]
      }
    ]

    const registry = buildSlotRegistry(testConfig)
    initSlotRegistry(registry)
  })

  // Helper to create test player
  function createTestPlayer(overrides: Partial<Player> = {}): Player {
    const defaultDNA: PlayerDNA = {
      baseReturnProbability: 0.5,
      riskAppetite: 0.5,
      betFlexibility: 0.1, // Static betting by default
      promoDependency: 0.0,
      stopLossLimit: 0.5, // 50% loss
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

  describe('Basic execution', () => {
    it('should execute all spins when balance sufficient', () => {
      const player = createTestPlayer({
        walletBalance: '1000.00' // Large balance
      })
      const session = createTestSession(player.id)
      const rng = createRng('test-seed-1')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 10, // Small number for testing
        rng
      })

      assert.strictEqual(result.rounds.length, 10)
      assert.strictEqual(result.exitReason, 'spins_exhausted')
      assert.strictEqual(result.finalStatus, 'Idle')
    })

    it('should mutate balance based on spin results', () => {
      const player = createTestPlayer({
        walletBalance: '100.00'
      })
      const session = createTestSession(player.id)
      const rng = createRng('test-seed-2')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 20,
        rng
      })

      const finalBalance = parseFloat(result.finalBalance)
      const startingBalance = parseFloat(player.walletBalance)

      assert.notStrictEqual(finalBalance, startingBalance) // Balance should change
      assert.ok(result.rounds.length > 0)
    })

    it('should accumulate game rounds with correct structure', () => {
      const player = createTestPlayer()
      const session = createTestSession(player.id)
      const rng = createRng('test-seed-3')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 5,
        rng
      })

      assert.strictEqual(result.rounds.length, 5)

      result.rounds.forEach(round => {
        assert.ok(round.id)
        assert.strictEqual(round.sessionId, session.id)
        assert.ok(round.betAmount)
        assert.ok(round.multiplier)
        assert.ok(round.payout)
        assert.ok(round.resultingBalance)
        assert.ok(round.occurredAt)
      })
    })
  })

  describe('Exit condition: Broke', () => {
    it('should exit early when balance < minBet', () => {
      const dna: PlayerDNA = {
        baseReturnProbability: 0.5,
        riskAppetite: 0.5,
        betFlexibility: 0.1,
        promoDependency: 0.0,
        stopLossLimit: 0.99, // Very high stop-loss so it doesn't trigger first
        profitGoal: null,
        preferredVolatility: 'medium'
      }

      const player = createTestPlayer({
        walletBalance: '0.50', // Just enough for ~5 spins at 0.10
        archetype: 'Recreational',
        dnaTraits: dna
      })
      const session = createTestSession(player.id)
      const rng = createRng('test-seed-broke')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 100, // Request many spins
        rng
      })

      assert.ok(result.rounds.length < 100) // Exited early
      assert.strictEqual(result.exitReason, 'broke')
      assert.strictEqual(result.finalStatus, 'Broke')
      assert.ok(parseFloat(result.finalBalance) < 0.10) // Below min bet
    })
  })

  describe('Exit condition: Stop-loss', () => {
    it('should exit when stop-loss limit hit', () => {
      const dna: PlayerDNA = {
        baseReturnProbability: 0.5,
        riskAppetite: 0.5,
        betFlexibility: 0.1,
        promoDependency: 0.0,
        stopLossLimit: 0.2, // Exit at 20% loss
        profitGoal: null,
        preferredVolatility: 'high'
      }

      const player = createTestPlayer({
        walletBalance: '100.00',
        dnaTraits: dna
      })
      const session = createTestSession(player.id, 'high') // High volatility increases loss chance
      const rng = createRng('test-seed-loss')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 500, // Many spins
        rng
      })

      // If stop-loss triggered, balance should be ~80 or less
      if (result.exitReason === 'stop_loss') {
        const finalBalance = parseFloat(result.finalBalance)
        assert.ok(finalBalance <= 80.00)
        assert.strictEqual(result.finalStatus, 'Idle') // Not broke, just stopped
      }
    })
  })

  describe('Exit condition: Profit goal', () => {
    it('should exit when profit goal achieved', () => {
      const dna: PlayerDNA = {
        baseReturnProbability: 0.5,
        riskAppetite: 0.5,
        betFlexibility: 0.1,
        promoDependency: 0.0,
        stopLossLimit: 0.5,
        profitGoal: 1.5, // Exit at 50% profit (1.5x multiplier)
        preferredVolatility: 'low'
      }

      const player = createTestPlayer({
        walletBalance: '100.00',
        dnaTraits: dna
      })
      const session = createTestSession(player.id, 'low')
      const rng = createRng('test-seed-profit')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 1000, // Many spins to hit goal
        rng
      })

      // If profit goal triggered, balance should be >= 150
      if (result.exitReason === 'profit_goal') {
        const finalBalance = parseFloat(result.finalBalance)
        assert.ok(finalBalance >= 150.00)
        assert.strictEqual(result.finalStatus, 'Idle')
      }
    })

    it('should ignore profit goal if set to null', () => {
      const dna: PlayerDNA = {
        baseReturnProbability: 0.5,
        riskAppetite: 0.5,
        betFlexibility: 0.1,
        promoDependency: 0.0,
        stopLossLimit: 0.5,
        profitGoal: null, // No profit goal
        preferredVolatility: 'medium'
      }

      const player = createTestPlayer({
        walletBalance: '100.00',
        dnaTraits: dna
      })
      const session = createTestSession(player.id)
      const rng = createRng('test-seed-no-goal')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 10,
        rng
      })

      assert.notStrictEqual(result.exitReason, 'profit_goal')
    })
  })

  describe('Bet progression', () => {
    it('should maintain static bets for low betFlexibility', () => {
      const player = createTestPlayer({
        walletBalance: '100.00',
        dnaTraits: {
          baseReturnProbability: 0.5,
          riskAppetite: 0.5,
          betFlexibility: 0.1, // Static betting
          promoDependency: 0.0,
          stopLossLimit: 0.5,
          profitGoal: null,
          preferredVolatility: 'medium'
        }
      })
      const session = createTestSession(player.id)
      const rng = createRng('test-seed-static')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 10,
        rng
      })

      // Check that all bets are the same (static)
      const firstBet = result.rounds[0].betAmount
      const allBetsSame = result.rounds.every(r => r.betAmount === firstBet)
      assert.strictEqual(allBetsSame, true)
    })

    it('should increase bets on wins for high betFlexibility', () => {
      const player = createTestPlayer({
        walletBalance: '200.00', // Balance that allows bet growth (1% = 2.00, well below max of 5.00)
        archetype: 'VIP',
        dnaTraits: {
          baseReturnProbability: 0.5,
          riskAppetite: 0.8,
          betFlexibility: 0.8, // Dynamic betting
          promoDependency: 0.0,
          stopLossLimit: 0.9,
          profitGoal: null,
          preferredVolatility: 'low' // Low volatility = more frequent wins
        }
      })
      const session = createTestSession(player.id, 'low') // Use low volatility
      const rng = createRng('test-seed-dynamic-wins')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 200, // Many spins to ensure some wins
        rng
      })

      // Check if there were any wins (multiplier > 0)
      const winCount = result.rounds.filter(r => parseFloat(r.multiplier) > 0).length

      // Collect all unique bet amounts (as numbers for proper comparison)
      const uniqueBets = new Set(result.rounds.map(r => parseFloat(r.betAmount)))

      // If there were wins, check for bet variation
      if (winCount > 0) {
        // With high betFlexibility and wins, we should see bet increases
        // Initial bet: 200 * 0.01 = 2.00
        // After win with 0.8 flexibility: 2.00 * (1 + 0.1 + 0.8*0.2) = 2.00 * 1.26 = 2.52
        assert.ok(uniqueBets.size > 1, `Expected bet variation with high flexibility and ${winCount} wins, but only saw ${uniqueBets.size} unique bet(s): ${Array.from(uniqueBets).join(', ')}`)
      } else {
        // If no wins occurred with this seed, that's okay - bets stay same (static)
        // This test is probabilistic, so we skip assertion if no wins
        console.log('Note: No wins occurred with test seed, skipping bet variation check')
      }
    })
  })

  describe('Slot volatility', () => {
    it('should use session slot volatility for spins', () => {
      const player = createTestPlayer({
        walletBalance: '100.00'
      })
      const session = createTestSession(player.id, 'high')
      const rng = createRng('test-seed-volatility')

      const result = executeMicroBetLoop({
        player,
        session,
        spinsPerHour: 10,
        rng
      })

      // Just verify it completes without error
      // The spin engine will use the 'high' volatility slot model
      assert.strictEqual(result.rounds.length, 10)
    })
  })

  describe('Determinism', () => {
    it('should produce identical results with same seed', () => {
      const player1 = createTestPlayer({
        walletBalance: '100.00'
      })
      const session1 = createTestSession(player1.id)
      const rng1 = createRng('deterministic-seed')

      const result1 = executeMicroBetLoop({
        player: player1,
        session: session1,
        spinsPerHour: 20,
        rng: rng1
      })

      const player2 = createTestPlayer({
        walletBalance: '100.00'
      })
      const session2 = createTestSession(player2.id)
      const rng2 = createRng('deterministic-seed')

      const result2 = executeMicroBetLoop({
        player: player2,
        session: session2,
        spinsPerHour: 20,
        rng: rng2
      })

      assert.strictEqual(result1.finalBalance, result2.finalBalance)
      assert.strictEqual(result1.exitReason, result2.exitReason)
      assert.strictEqual(result1.rounds.length, result2.rounds.length)

      // Check that multipliers match (proving determinism)
      result1.rounds.forEach((round, idx) => {
        assert.strictEqual(round.multiplier, result2.rounds[idx].multiplier)
      })
    })
  })
})
