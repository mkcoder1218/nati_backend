require('dotenv').config();
const { Pool } = require('pg');

// Create a connection to the database using individual parameters from .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'government_feedback',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// SQL to create the comments table directly
const createCommentsTableSQL = `
DROP TABLE IF EXISTS comments;

CREATE TABLE comments (
  comment_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_status ON comments(status);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Update the notifications table constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'notifications_related_entity_type_check' 
        AND table_name = 'notifications'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_related_entity_type_check;
        
        ALTER TABLE notifications ADD CONSTRAINT notifications_related_entity_type_check 
        CHECK (related_entity_type IS NULL OR related_entity_type IN ('review', 'office', 'service', 'user', 'comment'));
    END IF;
END $$;
`;

async function createCommentsTable() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    try {
      console.log('Executing SQL to create comments table...');
      await client.query(createCommentsTableSQL);
      console.log('Comments table created successfully!');
      
      // Verify the table was created
      const result = await client.query(`
        SELECT EXISTS (
          SELECT 1 
          FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'comments'
        ) as exists
      `);
      
      console.log('Comments table exists:', result.rows[0].exists);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating comments table:', error);
  } finally {
    await pool.end();
  }
}

createCommentsTable();
