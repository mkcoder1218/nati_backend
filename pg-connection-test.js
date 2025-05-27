/**
 * Simple PostgreSQL connection test for Supabase
 * 
 * This script:
 * 1. Connects to Supabase using the PostgreSQL connection string
 * 2. Runs a simple query to verify the connection
 * 
 * Usage:
 * node pg-connection-test.js <postgresql-connection-string>
 * 
 * Example:
 * node pg-connection-test.js postgresql://postgres:password@db.example.supabase.co:5432/postgres
 */

const { Pool } = require('pg');

// Get PostgreSQL connection string from command line
const connectionString = process.argv[2];

if (!connectionString) {
  console.error('Error: PostgreSQL connection string is required');
  console.log('Usage: node pg-connection-test.js <postgresql-connection-string>');
  console.log('Example: node pg-connection-test.js postgresql://postgres:password@db.example.supabase.co:5432/postgres');
  process.exit(1);
}

console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':***@'));

// Create a connection pool with detailed error logging
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
  // Set a longer connection timeout
  connectionTimeoutMillis: 10000
});

// Add error handler for the pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

async function testConnection() {
  let client;
  
  try {
    console.log('Attempting to connect...');
    client = await pool.connect();
    console.log('Connected successfully!');
    
    // Run a simple query
    console.log('Running test query...');
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name, version() as pg_version');
    console.log('Connected to database:', result.rows[0].db_name);
    console.log('Connected as user:', result.rows[0].user_name);
    console.log('PostgreSQL version:', result.rows[0].pg_version);
    
    // List schemas
    console.log('\nListing schemas:');
    const schemasResult = await client.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      ORDER BY schema_name
    `);
    
    schemasResult.rows.forEach(row => {
      console.log(`- ${row.schema_name}`);
    });
    
    // List tables in public schema
    console.log('\nListing tables in public schema:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in public schema.');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
    console.log('\nConnection test successful!');
  } catch (error) {
    console.error('Connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Provide troubleshooting tips based on error
    if (error.code === 'ECONNREFUSED') {
      console.log('\nTroubleshooting tips for connection refused:');
      console.log('1. Check if the host name and port are correct');
      console.log('2. Check if there\'s a firewall blocking the connection');
      console.log('3. Check if the database server is running');
    }
    
    if (error.code === 'ENOTFOUND') {
      console.log('\nTroubleshooting tips for host not found:');
      console.log('1. Check if the host name is correct');
      console.log('2. Check if there are DNS resolution issues');
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\nTroubleshooting tips for connection timeout:');
      console.log('1. Check if there are network connectivity issues');
      console.log('2. Check if there\'s a firewall blocking the connection');
      console.log('3. Check if your IP address is allowed in Supabase');
      console.log('   - Go to Supabase Dashboard > Project Settings > Database > Connection Pooling');
      console.log('   - Add your IP address to the allowlist');
    }
    
    if (error.message.includes('password authentication failed')) {
      console.log('\nTroubleshooting tips for authentication failure:');
      console.log('1. Check if the username and password are correct');
      console.log('2. If your password contains special characters, make sure they\'re properly URL-encoded:');
      console.log('   - @ becomes %40');
      console.log('   - # becomes %23');
      console.log('   - $ becomes %24');
      console.log('   - & becomes %26');
      console.log('   - + becomes %2B');
    }
    
    if (error.message.includes('no pg_hba.conf entry')) {
      console.log('\nTroubleshooting tips for access denied:');
      console.log('1. Your IP address is not in the allowlist');
      console.log('2. Go to Supabase Dashboard > Project Settings > Database > Connection Pooling');
      console.log('3. Add your IP address to the allowlist');
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();
