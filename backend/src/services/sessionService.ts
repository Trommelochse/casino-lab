import { pool } from '../db/pool.js';
import { Session, SessionRow, mapSessionRow } from '../models/session.js';
import { Player } from '../models/player.js';
import { PlayerDNA } from './playerService.js';
import { SlotVolatility } from '../constants/archetypes.js';
import { createRng } from './rng.js';

/**
 * Parameters for creating a session
 */
export interface CreateSessionParams {
  playerId: string;
  initialBalance: string;
  slotVolatility: SlotVolatility;
}

/**
 * Create a new session in the database
 * @param params - Session creation parameters
 * @returns The created session entity
 */
export async function createSession(
  params: CreateSessionParams
): Promise<Session> {
  const { playerId, initialBalance, slotVolatility } = params;

  const query = `
    INSERT INTO sessions (
      player_id,
      started_at,
      initial_balance,
      slot_volatility
    )
    VALUES ($1, NOW(), $2, $3)
    RETURNING *
  `;

  const values = [playerId, initialBalance, slotVolatility];

  const result = await pool.query<SessionRow>(query, values);

  if (!result.rows[0]) {
    throw new Error('Failed to create session - no row returned');
  }

  return mapSessionRow(result.rows[0]);
}

/**
 * Get the number of sessions a player has participated in
 * @param playerId - Player UUID
 * @returns Number of sessions (completed or active)
 */
async function getPlayerSessionCount(playerId: string): Promise<number> {
  const result = await pool.query(
    'SELECT COUNT(*) FROM sessions WHERE player_id = $1',
    [playerId]
  );
  return parseInt(result.rows[0].count, 10);
}

/**
 * Determine if a player should start a session based on DNA traits and archetype
 * @param player - Player entity with DNA traits
 * @param hourSeed - Seed for deterministic RNG (combines hour seed with player ID)
 * @returns true if session should be triggered, false otherwise
 */
export async function shouldPlayerStartSession(
  player: Player,
  hourSeed: string
): Promise<boolean> {
  // Parse DNA traits
  const dna = player.dnaTraits as PlayerDNA;

  // Check if player has ever had a session
  const sessionCount = await getPlayerSessionCount(player.id);

  // Newly generated players always play first session
  if (sessionCount === 0) {
    return true;
  }

  // Bonus Hunters with high promo dependency don't play without bonuses
  if (player.archetype === 'Bonus Hunter' && dna.promoDependency >= 0.9) {
    return false; // No bonuses available in MVP
  }

  // Use seeded RNG: combines hour seed with player ID for consistency
  const rng = createRng(`${hourSeed}-trigger-${player.id}`);
  return rng.random() < dna.basePReturn;
}

/**
 * Select slot volatility for a player's session based on DNA preferences
 * @param player - Player entity with DNA traits
 * @returns Selected slot volatility
 */
export function selectVolatilityForSession(player: Player): SlotVolatility {
  const dna = player.dnaTraits as PlayerDNA;

  // Use preferredVolatility from DNA traits
  // This was already selected during player creation based on risk appetite
  return dna.preferredVolatility;
}
