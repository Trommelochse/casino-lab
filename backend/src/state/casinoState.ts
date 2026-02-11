import { pool } from '../db/pool.js';

export interface CasinoState {
  id: number;
  house_revenue: string;
  active_player_count: number;
  updated_at: string;
}

let cachedState: CasinoState | null = null;

/**
 * Load casino state from database into memory cache.
 * This should be called once during server startup.
 */
export async function loadCasinoState(): Promise<void> {
  const result = await pool.query<CasinoState>(
    'SELECT id, house_revenue, active_player_count, updated_at FROM casino_state WHERE id = 1'
  );

  if (result.rows.length === 0) {
    throw new Error(
      'Casino state not found in database. Please run migrations to initialize the database schema.'
    );
  }

  cachedState = result.rows[0];
}

/**
 * Get the cached casino state.
 * Throws if state has not been loaded yet.
 */
export function getCasinoState(): CasinoState {
  if (!cachedState) {
    throw new Error(
      'Casino state not loaded yet. Server may still be initializing.'
    );
  }

  return cachedState;
}

/**
 * Reload casino state from database and update cache.
 * Useful for refreshing state after updates.
 */
export async function refreshCasinoState(): Promise<CasinoState> {
  await loadCasinoState();
  return getCasinoState();
}

/**
 * Test helper - allows setting cached state without database connection.
 * @internal Only for testing purposes.
 */
export function __setCasinoStateForTests(state: CasinoState): void {
  cachedState = state;
}

/**
 * Test helper - clears the cached state.
 * @internal Only for testing purposes.
 */
export function __clearCasinoStateForTests(): void {
  cachedState = null;
}
