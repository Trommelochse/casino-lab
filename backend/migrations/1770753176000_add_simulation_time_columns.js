/**
 * Migration: Add simulation time columns to sessions and game_rounds
 * Enables querying all events within a specific simulation hour
 */

export async function up(pgm) {
  // Add columns to sessions table
  pgm.addColumns('sessions', {
    simulation_hour: {
      type: 'bigint',
      notNull: false, // Allow NULL initially for backfill
    },
    simulation_timestamp: {
      type: 'timestamptz',
      notNull: false, // Allow NULL initially for backfill
    },
  });

  // Backfill existing sessions - assign to hour 0
  pgm.sql(`
    UPDATE sessions
    SET simulation_hour = 0,
        simulation_timestamp = (SELECT simulation_started_at FROM world_state WHERE id = 1)
    WHERE simulation_hour IS NULL;
  `);

  // Make columns NOT NULL after backfill
  pgm.alterColumn('sessions', 'simulation_hour', {
    notNull: true,
  });
  pgm.alterColumn('sessions', 'simulation_timestamp', {
    notNull: true,
  });

  // Create index for simulation hour queries
  pgm.createIndex('sessions', 'simulation_hour', {
    name: 'idx_sessions_simulation_hour',
  });

  // Add simulation_hour column to game_rounds table
  pgm.addColumns('game_rounds', {
    simulation_hour: {
      type: 'bigint',
      notNull: false, // Allow NULL initially for backfill
    },
  });

  // Backfill game_rounds from parent sessions
  pgm.sql(`
    UPDATE game_rounds gr
    SET simulation_hour = s.simulation_hour
    FROM sessions s
    WHERE gr.session_id = s.id
    AND gr.simulation_hour IS NULL;
  `);

  // Make column NOT NULL after backfill
  pgm.alterColumn('game_rounds', 'simulation_hour', {
    notNull: true,
  });

  // Create index for simulation hour queries
  pgm.createIndex('game_rounds', 'simulation_hour', {
    name: 'idx_game_rounds_simulation_hour',
  });
}

export async function down(pgm) {
  // Drop indexes
  pgm.dropIndex('game_rounds', 'simulation_hour', {
    name: 'idx_game_rounds_simulation_hour',
  });
  pgm.dropIndex('sessions', 'simulation_hour', {
    name: 'idx_sessions_simulation_hour',
  });

  // Drop columns
  pgm.dropColumn('game_rounds', 'simulation_hour');
  pgm.dropColumns('sessions', ['simulation_hour', 'simulation_timestamp']);
}
