import 'dotenv/config';
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSlotRegistry,
  initSlotRegistry,
  getSlotRegistry,
  getSlotModel,
  __resetForTests,
  type SlotRegistry,
} from '../src/slots/slotRegistry.js';
import type { SlotModelsConfig } from '../src/slots/slotModels.config.js';

describe('Slot Registry', () => {
  beforeEach(() => {
    // Reset registry before each test
    __resetForTests();
  });

  describe('buildSlotRegistry', () => {
    it('should build registry with correct cumulative probabilities', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [
            { key: '0.00', p: 0.5 },
            { key: '1.00', p: 0.3 },
            { key: '2.00', p: 0.2 },
          ],
        },
      ];

      const registry = buildSlotRegistry(config);

      assert.equal(Object.keys(registry).length, 1);
      assert.equal(registry.test.name, 'test');
      assert.equal(registry.test.outcomes.length, 3);

      // Check cumulative probabilities
      assert.equal(registry.test.outcomes[0].cumP, 0.5);
      assert.equal(registry.test.outcomes[1].cumP, 0.8);
      assert.equal(registry.test.outcomes[2].cumP, 1.0);
    });

    it('should handle multiple models', () => {
      const config: SlotModelsConfig = [
        {
          name: 'low',
          outcomes: [
            { key: '0.00', p: 0.7 },
            { key: '1.00', p: 0.3 },
          ],
        },
        {
          name: 'high',
          outcomes: [
            { key: '0.00', p: 0.9 },
            { key: '10.00', p: 0.1 },
          ],
        },
      ];

      const registry = buildSlotRegistry(config);

      assert.equal(Object.keys(registry).length, 2);
      assert.ok('low' in registry);
      assert.ok('high' in registry);
    });

    it('should handle single outcome model with p=1.0', () => {
      const config: SlotModelsConfig = [
        {
          name: 'guaranteed',
          outcomes: [{ key: '1.00', p: 1.0 }],
        },
      ];

      const registry = buildSlotRegistry(config);

      assert.equal(registry.guaranteed.outcomes.length, 1);
      assert.equal(registry.guaranteed.outcomes[0].cumP, 1.0);
    });

    it('should reject empty outcomes array', () => {
      const config: SlotModelsConfig = [
        {
          name: 'invalid',
          outcomes: [],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /must have at least one outcome/,
        }
      );
    });

    it('should reject duplicate outcome keys', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [
            { key: '1.00', p: 0.5 },
            { key: '1.00', p: 0.5 }, // Duplicate
          ],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /duplicate outcome key '1.00'/,
        }
      );
    });

    it('should reject p <= 0', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [
            { key: '0.00', p: 0 },
            { key: '1.00', p: 1.0 },
          ],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /probability must be in range \(0, 1\]/,
        }
      );
    });

    it('should reject p > 1', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [{ key: '0.00', p: 1.5 }],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /probability must be in range \(0, 1\]/,
        }
      );
    });

    it('should reject NaN probability', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [{ key: '0.00', p: NaN }],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /probability must be a finite number/,
        }
      );
    });

    it('should reject Infinity probability', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [{ key: '0.00', p: Infinity }],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /probability must be a finite number/,
        }
      );
    });

    it('should reject probabilities summing to less than 1.0', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [
            { key: '0.00', p: 0.5 },
            { key: '1.00', p: 0.49 }, // Sum = 0.99, outside tolerance
          ],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /probabilities must sum to 1\.0/,
        }
      );
    });

    it('should reject probabilities summing to more than 1.0', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [
            { key: '0.00', p: 0.6 },
            { key: '1.00', p: 0.41 }, // Sum = 1.01, outside tolerance
          ],
        },
      ];

      assert.throws(
        () => buildSlotRegistry(config),
        {
          message: /probabilities must sum to 1\.0/,
        }
      );
    });

    it('should accept probabilities summing to 1.0 within tolerance', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [
            { key: '0.00', p: 0.3333333 },
            { key: '1.00', p: 0.3333333 },
            { key: '2.00', p: 0.3333334 }, // Sum = 1.0 (within 1e-6 tolerance)
          ],
        },
      ];

      // Should not throw
      const registry = buildSlotRegistry(config);
      assert.ok(registry.test);
    });
  });

  describe('initSlotRegistry and getSlotRegistry', () => {
    it('should throw if getSlotRegistry called before init', () => {
      assert.throws(
        () => getSlotRegistry(),
        {
          message: 'Slot registry not initialized',
        }
      );
    });

    it('should return registry after init', () => {
      const config: SlotModelsConfig = [
        {
          name: 'test',
          outcomes: [{ key: '0.00', p: 1.0 }],
        },
      ];

      const registry = buildSlotRegistry(config);
      initSlotRegistry(registry);

      const retrieved = getSlotRegistry();
      assert.equal(retrieved, registry);
    });

    it('should allow re-initialization', () => {
      const config1: SlotModelsConfig = [
        {
          name: 'first',
          outcomes: [{ key: '0.00', p: 1.0 }],
        },
      ];

      const config2: SlotModelsConfig = [
        {
          name: 'second',
          outcomes: [{ key: '0.00', p: 1.0 }],
        },
      ];

      const registry1 = buildSlotRegistry(config1);
      initSlotRegistry(registry1);

      const registry2 = buildSlotRegistry(config2);
      initSlotRegistry(registry2);

      const retrieved = getSlotRegistry();
      assert.ok('second' in retrieved);
      assert.ok(!('first' in retrieved));
    });
  });

  describe('getSlotModel', () => {
    beforeEach(() => {
      const config: SlotModelsConfig = [
        {
          name: 'low',
          outcomes: [
            { key: '0.00', p: 0.7 },
            { key: '1.00', p: 0.3 },
          ],
        },
        {
          name: 'high',
          outcomes: [{ key: '0.00', p: 1.0 }],
        },
      ];

      const registry = buildSlotRegistry(config);
      initSlotRegistry(registry);
    });

    it('should return correct model by name', () => {
      const model = getSlotModel('low');

      assert.equal(model.name, 'low');
      assert.equal(model.outcomes.length, 2);
      assert.equal(model.outcomes[0].key, '0.00');
      assert.equal(model.outcomes[1].key, '1.00');
    });

    it('should throw for unknown model name', () => {
      assert.throws(
        () => getSlotModel('nonexistent'),
        {
          message: "Slot model 'nonexistent' not found",
        }
      );
    });

    it('should throw if registry not initialized', () => {
      __resetForTests();

      assert.throws(
        () => getSlotModel('low'),
        {
          message: 'Slot registry not initialized',
        }
      );
    });
  });

  describe('Real slot models', () => {
    it('should validate actual slot models from config', async () => {
      // Import actual slot models
      const slotModels = (await import('../src/slots/slotModels.config.js'))
        .default;

      // Should not throw
      const registry = buildSlotRegistry(slotModels);

      // Verify expected models exist
      assert.ok('low' in registry);
      assert.ok('medium' in registry);
      assert.ok('high' in registry);

      // Verify cumulative probabilities end at 1.0
      assert.ok(
        Math.abs(
          registry.low.outcomes[registry.low.outcomes.length - 1].cumP - 1.0
        ) <= 1e-6
      );
      assert.ok(
        Math.abs(
          registry.medium.outcomes[registry.medium.outcomes.length - 1].cumP -
            1.0
        ) <= 1e-6
      );
      assert.ok(
        Math.abs(
          registry.high.outcomes[registry.high.outcomes.length - 1].cumP - 1.0
        ) <= 1e-6
      );
    });
  });
});
