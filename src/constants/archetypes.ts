/**
 * Player archetype templates
 * Defines DNA trait ranges for each player behavior profile
 */

export type SlotVolatility = 'low' | 'medium' | 'high';

/**
 * DNA trait ranges for a player archetype
 */
export interface ArchetypeTemplate {
  /** Return session probability range */
  basePReturn: { min: number; max: number };
  /** Risk appetite range (0.0 = low, 1.0 = high) */
  riskAppetite: { min: number; max: number };
  /** Betting flexibility range (0.0 = static, 1.0 = aggressive scaling) */
  betFlexibility: { min: number; max: number };
  /** Promo dependency range (0.0 = plays freely, 1.0 = requires bonus) */
  promoDependency: { min: number; max: number };
  /** Stop loss limit range (% of bankroll before forced exit) */
  stopLossLimit: { min: number; max: number };
  /** Profit goal range (win multiplier triggering withdrawal, null = plays until bored) */
  profitGoal: { min: number | null; max: number | null };
  /** Initial capital range in euros */
  initialCapital: { min: number; max: number };
  /** Preferred slot volatilities */
  preferredSlotVolatilities: SlotVolatility[];
}

/**
 * Player archetype names
 */
export type ArchetypeName = 'Recreational' | 'VIP' | 'Bonus Hunter';

/**
 * Archetype templates mapping
 */
export const ARCHETYPE_TEMPLATES: Record<ArchetypeName, ArchetypeTemplate> = {
  /**
   * The Recreational Player (Entertainment Focus)
   * Population Weight: 65%
   * Plays for fun, low stakes, exits regardless of P/L
   */
  Recreational: {
    basePReturn: { min: 0.3, max: 0.5 },
    riskAppetite: { min: 0.2, max: 0.5 }, // Low to Medium
    betFlexibility: { min: 0.0, max: 0.2 }, // Mostly static bets
    promoDependency: { min: 0.0, max: 0.3 }, // Will play with raw cash
    stopLossLimit: { min: 0.7, max: 0.9 }, // May leave with some balance
    profitGoal: { min: null, max: null }, // No specific profit goal
    initialCapital: { min: 20, max: 100 },
    preferredSlotVolatilities: ['low', 'medium'],
  },

  /**
   * The VIP (Aggressive Whale)
   * Population Weight: 10%
   * High frequency, aggressive betting, plays until balance = 0
   */
  VIP: {
    basePReturn: { min: 0.85, max: 0.98 },
    riskAppetite: { min: 0.7, max: 1.0 }, // High to Very High
    betFlexibility: { min: 0.7, max: 1.0 }, // Aggressive bet scaling
    promoDependency: { min: 0.0, max: 0.2 }, // Deposits regardless of offers
    stopLossLimit: { min: 0.95, max: 1.0 }, // Almost always plays to €0
    profitGoal: { min: 8.0, max: 15.0 }, // Only stops for massive wins
    initialCapital: { min: 500, max: 10000 },
    preferredSlotVolatilities: ['medium', 'high'],
  },

  /**
   * The Bonus Hunter (Calculated/Disciplined)
   * Population Weight: 25%
   * Strict bonus requirement, withdraws early to secure ROI
   */
  'Bonus Hunter': {
    basePReturn: { min: 0.6, max: 0.75 },
    riskAppetite: { min: 0.4, max: 0.6 }, // Medium (focuses on clearing wagering)
    betFlexibility: { min: 0.0, max: 0.1 }, // Strict adherence to optimal bet sizes
    promoDependency: { min: 0.9, max: 1.0 }, // Almost always requires bonus
    stopLossLimit: { min: 0.95, max: 1.0 }, // Uses full bonus/deposit to hit goal
    profitGoal: { min: 1.5, max: 2.5 }, // Withdraws early to secure ROI
    initialCapital: { min: 50, max: 300 },
    preferredSlotVolatilities: ['medium'],
  },
};

/**
 * Type guard to check if a value is a valid ArchetypeName
 */
export function isArchetypeName(value: unknown): value is ArchetypeName {
  return (
    typeof value === 'string' &&
    (value === 'Recreational' || value === 'VIP' || value === 'Bonus Hunter')
  );
}

/**
 * Get all archetype names
 */
export function getArchetypeNames(): ArchetypeName[] {
  return ['Recreational', 'VIP', 'Bonus Hunter'];
}
