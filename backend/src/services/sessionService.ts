import { pool } from '../db/pool.js';
import { Session, SessionRow, mapSessionRow } from '../models/session.js';
import { Player } from '../models/player.js';
import { PlayerDNA } from './playerService.js';
import { SlotVolatility } from '../constants/archetypes.js';

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
 * Determine if a player should start a session based on DNA traits and archetype
 * @param player - Player entity with DNA traits
 * @returns true if session should be triggered, false otherwise
 */
export function shouldPlayerStartSession(player: Player): boolean {
  // Parse DNA traits
  const dna = player.dnaTraits as PlayerDNA;

  // Bonus Hunters with high promo dependency don't play without bonuses
  if (player.archetype === 'Bonus Hunter' && dna.promoDependency >= 0.9) {
    return false; // No bonuses available in MVP
  }

  // All other players: roll RNG against basePReturn
  return Math.random() < dna.basePReturn;
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
