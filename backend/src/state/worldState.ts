/**
 * World State Service - Manages simulation time and deterministic RNG seeding
 * Singleton pattern matching casinoState.ts
 */

import { pool } from '../db/pool.js';

export interface WorldState {
  id: number;
  currentHour: bigint;
  totalSpins: bigint;
  masterSeed: string;
  simulationStartedAt: string;
  lastHourCompletedAt: string | null;
  totalHouseRevenue: string;
  totalSessions: bigint;
  createdAt: string;
  updatedAt: string;
}

let cachedWorldState: WorldState | null = null;

/**
 * Load world state from database into memory cache.
 * This should be called once during server startup.
 */
export async function loadWorldState(): Promise<void> {
  const result = await pool.query<{
    id: number;
    current_hour: string;
    total_spins: string;
    master_seed: string;
    simulation_started_at: string;
    last_hour_completed_at: string | null;
    total_house_revenue: string;
    total_sessions: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT
      id,
      current_hour,
      total_spins,
      master_seed,
      simulation_started_at,
      last_hour_completed_at,
      total_house_revenue,
      total_sessions,
      created_at,
      updated_at
    FROM world_state
    WHERE id = 1`
  );

  if (result.rows.length === 0) {
    throw new Error(
      'World state not found in database. Please run migrations to initialize the database schema.'
    );
  }

  const row = result.rows[0];

  // Map database row to WorldState interface
  cachedWorldState = {
    id: row.id,
    currentHour: BigInt(row.current_hour),
    totalSpins: BigInt(row.total_spins),
    masterSeed: row.master_seed,
    simulationStartedAt: row.simulation_started_at,
    lastHourCompletedAt: row.last_hour_completed_at,
    totalHouseRevenue: row.total_house_revenue,
    totalSessions: BigInt(row.total_sessions),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Get the cached world state.
 * Throws if state has not been loaded yet.
 */
export function getWorldState(): WorldState {
  if (!cachedWorldState) {
    throw new Error(
      'World state not loaded yet. Server may still be initializing.'
    );
  }

  return cachedWorldState;
}

/**
 * Reload world state from database and update cache.
 * Useful for refreshing state after updates.
 */
export async function refreshWorldState(): Promise<WorldState> {
  await loadWorldState();
  return getWorldState();
}

/**
 * Increment the world hour counter in database.
 * NOTE: This should only be called within a transaction during hour tick.
 * Does NOT update the cache - call refreshWorldState() after transaction commits.
 */
export async function incrementWorldHour(): Promise<void> {
  await pool.query(
    `UPDATE world_state
     SET current_hour = current_hour + 1,
         last_hour_completed_at = NOW(),
         updated_at = NOW()
     WHERE id = 1`
  );
}

/**
 * Get simulation timestamp for a given world state.
 * Derives ISO timestamp from simulation start time + current hour offset.
 *
 * Example: If currentHour = 42 and simulationStartedAt = 2024-01-01T00:00:00Z
 *          Then result = 2024-01-02T18:00:00Z (42 hours later)
 *
 * @param worldState - World state containing current hour and start time
 * @returns ISO 8601 timestamp string representing the simulation time
 */
export function getSimulationTimestamp(worldState: WorldState): string {
  const startTime = new Date(worldState.simulationStartedAt);
  const hourOffsetMs = Number(worldState.currentHour) * 3600000; // 1 hour = 3,600,000 ms
  return new Date(startTime.getTime() + hourOffsetMs).toISOString();
}

/**
 * Get deterministic hour seed for RNG operations.
 * Format: {masterSeed}-hour-{currentHour}
 *
 * Example: "casino-lab-default-hour-42"
 *
 * @param worldState - World state containing master seed and current hour
 * @returns Seed string for hour-level RNG operations
 */
export function getHourSeed(worldState: WorldState): string {
  return `${worldState.masterSeed}-hour-${worldState.currentHour}`;
}

/**
 * Test helper - allows setting cached state without database connection.
 * @internal Only for testing purposes.
 */
export function __setWorldStateForTests(state: WorldState): void {
  cachedWorldState = state;
}

/**
 * Test helper - clears the cached state.
 * @internal Only for testing purposes.
 */
export function __clearWorldStateForTests(): void {
  cachedWorldState = null;
}
