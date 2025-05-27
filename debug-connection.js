require('dotenv').config();
const { Pool } = require('pg');

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

// Test connection with individual parameters
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000
});

async function testConnection() {
  let client;
  
  try {
    console.log('\nAttempting to connect with individual parameters...');
    client = await pool.connect();
    console.log('Connected successfully!');
    
    // Run a simple query
    const result = await client.query('SELECT current_database() as db_name, version()');
    console.log('Connected to database:', result.rows[0].db_name);
    console.log('PostgreSQL version:', result.rows[0].version);
    
  } catch (error) {
    console.error('Connection error:', error.message);
    console.error('Error code:', error.code);
    
    if (error.code === 'ECONNRESET') {
      console.log('\nECONNRESET error suggests:');
      console.log('1. IP address not allowed in Supabase');
      console.log('2. Firewall blocking connection');
      console.log('3. Incorrect SSL configuration');
    }
    
    if (error.code === '28P01') {
      console.log('\nAuthentication failed - check password');
    }
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

testConnection();
