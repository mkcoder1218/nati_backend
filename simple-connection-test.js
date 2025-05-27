/**
 * Simple script to test connection to Supabase
 * 
 * This script:
 * 1. Takes a connection string as a command line argument
 * 2. Attempts to connect to the database
 * 3. Runs a simple query
 * 
 * Usage:
 * node simple-connection-test.js <connection-string>
 */

const { Pool } = require('pg');

// Get connection string from command line
const connectionString = process.argv[2];

if (!connectionString) {
  console.error('Error: Connection string is required');
  console.log('Usage: node simple-connection-test.js <connection-string>');
  process.exit(1);
}

console.log('Testing connection to:', connectionString.replace(/:[^:@]+@/, ':***@'));

// Create a connection pool with detailed error logging
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
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
    const result = await client.query('SELECT current_database() as db_name');
    console.log('Connected to database:', result.rows[0].db_name);
    
    console.log('Connection test successful!');
  } catch (error) {
    console.error('Connection error:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Provide troubleshooting tips based on error
    if (error.message.includes('ECONNRESET')) {
      console.log('\nTroubleshooting tips for ECONNRESET:');
      console.log('1. Check if your IP address is allowed in Supabase');
      console.log('   - Go to Supabase Dashboard > Project Settings > Database > Connection Pooling');
      console.log('   - Add your current IP address to the allowed list');
      console.log('2. Check if there\'s a firewall blocking the connection');
      console.log('3. Try connecting from a different network');
    }
    
    if (error.message.includes('password authentication failed')) {
      console.log('\nTroubleshooting tips for authentication failure:');
      console.log('1. Double-check your password');
      console.log('2. If your password contains special characters, make sure they\'re properly encoded');
      console.log('3. Try resetting your database password in Supabase Dashboard > Project Settings > Database');
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();
