/**
 * Migration: Add world state and hour execution log tables
 * Introduces simulation time tracking with discrete hour counter
 */

export async function up(pgm) {
  // Create world_state table (singleton)
  pgm.createTable('world_state', {
    id: {
      type: 'smallint',
      primaryKey: true,
      default: 1,
      check: 'id = 1', // Enforce singleton pattern
    },

    // Simulation time tracking
    current_hour: {
      type: 'bigint',
      notNull: true,
      default: 0,
      check: 'current_hour >= 0',
    },
    total_spins: {
      type: 'bigint',
      notNull: true,
      default: 0,
      check: 'total_spins >= 0',
    },

    // RNG determinism
    master_seed: {
      type: 'text',
      notNull: true,
    },

    // Wall-clock mapping (debugging/performance)
    simulation_started_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    last_hour_completed_at: {
      type: 'timestamptz',
      notNull: false,
    },

    // Cumulative metrics
    total_house_revenue: {
      type: 'numeric',
      notNull: true,
      default: 0,
    },
    total_sessions: {
      type: 'bigint',
      notNull: true,
      default: 0,
    },

    // Lifecycle
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

  // Create hour_execution_log table (audit trail)
  pgm.createTable('hour_execution_log', {
    hour: {
      type: 'bigint',
      primaryKey: true,
    },
    status: {
      type: 'text',
      notNull: true,
      comment: 'Status: in_progress, completed, failed',
    },
    started_at: {
      type: 'timestamptz',
      notNull: true,
    },
    completed_at: {
      type: 'timestamptz',
      notNull: false,
    },
    sessions_triggered: {
      type: 'int',
      notNull: false,
    },
    total_spins: {
      type: 'bigint',
      notNull: false,
    },
    house_revenue: {
      type: 'numeric',
      notNull: false,
    },
    error: {
      type: 'text',
      notNull: false,
    },
  });

  // Create index on hour_execution_log for in_progress status queries
  pgm.createIndex('hour_execution_log', 'status', {
    name: 'idx_hour_log_status',
    where: "status = 'in_progress'",
  });

  // Initialize world state singleton
  // Use environment variable for seed if available, otherwise use default
  pgm.sql(`
    INSERT INTO world_state (id, master_seed, simulation_started_at)
    VALUES (
      1,
      COALESCE(
        current_setting('app.master_seed', true),
        'casino-lab-default'
      ),
      NOW()
    );
  `);
}

export async function down(pgm) {
  // Drop tables in reverse order
  pgm.dropTable('hour_execution_log');
  pgm.dropTable('world_state');
}
