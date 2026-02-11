/**
 * Session domain model
 * Tracks player gaming sessions with start/end times and balance snapshots
 */

import { SlotVolatility } from '../constants/archetypes.js';

/**
 * Session entity with camelCase fields (domain model)
 */
export interface Session {
  id: string;
  playerId: string;
  startedAt: string;
  endedAt: string | null;
  initialBalance: string;
  finalBalance: string | null;
  slotVolatility: SlotVolatility | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Database row shape with snake_case columns
 */
export interface SessionRow {
  id: string;
  player_id: string;
  started_at: string | Date;
  ended_at: string | Date | null;
  initial_balance: string;
  final_balance: string | null;
  slot_volatility: 'low' | 'medium' | 'high' | null;
  created_at: string | Date;
  updated_at: string | Date;
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
 * Convert a nullable timestamp field to ISO string or null
 */
function toISOStringOrNull(value: string | Date | null): string | null {
  if (value === null) {
    return null;
  }
  return toISOString(value);
}

/**
 * Map a database row to a Session entity
 */
export function mapSessionRow(row: SessionRow): Session {
  return {
    id: row.id,
    playerId: row.player_id,
    startedAt: toISOString(row.started_at),
    endedAt: toISOStringOrNull(row.ended_at),
    initialBalance: row.initial_balance,
    finalBalance: row.final_balance,
    slotVolatility: row.slot_volatility,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
  };
}
