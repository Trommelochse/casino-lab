export const shorthands = undefined;

/**
 * Add slot_volatility column to sessions table
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function up(pgm) {
  // Add slot_volatility column
  pgm.addColumns('sessions', {
    slot_volatility: {
      type: 'text',
      notNull: false, // Allow NULL for existing sessions (pre-F-013)
      comment: 'Slot volatility selected for this session: low, medium, or high',
    },
  });

  // Add CHECK constraint to ensure valid values
  pgm.addConstraint('sessions', 'sessions_slot_volatility_check', {
    check: "slot_volatility IN ('low', 'medium', 'high') OR slot_volatility IS NULL",
  });
}

/**
 * Remove slot_volatility column from sessions table
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
export async function down(pgm) {
  pgm.dropConstraint('sessions', 'sessions_slot_volatility_check');
  pgm.dropColumns('sessions', ['slot_volatility']);
}
