const { Pool } = require('pg');
require('dotenv').config();

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function createOfficeVotesTable() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create enum
    console.log('Creating office_vote_type enum...');
    await client.query(`
      CREATE TYPE office_vote_type AS ENUM ('upvote', 'downvote');
    `);
    
    // Create table
    console.log('Creating office_votes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS office_votes (
        vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        office_id UUID NOT NULL,
        vote_type office_vote_type NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE,
        UNIQUE (user_id, office_id)
      );
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await client.query(`
      CREATE INDEX idx_office_votes_office_id ON office_votes(office_id);
    `);
    await client.query(`
      CREATE INDEX idx_office_votes_user_id ON office_votes(user_id);
    `);
    await client.query(`
      CREATE INDEX idx_office_votes_vote_type ON office_votes(vote_type);
    `);
    await client.query(`
      CREATE INDEX idx_office_votes_created_at ON office_votes(created_at);
    `);
    
    // Add columns to offices table
    console.log('Adding vote count columns to offices table...');
    await client.query(`
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS upvote_count INTEGER DEFAULT 0;
    `);
    await client.query(`
      ALTER TABLE offices ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0;
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Office votes table created successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error creating office votes table:', error);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Run the function
createOfficeVotesTable()
  .then(() => {
    console.log('Table creation process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Table creation process failed:', err);
    process.exit(1);
  });
