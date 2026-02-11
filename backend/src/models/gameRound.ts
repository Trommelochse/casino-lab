/**
 * GameRound domain model
 * Represents a single bet/spin within a gaming session
 */

/**
 * GameRound entity with camelCase fields (domain model)
 */
export interface GameRound {
  id: string;
  sessionId: string;
  betAmount: string;
  multiplier: string;
  payout: string;
  resultingBalance: string;
  occurredAt: string;
  createdAt: string;
}

/**
 * Database row shape with snake_case columns
 */
export interface GameRoundRow {
  id: string;
  session_id: string;
  bet_amount: string;
  multiplier: string;
  payout: string;
  resulting_balance: string;
  occurred_at: string | Date;
  created_at: string | Date;
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
 * Map a database row to a GameRound entity
 */
export function mapGameRoundRow(row: GameRoundRow): GameRound {
  return {
    id: row.id,
    sessionId: row.session_id,
    betAmount: row.bet_amount,
    multiplier: row.multiplier,
    payout: row.payout,
    resultingBalance: row.resulting_balance,
    occurredAt: toISOString(row.occurred_at),
    createdAt: toISOString(row.created_at),
  };
}
