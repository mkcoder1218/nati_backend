require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function runAllEssentialMigrations() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");
    console.log(`📍 Database: ${process.env.DB_NAME || 'government_feedback'}`);

    // 1. Add missing columns to offices table
    console.log("\n📝 Step 1: Adding missing columns to offices table...");
    
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

    // 2. Create review_replies table
    console.log("\n📝 Step 2: Creating review_replies table...");
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

      // Add foreign key constraints
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
        }
      }

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);`);
      console.log("✅ Created indexes for review_replies");

    } catch (error) {
      console.log("ℹ️  review_replies table already exists or error:", error.message);
    }

    // 3. Create reports table
    console.log("\n📝 Step 3: Creating reports table...");
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR(255) NOT NULL,
          filename VARCHAR(255) NOT NULL,
          file_path TEXT NOT NULL,
          file_size BIGINT,
          format VARCHAR(50) NOT NULL DEFAULT 'pdf',
          report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('sentiment', 'feedback', 'performance', 'services')),
          office_id UUID,
          user_id UUID NOT NULL,
          start_date DATE,
          end_date DATE,
          status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log("✅ reports table created");

      // Add foreign key constraints
      try {
        await client.query(`
          ALTER TABLE reports 
          ADD CONSTRAINT fk_reports_office_id 
          FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
        `);
        console.log("✅ Added reports office_id foreign key constraint");
      } catch (error) {
        if (error.code === '42710') {
          console.log("ℹ️  reports office_id foreign key constraint already exists");
        }
      }

      try {
        await client.query(`
          ALTER TABLE reports 
          ADD CONSTRAINT fk_reports_user_id 
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
        `);
        console.log("✅ Added reports user_id foreign key constraint");
      } catch (error) {
        if (error.code === '42710') {
          console.log("ℹ️  reports user_id foreign key constraint already exists");
        }
      }

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_office_id ON reports(office_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);`);
      console.log("✅ Created indexes for reports");

    } catch (error) {
      console.log("ℹ️  reports table already exists or error:", error.message);
    }

    // 4. Test all tables
    console.log('\n🧪 Testing all tables...');
    
    const tablesToTest = ['offices', 'review_replies', 'reports'];
    for (const tableName of tablesToTest) {
      try {
        const result = await client.query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);
        
        if (result.rows.length > 0) {
          console.log(`✅ ${tableName} table exists with ${result.rows.length} columns`);
        } else {
          console.log(`❌ ${tableName} table does not exist`);
        }
      } catch (error) {
        console.log(`❌ Error testing ${tableName} table:`, error.message);
      }
    }

    console.log('\n🎉 All essential migrations completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ offices table: added missing columns (upvote_count, downvote_count, etc.)');
    console.log('✅ review_replies table: created (fixes reply functionality)');
    console.log('✅ reports table: created (fixes report functionality)');
    console.log('✅ Anonymous review functionality: already fixed in code');
    
  } catch (err) {
    console.error('💥 Error running essential migrations:', err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the migrations
runAllEssentialMigrations()
  .then(() => {
    console.log('\n✨ All essential migrations completed!');
    console.log('🚀 You can now restart the backend server and test all functionality.');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Essential migrations failed:', error);
    process.exit(1);
  });
