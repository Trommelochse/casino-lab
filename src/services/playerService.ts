/**
 * Player service for DNA generation and player creation
 */

import { pool } from '../db/pool.js';
import { createRng } from './rng.js';
import {
  ARCHETYPE_TEMPLATES,
  ArchetypeName,
  SlotVolatility,
} from '../constants/archetypes.js';
import {
  Player,
  PlayerRow,
  PlayerStatus,
  mapPlayerRow,
} from '../models/player.js';

/**
 * Player DNA traits
 */
export interface PlayerDNA {
  /** Return session probability (0.0 - 1.0) */
  basePReturn: number;
  /** Risk appetite (0.0 = low, 1.0 = high) */
  riskAppetite: number;
  /** Betting flexibility (0.0 = static, 1.0 = aggressive scaling) */
  betFlexibility: number;
  /** Promo dependency (0.0 = plays freely, 1.0 = requires bonus) */
  promoDependency: number;
  /** Stop loss limit (% of bankroll before forced exit) */
  stopLossLimit: number;
  /** Profit goal (win multiplier triggering withdrawal, null = no goal) */
  profitGoal: number | null;
  /** Initial capital in euros */
  initialCapital: number;
  /** Preferred slot volatility */
  preferredVolatility: SlotVolatility;
}

/**
 * Generate player DNA from archetype template
 * @param archetype - The player archetype
 * @param seed - Optional seed for deterministic generation
 * @returns Generated DNA traits
 */
export function generatePlayerDNA(
  archetype: ArchetypeName,
  seed?: string
): PlayerDNA {
  const template = ARCHETYPE_TEMPLATES[archetype];
  const rng = createRng(seed);

  // Generate random values within template ranges
  const basePReturn = rng.float(
    template.basePReturn.min,
    template.basePReturn.max
  );
  const riskAppetite = rng.float(
    template.riskAppetite.min,
    template.riskAppetite.max
  );
  const betFlexibility = rng.float(
    template.betFlexibility.min,
    template.betFlexibility.max
  );
  const promoDependency = rng.float(
    template.promoDependency.min,
    template.promoDependency.max
  );
  const stopLossLimit = rng.float(
    template.stopLossLimit.min,
    template.stopLossLimit.max
  );

  // Handle profit goal (can be null)
  let profitGoal: number | null = null;
  if (template.profitGoal.min !== null && template.profitGoal.max !== null) {
    profitGoal = rng.float(template.profitGoal.min, template.profitGoal.max);
  }

  // Generate initial capital
  const initialCapital = rng.float(
    template.initialCapital.min,
    template.initialCapital.max
  );

  // Pick preferred volatility
  const preferredVolatility = rng.pick(template.preferredSlotVolatilities);

  return {
    basePReturn,
    riskAppetite,
    betFlexibility,
    promoDependency,
    stopLossLimit,
    profitGoal,
    initialCapital,
    preferredVolatility,
  };
}

/**
 * Parameters for creating a player
 */
export interface CreatePlayerParams {
  /** Player archetype */
  archetype: ArchetypeName;
  /** Optional username (auto-generated if not provided) */
  username?: string;
  /** Optional seed for deterministic DNA generation */
  seed?: string;
}

/**
 * Create a new player in the database
 * @param params - Player creation parameters
 * @returns The created player entity
 */
export async function createPlayer(
  params: CreatePlayerParams
): Promise<Player> {
  const { archetype, username, seed } = params;

  // Generate DNA and initial capital
  const dna = generatePlayerDNA(archetype, seed);

  // Format initial capital to 2 decimal places as string (numeric type)
  const initialCapitalStr = dna.initialCapital.toFixed(2);

  // Insert player into database
  const query = `
    INSERT INTO players (
      archetype,
      status,
      wallet_balance,
      lifetime_pl,
      remaining_capital,
      dna_traits
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    archetype,
    'Idle', // New players start as Idle (will be Active on first tick if they trigger session)
    initialCapitalStr, // Wallet starts with initial capital
    '0.00', // Lifetime P/L starts at 0
    initialCapitalStr, // Remaining capital equals initial capital
    JSON.stringify(dna), // Store DNA as JSONB
  ];

  const result = await pool.query<PlayerRow>(query, values);

  if (!result.rows[0]) {
    throw new Error('Failed to create player - no row returned');
  }

  return mapPlayerRow(result.rows[0]);
}

/**
 * Retrieve all players from the database
 * @returns Array of all Player entities
 */
export async function getAllPlayers(): Promise<Player[]> {
  const query = `
    SELECT
      id, archetype, status, wallet_balance, lifetime_pl,
      remaining_capital, dna_traits, created_at, updated_at
    FROM players
    ORDER BY created_at DESC
  `;

  const result = await pool.query<PlayerRow>(query);
  return result.rows.map(mapPlayerRow);
}

/**
 * Get all players with a specific status
 * @param status - Player status to filter by
 * @returns Array of players matching the status
 */
export async function getPlayersByStatus(
  status: PlayerStatus
): Promise<Player[]> {
  const query = `
    SELECT
      id, archetype, status, wallet_balance, lifetime_pl,
      remaining_capital, dna_traits, created_at, updated_at
    FROM players
    WHERE status = $1
    ORDER BY created_at ASC
  `;

  const result = await pool.query<PlayerRow>(query, [status]);
  return result.rows.map(mapPlayerRow);
}

/**
 * Update a player's status
 * @param playerId - Player UUID
 * @param newStatus - New status to set
 */
export async function updatePlayerStatus(
  playerId: string,
  newStatus: PlayerStatus
): Promise<void> {
  const query = `
    UPDATE players
    SET status = $1, updated_at = NOW()
    WHERE id = $2
  `;

  await pool.query(query, [newStatus, playerId]);
}
