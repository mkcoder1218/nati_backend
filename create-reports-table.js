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

async function createReportsTable() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // Create reports table
    console.log("📝 Creating reports table...");
    
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
    console.log("✅ Reports table created");

    // Add foreign key constraints
    console.log("📝 Adding foreign key constraints...");
    
    try {
      await client.query(`
        ALTER TABLE reports 
        ADD CONSTRAINT fk_reports_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
      `);
      console.log("✅ Added office_id foreign key constraint");
    } catch (error) {
      if (error.code === '42710') {
        console.log("ℹ️  office_id foreign key constraint already exists");
      } else {
        console.log("⚠️  Could not add office_id foreign key constraint:", error.message);
      }
    }

    try {
      await client.query(`
        ALTER TABLE reports 
        ADD CONSTRAINT fk_reports_user_id 
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

    // Create indexes
    console.log("📝 Creating indexes...");
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_office_id ON reports(office_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);`);
    console.log("✅ Created indexes");

    // Test the table
    console.log("🧪 Testing reports table...");
    
    const testResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'reports'
      ORDER BY ordinal_position;
    `);
    
    console.log("📋 reports table structure:");
    testResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    // Test insert (dry run)
    console.log("🧪 Testing table functionality...");
    try {
      await client.query(`
        SELECT 1 FROM reports LIMIT 0;
      `);
      console.log("✅ Table is ready for use");
    } catch (error) {
      console.log("❌ Table test failed:", error.message);
    }

    console.log("🎉 reports table created successfully!");
  } catch (err) {
    console.error("💥 Error creating reports table:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the script
createReportsTable()
  .then(() => {
    console.log("✨ reports table creation completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 reports table creation failed:", error);
    process.exit(1);
  });
