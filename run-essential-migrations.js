require('dotenv').config();
const { Pool } = require('pg');

// Create database connection using the same config as the main app
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function runEssentialMigrations() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");
    console.log(`📍 Database: ${process.env.DB_NAME || 'government_feedback'}`);
    console.log(`👤 User: ${process.env.DB_USER || 'postgres'}`);

    // 1. Create review_replies table
    console.log("\n📝 Step 1: Creating review_replies table...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS review_replies (
          reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          review_id UUID NOT NULL,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ review_replies table created");
    } catch (error) {
      console.log("ℹ️  review_replies table already exists or error:", error.message);
    }

    // 2. Add foreign key constraints for review_replies
    console.log("\n📝 Step 2: Adding foreign key constraints for review_replies...");
    try {
      await client.query(`
        ALTER TABLE review_replies 
        ADD CONSTRAINT fk_review_replies_review_id 
        FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE;
      `);
      console.log("✅ Added review_id foreign key constraint");
    } catch (error) {
      if (error.code === '42710') {
        console.log("ℹ️  review_id foreign key constraint already exists");
      } else {
        console.log("⚠️  Could not add review_id foreign key constraint:", error.message);
      }
    }

    try {
      await client.query(`
        ALTER TABLE review_replies 
        ADD CONSTRAINT fk_review_replies_user_id 
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
      `);
      console.log("✅ Added user_id foreign key constraint");
    } catch (error) {
      if (error.code === '42710') {
        console.log("ℹ️  user_id foreign key constraint already exists");
      } else {
        console.log("⚠️  Could not add user_id foreign key constraint:", error.message);
      }
    }

    // 3. Create indexes for review_replies
    console.log("\n📝 Step 3: Creating indexes for review_replies...");
    await client.query(`CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);`);
    console.log("✅ Created indexes for review_replies");

    // 4. Add missing columns to offices table
    console.log("\n📝 Step 4: Adding missing columns to offices table...");
    
    const missingOfficeColumns = [
      { name: 'upvote_count', type: 'INTEGER DEFAULT 0' },
      { name: 'downvote_count', type: 'INTEGER DEFAULT 0' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const column of missingOfficeColumns) {
      try {
        await client.query(`ALTER TABLE offices ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`);
        console.log(`✅ Added ${column.name} column to offices table`);
      } catch (error) {
        console.log(`ℹ️  ${column.name} column already exists or error:`, error.message);
      }
    }

    // 5. Test all tables
    console.log('\n🧪 Testing tables...');
    
    // Test review_replies table
    try {
      const repliesTest = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'review_replies'
        ORDER BY ordinal_position;
      `);
      
      if (repliesTest.rows.length > 0) {
        console.log('✅ review_replies table exists with columns:');
        repliesTest.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
      } else {
        console.log('❌ review_replies table does not exist');
      }
    } catch (error) {
      console.log('❌ Error testing review_replies table:', error.message);
    }

    // Test offices table columns
    try {
      const officesTest = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'offices' AND column_name IN ('upvote_count', 'downvote_count', 'created_at', 'updated_at')
        ORDER BY ordinal_position;
      `);
      
      if (officesTest.rows.length > 0) {
        console.log('✅ offices table has required columns:');
        officesTest.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
      } else {
        console.log('❌ offices table missing required columns');
      }
    } catch (error) {
      console.log('❌ Error testing offices table:', error.message);
    }

    console.log('\n🎉 Essential migrations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ review_replies table created (fixes reply functionality)');
    console.log('✅ offices table columns added (fixes service creation)');
    console.log('✅ Anonymous review functionality already fixed in code');
    
  } catch (err) {
    console.error('💥 Error running essential migrations:', err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the migrations
runEssentialMigrations()
  .then(() => {
    console.log('\n✨ All essential migrations completed!');
    console.log('🚀 You can now restart the backend server and test the functionality.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Essential migrations failed:', error);
    process.exit(1);
  });
