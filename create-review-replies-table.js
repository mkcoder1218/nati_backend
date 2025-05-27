const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'government_feedback'
});

async function createReviewRepliesTable() {
  try {
    console.log('Creating review_replies table...');
    
    // Create the review_replies table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_replies (
        reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        review_id UUID NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `);
    
    console.log('✅ review_replies table created successfully');
    
    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at)
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Verify the table was created
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'review_replies' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 review_replies table structure:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createReviewRepliesTable();
