export const shorthands = undefined;

export async function up(pgm) {
  // Create sessions table
  pgm.createTable('sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    player_id: {
      type: 'uuid',
      notNull: true,
      references: 'players(id)',
      onDelete: 'CASCADE',
    },
    started_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    ended_at: {
      type: 'timestamptz',
      notNull: false,
    },
    initial_balance: {
      type: 'numeric',
      notNull: true,
    },
    final_balance: {
      type: 'numeric',
      notNull: false,
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create indexes on sessions table
  pgm.createIndex('sessions', 'player_id', {
    name: 'idx_sessions_player_id',
  });
  pgm.createIndex('sessions', 'started_at', {
    name: 'idx_sessions_started_at',
  });

  // Create game_rounds table
  pgm.createTable('game_rounds', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    session_id: {
      type: 'uuid',
      notNull: true,
      references: 'sessions(id)',
      onDelete: 'CASCADE',
    },
    bet_amount: {
      type: 'numeric',
      notNull: true,
      check: 'bet_amount > 0',
    },
    multiplier: {
      type: 'numeric',
      notNull: true,
      check: 'multiplier >= 0',
    },
    payout: {
      type: 'numeric',
      notNull: true,
      check: 'payout >= 0',
    },
    resulting_balance: {
      type: 'numeric',
      notNull: true,
      check: 'resulting_balance >= 0',
    },
    occurred_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Create indexes on game_rounds table
  pgm.createIndex('game_rounds', 'session_id', {
    name: 'idx_game_rounds_session_id',
  });
  pgm.createIndex('game_rounds', 'occurred_at', {
    name: 'idx_game_rounds_occurred_at',
  });
}

export async function down(pgm) {
  // Drop tables in reverse order to respect FK constraints
  pgm.dropTable('game_rounds');
  pgm.dropTable('sessions');
}
