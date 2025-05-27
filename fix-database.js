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

async function fixDatabase() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // Add missing columns to offices table
    console.log("📝 Adding missing columns to offices table...");
    
    await client.query(`
      ALTER TABLE offices 
      ADD COLUMN IF NOT EXISTS upvote_count INTEGER DEFAULT 0;
    `);
    console.log("✅ Added upvote_count column");

    await client.query(`
      ALTER TABLE offices 
      ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0;
    `);
    console.log("✅ Added downvote_count column");

    await client.query(`
      ALTER TABLE offices 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("✅ Added created_at column");

    await client.query(`
      ALTER TABLE offices 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log("✅ Added updated_at column");

    // Ensure service_guides table exists
    console.log("📝 Ensuring service_guides table exists...");
    
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
    console.log("✅ Service guides table ensured");

    // Add foreign key constraint if it doesn't exist
    try {
      await client.query(`
        ALTER TABLE service_guides 
        ADD CONSTRAINT fk_service_guides_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE;
      `);
      console.log("✅ Added foreign key constraint");
    } catch (error) {
      if (error.code === '42710') {
        console.log("ℹ️  Foreign key constraint already exists");
      } else {
        console.log("⚠️  Could not add foreign key constraint:", error.message);
      }
    }

    // Create indexes if they don't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_service_guides_office_id ON service_guides(office_id);
    `);
    console.log("✅ Added service_guides office_id index");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_service_guides_language ON service_guides(language);
    `);
    console.log("✅ Added service_guides language index");

    // Verify the tables
    const officesResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'offices'
      ORDER BY ordinal_position;
    `);
    
    console.log("📋 Offices table structure:");
    officesResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    const serviceGuidesResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'service_guides'
      ORDER BY ordinal_position;
    `);
    
    console.log("📋 Service guides table structure:");
    serviceGuidesResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });

    console.log("🎉 Database fix completed successfully");
  } catch (err) {
    console.error("💥 Error fixing database:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the fix
fixDatabase()
  .then(() => {
    console.log("✨ Database fix process completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Database fix process failed:", error);
    process.exit(1);
  });
