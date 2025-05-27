require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a connection to the database using individual parameters from .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'government_feedback',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  // Add a timeout to avoid hanging
  connectionTimeoutMillis: 5000,
});

// Log the connection details (with password masked)
console.log('Database connection details:');
console.log('Host:', process.env.DB_HOST || 'localhost');
console.log('Port:', process.env.DB_PORT || '5432');
console.log('Database:', process.env.DB_NAME || 'government_feedback');
console.log('User:', process.env.DB_USER || 'postgres');
console.log('Password:', '*'.repeat((process.env.DB_PASSWORD || 'postgres').length));

async function debugDatabase() {
  let client;
  
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Successfully connected to database.');
    
    // Check if we can query the database
    console.log('Testing database connection...');
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name, current_schema as schema_name');
    console.log('Connected to database:', result.rows[0].db_name);
    console.log('Connected as user:', result.rows[0].user_name);
    console.log('Current schema:', result.rows[0].schema_name);
    
    // List all schemas
    console.log('\nListing all schemas:');
    const schemas = await client.query('SELECT schema_name FROM information_schema.schemata');
    schemas.rows.forEach(row => console.log('- Schema:', row.schema_name));
    
    // List all tables in the public schema
    console.log('\nListing all tables in the public schema:');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    tables.rows.forEach(row => console.log('- Table:', row.table_name));
    
    // Check if users table exists
    console.log('\nChecking if users table exists:');
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
      ) as exists
    `);
    console.log('Users table exists:', usersTableCheck.rows[0].exists);
    
    // Check if comments table exists
    console.log('\nChecking if comments table exists:');
    const commentsTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'comments'
      ) as exists
    `);
    console.log('Comments table exists:', commentsTableCheck.rows[0].exists);
    
    // If comments table doesn't exist, create it
    if (!commentsTableCheck.rows[0].exists) {
      console.log('\nCreating comments table...');
      
      // Read the SQL file
      const sqlFilePath = path.join(__dirname, 'create_comments_with_schema.sql');
      const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
      
      // Execute the SQL
      await client.query(sqlContent);
      
      // Check if comments table exists now
      const commentsTableCheckAfter = await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'comments'
        ) as exists
      `);
      console.log('Comments table created successfully:', commentsTableCheckAfter.rows[0].exists);
    }
    
    console.log('\nAll operations completed successfully.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (client) {
      // Release the client back to the pool
      client.release();
    }
    
    // Close the pool
    try {
      await pool.end();
    } catch (endError) {
      console.error('Error closing pool:', endError);
    }
  }
}

// Run the function
debugDatabase();
