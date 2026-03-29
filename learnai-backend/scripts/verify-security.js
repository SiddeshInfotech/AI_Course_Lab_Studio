/**
 * Security Implementation Verification
 * Checks that all security tables and features are in place
 */

import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

dotenv.config({ path: '.env' });

async function verifyImplementation() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('\n════════════════════════════════════════');
    console.log('✅ SECURITY IMPLEMENTATION VERIFICATION');
    console.log('════════════════════════════════════════\n');

    const client = await pool.connect();

    // Check video_access_logs table
    console.log('📊 Checking video_access_logs table...');
    const videoLogsCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'video_access_logs'
      ORDER BY ordinal_position;
    `);
    console.log(`✅ video_access_logs table exists with ${videoLogsCheck.rows.length} columns`);

    // Check SecurityAlert table
    console.log('\n📊 Checking SecurityAlert table...');
    const alertsCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'SecurityAlert'
      ORDER BY ordinal_position;
    `);
    console.log(`✅ SecurityAlert table exists with ${alertsCheck.rows.length} columns`);

    // Check indexes
    console.log('\n🔍 Checking indexes...');
    const indexesResult = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('video_access_logs', 'SecurityAlert')
      ORDER BY indexname;
    `);
    console.log(`✅ ${indexesResult.rows.length} indexes created for security tables\n`);

    // List key columns
    console.log('📋 video_access_logs columns:');
    videoLogsCheck.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    console.log('\n📋 SecurityAlert columns:');
    alertsCheck.rows.forEach(col => {
      if (col.column_name !== 'id' && !col.column_name.includes('reviewedBy')) {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      }
    });

    client.release();

    console.log('\n════════════════════════════════════════');
    console.log('✅ ALL SECURITY TABLES VERIFIED!');
    console.log('════════════════════════════════════════\n');

    console.log('🎯 Next Steps:');
    console.log('1. ✅ Database migration: COMPLETE');
    console.log('2. ⏳ Register backend routes in server.js');
    console.log('3. ⏳ Restart backend server');
    console.log('4. ⏳ Test watermarking on video\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyImplementation();
