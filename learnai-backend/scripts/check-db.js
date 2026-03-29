/**
 * Check Database Tables
 * Lists all existing tables in your database
 */

import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Load environment
dotenv.config({ path: '.env' });

async function checkDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('\n========================================');
    console.log('📊 Database Tables Overview');
    console.log('========================================\n');

    const client = await pool.connect();

    // List all tables
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    if (result.rows.length === 0) {
      console.log('⚠️  No tables found in public schema');
    } else {
      console.log(`Found ${result.rows.length} tables:\n`);
      result.rows.forEach(row => {
        console.log(`  ✓ ${row.table_name}`);
      });
    }

    // Check for users table specifically
    const usersCheck = result.rows.find(r => r.table_name === 'users');

    console.log('\n========================================');
    if (usersCheck) {
      console.log('✅ users table EXISTS');
    } else {
      console.log('❌ users table NOT FOUND');
      console.log('\nThe migration needs the users table to exist.');
      console.log('You need to  run your existing app migrations first.');
    }
    console.log('========================================\n');

    client.release();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkDatabase();
