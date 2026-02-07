import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. Please configure your .env file.'
  );
}

const maxConnections = process.env.DB_POOL_MAX
  ? parseInt(process.env.DB_POOL_MAX, 10)
  : 10;

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: maxConnections,
  connectionTimeoutMillis: 5000,
});

// Handle pool errors to prevent crashes
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function closePool(): Promise<void> {
  await pool.end();
}
