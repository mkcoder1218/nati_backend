const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', '002_add_office_votes.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Split the SQL into individual statements
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim() !== '');
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`Executing statement ${i + 1}/${statements.length}`);
          await client.query(statement + ';');
        } catch (error) {
          console.error(`Error executing statement ${i + 1}:`, error);
          throw error;
        }
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Migration applied successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error applying migration:', error);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });
