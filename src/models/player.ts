/**
 * Player domain model
 * Matches the database schema from migrations/1707328800000_init-schema.js
 */

/**
 * Valid player status values
 */
export type PlayerStatus = 'Idle' | 'Active' | 'Broke';

/**
 * Player entity with camelCase fields (domain model)
 */
export interface Player {
  id: string;
  archetype: string;
  status: PlayerStatus;
  walletBalance: string;
  lifetimePL: string;
  remainingCapital: string;
  dnaTraits: unknown | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row shape with snake_case columns
 */
export interface PlayerRow {
  id: string;
  archetype: string;
  status: string;
  wallet_balance: string;
  lifetime_pl: string;
  remaining_capital: string;
  dna_traits: unknown | null;
  created_at: string | Date;
  updated_at: string | Date;
}

/**
 * Type guard to check if a value is a valid PlayerStatus
 */
export function isPlayerStatus(x: unknown): x is PlayerStatus {
  return x === 'Idle' || x === 'Active' || x === 'Broke';
}

/**
 * Convert a timestamp field to ISO string
 */
function toISOString(value: string | Date): string {
  if (typeof value === 'string') {
    return value;
  }
  return value.toISOString();
}

/**
 * Map a database row to a Player entity
 * @throws {Error} If status is not a valid PlayerStatus
 */
export function mapPlayerRow(row: PlayerRow): Player {
  if (!isPlayerStatus(row.status)) {
    throw new Error(
      `Invalid player status: "${row.status}". Expected one of: Idle, Active, Broke`
    );
  }

  return {
    id: row.id,
    archetype: row.archetype,
    status: row.status,
    walletBalance: row.wallet_balance,
    lifetimePL: row.lifetime_pl,
    remainingCapital: row.remaining_capital,
    dnaTraits: row.dna_traits,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}
