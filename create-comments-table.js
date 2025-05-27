require('dotenv').config();
const { Pool } = require('pg');

// Create a connection to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
-- Update the check constraint on the notifications table to include 'comment' as a valid entity type
DO $$
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
END $$;
`;

async function runMigration() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Creating comments table...');
    await client.query(createCommentsTableSQL);
    console.log('Comments table created successfully.');
    
    console.log('Updating notifications table...');
    await client.query(updateNotificationsSQL);
    console.log('Notifications table updated successfully.');
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Error running migration:', error);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Run the migration
runMigration();
