const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createReviewRepliesTable() {
  const client = await pool.connect();
  
  try {
    console.log('Creating review_replies table...');
    
    const createTableSQL = `
      -- Create review_replies table
      CREATE TABLE IF NOT EXISTS review_replies (
        reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        review_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );

      -- Create index on review_id for faster lookups
      CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);

      -- Create index on user_id for faster lookups
      CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);

      -- Create index on created_at for sorting
      CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at);
    `;
    
    await client.query(createTableSQL);
    console.log('Successfully created review_replies table and indexes');
    
    // Check if table was created
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'review_replies'
    `);
    
    if (checkTable.rows.length > 0) {
      console.log('✅ review_replies table exists');
    } else {
      console.log('❌ review_replies table was not created');
    }
    
  } catch (error) {
    console.error('Error creating review_replies table:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

createReviewRepliesTable();
