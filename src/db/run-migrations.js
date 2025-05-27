const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a new pool using the connection string from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  try {
    console.log('Running database migrations...');

    // Read and execute the create_comments_table.sql file
    const createCommentsTableSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'create_comments_table.sql'),
      'utf8'
    );
    console.log('Creating comments table...');
    await pool.query(createCommentsTableSQL);
    console.log('Comments table created successfully.');

    // Read and execute the update_notifications_entity_type.sql file
    const updateNotificationsSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'update_notifications_entity_type.sql'),
      'utf8'
    );
    console.log('Updating notifications table...');
    await pool.query(updateNotificationsSQL);
    console.log('Notifications table updated successfully.');

    console.log('All migrations completed successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the migrations
runMigrations();
