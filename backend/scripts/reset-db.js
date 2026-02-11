/**
 * Database Reset Script
 * Drops and recreates the casino_dev database, then runs migrations
 *
 * Usage: npm run db:reset
 */
import { Client } from 'pg';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function resetDatabase() {
  // Parse DATABASE_URL to extract database name
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable not set');
  }

  // Extract database name from URL (postgresql://user:pass@host:port/dbname)
  const dbNameMatch = databaseUrl.match(/\/([^/?]+)(?:\?|$)/);
  const targetDb = dbNameMatch ? dbNameMatch[1] : 'casino_dev';

  console.log(`🗑️  Dropping database: ${targetDb}`);

  // Connect to 'postgres' system database to drop/create target database
  const systemDbUrl = databaseUrl.replace(`/${targetDb}`, '/postgres');
  const client = new Client({ connectionString: systemDbUrl });

  try {
    await client.connect();

    // Terminate active connections to target database
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = $1
        AND pid <> pg_backend_pid();
    `, [targetDb]);

    // Drop database
    await client.query(`DROP DATABASE IF EXISTS ${targetDb};`);
    console.log(`✅ Database dropped: ${targetDb}`);

    // Create fresh database
    await client.query(`CREATE DATABASE ${targetDb};`);
    console.log(`✅ Database created: ${targetDb}`);

  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    throw error;
  } finally {
    await client.end();
  }

  // Run migrations to set up schema and singletons
  console.log('\n📦 Running migrations...');
  try {
    execSync('npm run db:migrate', { stdio: 'inherit' });
    console.log('✅ Migrations completed');
    console.log('\n✨ Database reset successful!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Execute reset
resetDatabase().catch((error) => {
  console.error('\n💥 Database reset failed:', error);
  process.exit(1);
});
