require('dotenv').config();
const { Pool } = require('pg');

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

// SQL to create the comments table
const createCommentsTableSQL = `
CREATE TABLE IF NOT EXISTS comments (
  comment_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
`;

// SQL to update the notifications table
const updateNotificationsSQL = `
-- Check if the notifications table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        -- Update the check constraint on the notifications table to include 'comment' as a valid entity type
        BEGIN
            -- Check if the constraint exists
            IF EXISTS (
                SELECT 1 
                FROM information_schema.table_constraints 
                WHERE constraint_name = 'notifications_related_entity_type_check' 
                AND table_name = 'notifications'
            ) THEN
                -- Drop the existing constraint
                ALTER TABLE notifications DROP CONSTRAINT notifications_related_entity_type_check;
            END IF;
            
            -- Add the updated constraint with 'comment' as a valid entity type
            ALTER TABLE notifications ADD CONSTRAINT notifications_related_entity_type_check 
            CHECK (related_entity_type IS NULL OR related_entity_type IN ('review', 'office', 'service', 'user', 'comment'));
        END;
    ELSE
        RAISE NOTICE 'Notifications table does not exist, skipping constraint update';
    END IF;
END $$;
`;

async function createTables() {
  let client;
  
  try {
    console.log('Connecting to database...');
    client = await pool.connect();
    console.log('Successfully connected to database.');
    
    // Check if we can query the database
    console.log('Testing database connection...');
    const result = await client.query('SELECT current_database() as db_name, current_user as user_name');
    console.log('Connected to database:', result.rows[0].db_name);
    console.log('Connected as user:', result.rows[0].user_name);
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Check if users table exists (required for foreign key)
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'users'
      ) as exists
    `);
    
    if (!usersTableCheck.rows[0].exists) {
      console.error('Error: The users table does not exist. Cannot create comments table with foreign key.');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log('Creating comments table...');
    await client.query(createCommentsTableSQL);
    console.log('Comments table created successfully.');
    
    console.log('Updating notifications table...');
    await client.query(updateNotificationsSQL);
    console.log('Notifications table updated successfully.');
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('All operations completed successfully.');
  } catch (error) {
    console.error('Error:', error);
    
    if (client) {
      // Rollback the transaction in case of error
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error rolling back transaction:', rollbackError);
      }
    }
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
createTables();
