import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { generatePlayerDNA, createPlayer } from '../src/services/playerService.js';
import { ARCHETYPE_TEMPLATES } from '../src/constants/archetypes.js';
import { pool } from '../src/db/pool.js';

describe('Player Service', () => {
  // Clean up after tests
  after(async () => {
    // Delete test players
    await pool.query('DELETE FROM players WHERE archetype IN ($1, $2, $3)', [
      'Recreational',
      'VIP',
      'Bonus Hunter',
    ]);
    await pool.end();
  });

  describe('generatePlayerDNA', () => {
    it('should generate DNA within Recreational archetype bounds', () => {
      const archetype = 'Recreational';
      const template = ARCHETYPE_TEMPLATES[archetype];
      const dna = generatePlayerDNA(archetype);

      // Check all traits are within bounds
      assert.ok(
        dna.basePReturn >= template.basePReturn.min &&
          dna.basePReturn <= template.basePReturn.max,
        `basePReturn ${dna.basePReturn} should be within [${template.basePReturn.min}, ${template.basePReturn.max}]`
      );

      assert.ok(
        dna.riskAppetite >= template.riskAppetite.min &&
          dna.riskAppetite <= template.riskAppetite.max,
        `riskAppetite ${dna.riskAppetite} should be within [${template.riskAppetite.min}, ${template.riskAppetite.max}]`
      );

      assert.ok(
        dna.betFlexibility >= template.betFlexibility.min &&
          dna.betFlexibility <= template.betFlexibility.max,
        `betFlexibility ${dna.betFlexibility} should be within [${template.betFlexibility.min}, ${template.betFlexibility.max}]`
      );

      assert.ok(
        dna.promoDependency >= template.promoDependency.min &&
          dna.promoDependency <= template.promoDependency.max,
        `promoDependency ${dna.promoDependency} should be within [${template.promoDependency.min}, ${template.promoDependency.max}]`
      );

      assert.ok(
        dna.stopLossLimit >= template.stopLossLimit.min &&
          dna.stopLossLimit <= template.stopLossLimit.max,
        `stopLossLimit ${dna.stopLossLimit} should be within [${template.stopLossLimit.min}, ${template.stopLossLimit.max}]`
      );

      assert.ok(
        dna.initialCapital >= template.initialCapital.min &&
          dna.initialCapital <= template.initialCapital.max,
        `initialCapital ${dna.initialCapital} should be within [${template.initialCapital.min}, ${template.initialCapital.max}]`
      );

      // Recreational should have null profit goal
      assert.equal(dna.profitGoal, null);

      // Should pick from preferred volatilities
      assert.ok(
        template.preferredSlotVolatilities.includes(dna.preferredVolatility)
      );
    });

    it('should generate DNA within VIP archetype bounds', () => {
      const archetype = 'VIP';
      const template = ARCHETYPE_TEMPLATES[archetype];
      const dna = generatePlayerDNA(archetype);

      // Check key traits
      assert.ok(
        dna.basePReturn >= template.basePReturn.min &&
          dna.basePReturn <= template.basePReturn.max
      );
      assert.ok(
        dna.riskAppetite >= template.riskAppetite.min &&
          dna.riskAppetite <= template.riskAppetite.max
      );
      assert.ok(
        dna.initialCapital >= template.initialCapital.min &&
          dna.initialCapital <= template.initialCapital.max
      );

      // VIP should have profit goal
      assert.ok(dna.profitGoal !== null);
      if (template.profitGoal.min !== null && template.profitGoal.max !== null) {
        assert.ok(
          dna.profitGoal! >= template.profitGoal.min &&
            dna.profitGoal! <= template.profitGoal.max
        );
      }
    });

    it('should generate DNA within Bonus Hunter archetype bounds', () => {
      const archetype = 'Bonus Hunter';
      const template = ARCHETYPE_TEMPLATES[archetype];
      const dna = generatePlayerDNA(archetype);

      // Check key traits
      assert.ok(
        dna.basePReturn >= template.basePReturn.min &&
          dna.basePReturn <= template.basePReturn.max
      );
      assert.ok(
        dna.promoDependency >= template.promoDependency.min &&
          dna.promoDependency <= template.promoDependency.max
      );

      // Bonus Hunter should have profit goal
      assert.ok(dna.profitGoal !== null);
      if (template.profitGoal.min !== null && template.profitGoal.max !== null) {
        assert.ok(
          dna.profitGoal! >= template.profitGoal.min &&
            dna.profitGoal! <= template.profitGoal.max
        );
      }
    });

    it('should be deterministic with same seed', () => {
      const seed = 'test-seed-123';
      const dna1 = generatePlayerDNA('Recreational', seed);
      const dna2 = generatePlayerDNA('Recreational', seed);

      // All fields should match
      assert.equal(dna1.basePReturn, dna2.basePReturn);
      assert.equal(dna1.riskAppetite, dna2.riskAppetite);
      assert.equal(dna1.betFlexibility, dna2.betFlexibility);
      assert.equal(dna1.promoDependency, dna2.promoDependency);
      assert.equal(dna1.stopLossLimit, dna2.stopLossLimit);
      assert.equal(dna1.profitGoal, dna2.profitGoal);
      assert.equal(dna1.initialCapital, dna2.initialCapital);
      assert.equal(dna1.preferredVolatility, dna2.preferredVolatility);
    });

    it('should generate different DNA without seed', () => {
      const dna1 = generatePlayerDNA('Recreational');
      const dna2 = generatePlayerDNA('Recreational');

      // At least one field should differ (very high probability)
      const allMatch =
        dna1.basePReturn === dna2.basePReturn &&
        dna1.riskAppetite === dna2.riskAppetite &&
        dna1.betFlexibility === dna2.betFlexibility &&
        dna1.promoDependency === dna2.promoDependency &&
        dna1.stopLossLimit === dna2.stopLossLimit &&
        dna1.initialCapital === dna2.initialCapital;

      assert.ok(!allMatch, 'DNA should differ when no seed is provided');
    });
  });

  describe('createPlayer', () => {
    it('should create a Recreational player in database', async () => {
      const player = await createPlayer({
        archetype: 'Recreational',
      });

      // Verify player fields
      assert.ok(player.id);
      assert.equal(player.archetype, 'Recreational');
      assert.equal(player.status, 'Idle');
      assert.ok(player.dnaTraits);
      assert.ok(player.createdAt);
      assert.ok(player.updatedAt);

      // Verify wallet balance matches initial capital from DNA
      const dna = player.dnaTraits as any;
      const expectedBalance = dna.initialCapital.toFixed(2);
      assert.equal(player.walletBalance, expectedBalance);
      assert.equal(player.remainingCapital, expectedBalance);
      assert.equal(player.lifetimePL, '0.00');
    });

    it('should create a VIP player with high initial capital', async () => {
      const player = await createPlayer({
        archetype: 'VIP',
      });

      assert.equal(player.archetype, 'VIP');

      // VIP should have higher initial capital (500-10000)
      const walletBalance = parseFloat(player.walletBalance);
      assert.ok(walletBalance >= 500 && walletBalance <= 10000);
    });

    it('should create a Bonus Hunter player', async () => {
      const player = await createPlayer({
        archetype: 'Bonus Hunter',
      });

      assert.equal(player.archetype, 'Bonus Hunter');

      // Verify DNA is stored and has required fields
      const dna = player.dnaTraits as any;
      assert.ok(dna.promoDependency >= 0.9); // Bonus Hunter has high promo dependency
    });

    it('should create deterministic player with seed', async () => {
      const seed = 'test-create-123';

      const player1 = await createPlayer({
        archetype: 'Recreational',
        seed,
      });

      // Clean up for second test
      await pool.query('DELETE FROM players WHERE id = $1', [player1.id]);

      const player2 = await createPlayer({
        archetype: 'Recreational',
        seed,
      });

      // DNA should match
      const dna1 = player1.dnaTraits as any;
      const dna2 = player2.dnaTraits as any;

      assert.equal(dna1.basePReturn, dna2.basePReturn);
      assert.equal(dna1.riskAppetite, dna2.riskAppetite);
      assert.equal(dna1.initialCapital, dna2.initialCapital);

      // Wallet balances should match
      assert.equal(player1.walletBalance, player2.walletBalance);
    });
  });
});
