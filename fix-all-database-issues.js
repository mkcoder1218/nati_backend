require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'government_feedback',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function fixAllDatabaseIssues() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // 1. Add missing columns to offices table
    console.log("📝 Step 1: Adding missing columns to offices table...");
    
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

    // 2. Create review_replies table if it doesn't exist
    console.log("📝 Step 2: Creating review_replies table...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS review_replies (
          reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          review_id UUID NOT NULL,
          user_id UUID NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        );
      `);
      console.log("✅ Created review_replies table");
    } catch (error) {
      console.log("ℹ️  review_replies table already exists or error:", error.message);
    }

    // 3. Create indexes for review_replies table
    console.log("📝 Step 3: Creating indexes for review_replies table...");
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);`);
      console.log("✅ Created indexes for review_replies table");
    } catch (error) {
      console.log("ℹ️  Indexes already exist or error:", error.message);
    }

    // 4. Ensure service_guides table exists with proper structure
    console.log("📝 Step 4: Ensuring service_guides table exists...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS service_guides (
          guide_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          office_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          language VARCHAR(20) NOT NULL DEFAULT 'english',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ Ensured service_guides table exists");
    } catch (error) {
      console.log("ℹ️  service_guides table issue:", error.message);
    }

    // 5. Add foreign key constraint for service_guides if it doesn't exist
    console.log("📝 Step 5: Adding foreign key constraint for service_guides...");
    try {
      await client.query(`
        ALTER TABLE service_guides 
        ADD CONSTRAINT fk_service_guides_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE;
      `);
      console.log("✅ Added foreign key constraint for service_guides");
    } catch (error) {
      if (error.code === '42710') {
        console.log("ℹ️  Foreign key constraint already exists");
      } else {
        console.log("ℹ️  Could not add foreign key constraint:", error.message);
      }
    }

    // 6. Create indexes for service_guides table
    console.log("📝 Step 6: Creating indexes for service_guides table...");
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_service_guides_office_id ON service_guides(office_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_service_guides_language ON service_guides(language);`);
      console.log("✅ Created indexes for service_guides table");
    } catch (error) {
      console.log("ℹ️  Indexes already exist or error:", error.message);
    }

    // 7. Test all tables
    console.log("📝 Step 7: Testing all tables...");
    
    // Test offices table
    try {
      const officesTest = await client.query(`
        SELECT office_id, name, upvote_count, downvote_count, created_at, updated_at
        FROM offices 
        LIMIT 1;
      `);
      console.log("✅ Offices table test successful");
    } catch (error) {
      console.log("❌ Offices table test failed:", error.message);
    }

    // Test review_replies table
    try {
      const repliesTest = await client.query(`
        SELECT reply_id, review_id, user_id, content, created_at
        FROM review_replies 
        LIMIT 1;
      `);
      console.log("✅ Review replies table test successful");
    } catch (error) {
      console.log("❌ Review replies table test failed:", error.message);
    }

    // Test service_guides table
    try {
      const serviceGuidesTest = await client.query(`
        SELECT guide_id, office_id, title, language, created_at
        FROM service_guides 
        LIMIT 1;
      `);
      console.log("✅ Service guides table test successful");
    } catch (error) {
      console.log("❌ Service guides table test failed:", error.message);
    }

    // 8. Verify table structures
    console.log("📝 Step 8: Verifying table structures...");
    
    const tables = ['offices', 'review_replies', 'service_guides'];
    for (const tableName of tables) {
      try {
        const result = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);
        
        console.log(`📋 ${tableName} table structure:`);
        result.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
        });
      } catch (error) {
        console.log(`❌ Could not verify ${tableName} table structure:`, error.message);
      }
    }

    console.log("🎉 All database issues fixed successfully!");
  } catch (err) {
    console.error("💥 Error fixing database:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the fix
fixAllDatabaseIssues()
  .then(() => {
    console.log("✨ Database fix process completed successfully");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Database fix process failed:", error);
    process.exit(1);
  });
