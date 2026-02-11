export const shorthands = undefined;

export async function up(pgm) {
  // Enable pgcrypto extension for UUID generation
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pgcrypto;');

  // Create players table
  pgm.createTable('players', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    archetype: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'text',
      notNull: true,
    },
    wallet_balance: {
      type: 'numeric',
      notNull: true,
      default: 0,
    },
    lifetime_pl: {
      type: 'numeric',
      notNull: true,
      default: 0,
    },
    remaining_capital: {
      type: 'numeric',
      notNull: true,
      default: 0,
    },
    dna_traits: {
      type: 'jsonb',
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

  // Create indexes on players table
  pgm.createIndex('players', 'status', {
    name: 'idx_players_status',
  });
  pgm.createIndex('players', 'archetype', {
    name: 'idx_players_archetype',
  });

  // Create casino_state table
  pgm.createTable('casino_state', {
    id: {
      type: 'smallint',
      primaryKey: true,
    },
    house_revenue: {
      type: 'numeric',
      notNull: true,
      default: 0,
    },
    active_player_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Insert initial casino_state row (safe for re-runs)
  pgm.sql(`
    INSERT INTO casino_state (id, house_revenue, active_player_count)
    VALUES (1, 0, 0)
    ON CONFLICT (id) DO NOTHING;
  `);
}

export async function down(pgm) {
  // Drop tables in reverse order
  pgm.dropTable('casino_state');
  pgm.dropTable('players');

  // Drop extension (optional, may be used by other schemas)
  pgm.sql('DROP EXTENSION IF EXISTS pgcrypto;');
}
