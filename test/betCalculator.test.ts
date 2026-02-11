import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { createRng } from '../src/services/rng.js'
import {
  calculateSpinsPerHour,
  calculateInitialBet,
  calculateNextBet,
  SPINS_PER_HOUR,
  BET_PERCENTAGE,
  MIN_BET,
  MAX_BET
} from '../src/simulation/betCalculator.js'

describe('Bet Calculator', () => {
  describe('calculateSpinsPerHour', () => {
    it('should return spins within Recreational range', () => {
      const rng = createRng('test-seed-1')
      const spins = calculateSpinsPerHour('Recreational', rng)
      assert.ok(spins >= SPINS_PER_HOUR['Recreational'].min)
      assert.ok(spins <= SPINS_PER_HOUR['Recreational'].max)
    })

    it('should return spins within VIP range', () => {
      const rng = createRng('test-seed-2')
      const spins = calculateSpinsPerHour('VIP', rng)
      assert.ok(spins >= SPINS_PER_HOUR['VIP'].min)
      assert.ok(spins <= SPINS_PER_HOUR['VIP'].max)
    })

    it('should return spins within Bonus Hunter range', () => {
      const rng = createRng('test-seed-3')
      const spins = calculateSpinsPerHour('Bonus Hunter', rng)
      assert.ok(spins >= SPINS_PER_HOUR['Bonus Hunter'].min)
      assert.ok(spins <= SPINS_PER_HOUR['Bonus Hunter'].max)
    })

    it('should be deterministic with same seed', () => {
      const rng1 = createRng('deterministic-seed')
      const rng2 = createRng('deterministic-seed')

      const spins1 = calculateSpinsPerHour('VIP', rng1)
      const spins2 = calculateSpinsPerHour('VIP', rng2)

      assert.strictEqual(spins1, spins2)
    })
  })

  describe('calculateInitialBet', () => {
    it('should calculate Recreational bet as 0.5% of balance', () => {
      const balance = 100.00
      const bet = calculateInitialBet(balance, 'Recreational')
      assert.strictEqual(bet, 0.50) // 100 * 0.005 = 0.50
    })

    it('should enforce minimum bet for Recreational', () => {
      const balance = 10.00 // 10 * 0.005 = 0.05 < min (0.10)
      const bet = calculateInitialBet(balance, 'Recreational')
      assert.strictEqual(bet, MIN_BET['Recreational'])
    })

    it('should enforce maximum bet for Recreational', () => {
      const balance = 500.00 // 500 * 0.005 = 2.50 > max (1.00)
      const bet = calculateInitialBet(balance, 'Recreational')
      assert.strictEqual(bet, MAX_BET['Recreational'])
    })

    it('should calculate VIP bet as 1.0% of balance', () => {
      const balance = 100.00
      const bet = calculateInitialBet(balance, 'VIP')
      assert.strictEqual(bet, 1.00) // 100 * 0.01 = 1.00
    })

    it('should enforce minimum bet for VIP', () => {
      const balance = 30.00 // 30 * 0.01 = 0.30 < min (0.50)
      const bet = calculateInitialBet(balance, 'VIP')
      assert.strictEqual(bet, MIN_BET['VIP'])
    })

    it('should enforce maximum bet for VIP', () => {
      const balance = 1000.00 // 1000 * 0.01 = 10.00 > max (5.00)
      const bet = calculateInitialBet(balance, 'VIP')
      assert.strictEqual(bet, MAX_BET['VIP'])
    })

    it('should calculate Bonus Hunter bet as 0.8% of balance', () => {
      const balance = 100.00
      const bet = calculateInitialBet(balance, 'Bonus Hunter')
      assert.strictEqual(bet, 0.80) // 100 * 0.008 = 0.80
    })
  })

  describe('calculateNextBet', () => {
    const minBet = 0.10
    const maxBet = 5.00

    describe('Static betting (betFlexibility < 0.3)', () => {
      it('should never change bet for low flexibility on wins', () => {
        const currentBet = 1.00
        const nextBet = calculateNextBet(currentBet, 'win', 0.1, minBet, maxBet)
        assert.strictEqual(nextBet, currentBet)
      })

      it('should never change bet for low flexibility on losses', () => {
        const currentBet = 1.00
        const nextBet = calculateNextBet(currentBet, 'loss', 0.1, minBet, maxBet)
        assert.strictEqual(nextBet, currentBet)
      })
    })

    describe('Conservative dynamic betting (betFlexibility >= 0.7)', () => {
      it('should increase bet on wins for high flexibility', () => {
        const currentBet = 1.00
        const betFlexibility = 0.8
        const nextBet = calculateNextBet(currentBet, 'win', betFlexibility, minBet, maxBet)

        // Expected increase: 10% + (0.8 * 20%) = 26%
        const expectedIncrease = 0.1 + (betFlexibility * 0.2)
        const expectedBet = Math.round(currentBet * (1 + expectedIncrease) * 100) / 100

        assert.strictEqual(nextBet, expectedBet)
        assert.ok(nextBet > currentBet)
      })

      it('should NOT increase bet on losses (no martingale)', () => {
        const currentBet = 1.00
        const nextBet = calculateNextBet(currentBet, 'loss', 0.8, minBet, maxBet)
        assert.strictEqual(nextBet, currentBet)
      })

      it('should enforce maximum bet on wins', () => {
        const currentBet = 4.50
        const betFlexibility = 0.9
        const nextBet = calculateNextBet(currentBet, 'win', betFlexibility, minBet, maxBet)
        assert.strictEqual(nextBet, maxBet)
      })
    })

    describe('Moderate flexibility (0.3-0.7)', () => {
      it('should increase bet modestly on wins', () => {
        const currentBet = 1.00
        const betFlexibility = 0.5
        const nextBet = calculateNextBet(currentBet, 'win', betFlexibility, minBet, maxBet)

        // Expected increase: 5% + (0.5 * 10%) = 10%
        const expectedIncrease = 0.05 + (betFlexibility * 0.1)
        const expectedBet = Math.round(currentBet * (1 + expectedIncrease) * 100) / 100

        assert.strictEqual(nextBet, expectedBet)
        assert.ok(nextBet > currentBet)
      })

      it('should NOT change bet on losses', () => {
        const currentBet = 1.00
        const nextBet = calculateNextBet(currentBet, 'loss', 0.5, minBet, maxBet)
        assert.strictEqual(nextBet, currentBet)
      })
    })

    describe('Edge cases', () => {
      it('should enforce minimum bet', () => {
        const currentBet = 0.05
        const nextBet = calculateNextBet(currentBet, 'win', 0.8, minBet, maxBet)
        assert.ok(nextBet >= minBet)
      })

      it('should handle bet at maximum correctly', () => {
        const currentBet = maxBet
        const nextBet = calculateNextBet(currentBet, 'win', 0.9, minBet, maxBet)
        assert.strictEqual(nextBet, maxBet)
      })
    })
  })
})
