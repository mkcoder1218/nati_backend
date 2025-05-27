require('dotenv').config();
const { Pool } = require('pg');

console.log('🔗 Testing Neon database connection...');

// Mask sensitive parts of the connection string for logging
const maskedUrl = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')
  : 'Not set';

console.log('📍 DATABASE_URL:', maskedUrl);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  let client;
  
  try {
    console.log('\n🔄 Attempting to connect to Neon...');
    client = await pool.connect();
    console.log('✅ Connected to Neon successfully!');
    
    // Test basic query
    console.log('\n📊 Running test queries...');
    const dbInfo = await client.query(`
      SELECT 
        current_database() as db_name, 
        current_user as user_name,
        version() as version
    `);
    
    console.log(`   Database: ${dbInfo.rows[0].db_name}`);
    console.log(`   User: ${dbInfo.rows[0].user_name}`);
    console.log(`   Version: ${dbInfo.rows[0].version.split(' ').slice(0, 2).join(' ')}`);
    
    // Check if our tables exist
    console.log('\n🔍 Checking for application tables...');
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('users', 'offices', 'reviews', 'votes', 'comments')
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('📋 Found application tables:');
      tablesResult.rows.forEach(row => {
        console.log(`   ✓ ${row.table_name}`);
      });
    } else {
      console.log('⚠️  No application tables found. You may need to run migrations.');
    }
    
    // Test a simple count query if users table exists
    const userTableExists = tablesResult.rows.some(row => row.table_name === 'users');
    if (userTableExists) {
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`👥 Users in database: ${userCount.rows[0].count}`);
    }
    
    console.log('\n🎉 Neon connection test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing Neon connection:');
    console.error('   Message:', error.message);
    
    if (error.code) {
      console.error('   Code:', error.code);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your DATABASE_URL in the .env file');
    console.log('2. Check if your Neon project is active');
    console.log('3. Ensure the connection string includes sslmode=require');
    console.log('4. Verify your Neon project has not been suspended');
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();
