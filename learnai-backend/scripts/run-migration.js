/**
 * Database Migration Script (ES Module)
 * Runs the security logging migration on Neon database
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigration() {
  // Read environment variables
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not found in .env');
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('🗄️  LearnAI Security Migration');
  console.log('========================================\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../migrations/001_add_security_logging.sql');
  let migrationSQL;

  try {
    migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
  } catch (err) {
    console.error('❌ ERROR: Could not read migration file:', err.message);
    process.exit(1);
  }

  // Connect to database
  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    console.log('⏳ Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Connected to Neon database');

    // Run migration
    console.log('⏳ Running migration...\n');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully!\n');

    // Verify tables
    console.log('⏳ Verifying tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('video_access_log', 'security_alert')
      ORDER BY table_name;
    `);

    if (tablesResult.rows.length === 2) {
      console.log('✅ Both tables created:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.warn('⚠️  Expected 2 tables, found:', tablesResult.rows.length);
    }

    // Check indexes
    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('video_access_log', 'security_alert')
      ORDER BY indexname;
    `);

    console.log(`✅ Indexes created: ${indexesResult.rows.length}`);
    if (indexesResult.rows.length > 0) {
      indexesResult.rows.slice(0, 3).forEach(row => {
        console.log(`   - ${row.indexname}`);
      });
      if (indexesResult.rows.length > 3) {
        console.log(`   ... and ${indexesResult.rows.length - 3} more`);
      }
    }

    client.release();

    console.log('\n========================================');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('========================================\n');
    console.log('Next steps:');
    console.log('1. Register backend routes in server.js');
    console.log('2. Restart your backend server');
    console.log('3. Test watermarking on a video\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (err.detail) {
      console.error('Details:', err.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
runMigration();
