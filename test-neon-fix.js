require('dotenv').config();
const { Pool } = require('pg');

console.log('🔧 Testing Neon Database Connection with Fixes...\n');

// Display connection info (masked)
const dbUrl = process.env.DATABASE_URL || '';
console.log('Database URL:', dbUrl.replace(/:([^:@]+)@/, ':****@'));

// Create optimized pool for Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Optimized settings for Neon
  max: 5, // Lower max connections
  min: 1, // Keep at least 1 connection alive
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  acquireTimeoutMillis: 30000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

async function testNeonConnection() {
  let client;
  
  try {
    console.log('⏳ Attempting to connect to Neon database...');
    
    // Try to get a client from the pool
    client = await pool.connect();
    console.log('✅ Successfully connected to Neon database!');
    
    // Test basic query
    console.log('⏳ Testing basic query...');
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query successful!');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
    
    // Test if tables exist
    console.log('⏳ Checking if tables exist...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ Tables found:');
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('⚠️  No tables found. Database might need migration.');
    }
    
    // Test service guides query specifically
    console.log('⏳ Testing service guides query...');
    try {
      const serviceGuidesResult = await client.query('SELECT COUNT(*) as count FROM service_guides');
      console.log(`✅ Service guides table accessible. Count: ${serviceGuidesResult.rows[0].count}`);
    } catch (error) {
      console.log(`❌ Service guides table error: ${error.message}`);
    }
    
    console.log('\n🎉 All tests passed! Neon connection is working.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error code:', error.code);
    
    // Provide specific troubleshooting based on error
    if (error.code === 'ECONNRESET') {
      console.log('\n🔧 ECONNRESET Troubleshooting:');
      console.log('1. Your Neon database might be in sleep mode (free tier)');
      console.log('2. Try accessing your Neon dashboard to wake it up');
      console.log('3. Check if your IP is whitelisted in Neon settings');
      console.log('4. Verify your connection string is correct');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 ENOTFOUND Troubleshooting:');
      console.log('1. Check your internet connection');
      console.log('2. Verify the Neon hostname in your DATABASE_URL');
    } else if (error.code === '28P01') {
      console.log('\n🔧 Authentication Error:');
      console.log('1. Check your database password in DATABASE_URL');
      console.log('2. Verify your Neon project credentials');
    }
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the test
testNeonConnection().catch(console.error);
