/**
 * Slot model registry with validation and in-memory storage
 */

import type {
  SlotModelsConfig,
  SlotModelConfig,
} from './slotModels.config.js';

export type SlotOutcome = {
  key: string;
  p: number;
  cumP: number; // Cumulative probability
  multiplier: number; // Win multiplier
};

export type SlotModel = {
  name: string;
  outcomes: SlotOutcome[];
};

export type SlotRegistry = Record<string, SlotModel>;

// Module-level singleton
let registry: SlotRegistry | null = null;

/**
 * Tolerance for probability sum validation
 */
const PROBABILITY_TOLERANCE = 1e-6;

/**
 * Build and validate slot registry from config
 * @throws {Error} If validation fails
 */
export function buildSlotRegistry(config: SlotModelsConfig): SlotRegistry {
  const result: SlotRegistry = {};

  for (const modelConfig of config) {
    const model = validateAndBuildModel(modelConfig);
    result[model.name] = model;
  }

  return result;
}

/**
 * Validate a single model and compute cumulative probabilities
 */
function validateAndBuildModel(config: SlotModelConfig): SlotModel {
  const { name, outcomes: outcomesConfig } = config;

  // Validate non-empty outcomes
  if (!outcomesConfig || outcomesConfig.length === 0) {
    throw new Error(
      `Model '${name}': must have at least one outcome`
    );
  }

  // Check for duplicate keys
  const keys = new Set<string>();
  for (const outcome of outcomesConfig) {
    if (keys.has(outcome.key)) {
      throw new Error(
        `Model '${name}': duplicate outcome key '${outcome.key}'`
      );
    }
    keys.add(outcome.key);
  }

  // Validate probabilities and compute cumulative
  const outcomes: SlotOutcome[] = [];
  let cumP = 0;

  for (let i = 0; i < outcomesConfig.length; i++) {
    const { key, p, multiplier } = outcomesConfig[i];

    // Validate multiplier exists
    if (multiplier === undefined) {
      throw new Error(
        `Model '${name}', outcome '${key}': multiplier is required`
      );
    }

    // Validate multiplier value
    if (!Number.isFinite(multiplier)) {
      throw new Error(
        `Model '${name}', outcome '${key}': multiplier must be a finite number`
      );
    }

    if (multiplier < 0) {
      throw new Error(
        `Model '${name}', outcome '${key}': multiplier must be >= 0, got ${multiplier}`
      );
    }

    // Validate probability value
    if (!Number.isFinite(p)) {
      throw new Error(
        `Model '${name}', outcome '${key}': probability must be a finite number`
      );
    }

    if (p <= 0 || p > 1) {
      throw new Error(
        `Model '${name}', outcome '${key}': probability must be in range (0, 1], got ${p}`
      );
    }

    // Compute cumulative probability
    cumP += p;

    outcomes.push({
      key,
      p,
      cumP,
      multiplier,
    });

    // Verify strictly increasing (within floating-point tolerance)
    if (i > 0 && cumP <= outcomes[i - 1].cumP) {
      throw new Error(
        `Model '${name}': cumulative probabilities must be strictly increasing`
      );
    }
  }

  // Validate final cumulative probability
  const finalCumP = outcomes[outcomes.length - 1].cumP;
  const diff = Math.abs(finalCumP - 1.0);

  if (diff > PROBABILITY_TOLERANCE) {
    throw new Error(
      `Model '${name}': probabilities must sum to 1.0 (got ${finalCumP}, diff ${diff})`
    );
  }

  return {
    name,
    outcomes,
  };
}

/**
 * Initialize the global slot registry singleton
 */
export function initSlotRegistry(slotRegistry: SlotRegistry): void {
  registry = slotRegistry;
}

/**
 * Get the global slot registry
 * @throws {Error} If registry not initialized
 */
export function getSlotRegistry(): SlotRegistry {
  if (!registry) {
    throw new Error('Slot registry not initialized');
  }
  return registry;
}

/**
 * Get a specific slot model by name
 * @throws {Error} If model not found or registry not initialized
 */
export function getSlotModel(name: string): SlotModel {
  const reg = getSlotRegistry(); // Throws if not initialized

  if (!(name in reg)) {
    throw new Error(`Slot model '${name}' not found`);
  }

  return reg[name];
}

/**
 * Reset registry for tests
 * @internal For testing purposes only
 */
export function __resetForTests(): void {
  registry = null;
}
