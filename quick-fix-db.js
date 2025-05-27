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

async function quickFixDatabase() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // Add missing columns to offices table
    console.log("📝 Adding missing columns to offices table...");
    
    try {
      await client.query(`
        ALTER TABLE offices 
        ADD COLUMN IF NOT EXISTS upvote_count INTEGER DEFAULT 0;
      `);
      console.log("✅ Added upvote_count column");
    } catch (error) {
      console.log("ℹ️  upvote_count column already exists or error:", error.message);
    }

    try {
      await client.query(`
        ALTER TABLE offices 
        ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0;
      `);
      console.log("✅ Added downvote_count column");
    } catch (error) {
      console.log("ℹ️  downvote_count column already exists or error:", error.message);
    }

    try {
      await client.query(`
        ALTER TABLE offices 
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Added created_at column");
    } catch (error) {
      console.log("ℹ️  created_at column already exists or error:", error.message);
    }

    try {
      await client.query(`
        ALTER TABLE offices 
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
      `);
      console.log("✅ Added updated_at column");
    } catch (error) {
      console.log("ℹ️  updated_at column already exists or error:", error.message);
    }

    // Test the offices table
    console.log("🧪 Testing offices table...");
    const testResult = await client.query(`
      SELECT office_id, name, upvote_count, downvote_count, created_at, updated_at
      FROM offices 
      LIMIT 1;
    `);
    
    if (testResult.rows.length > 0) {
      console.log("✅ Offices table test successful:", testResult.rows[0]);
    } else {
      console.log("ℹ️  No offices found in table");
    }

    // Test service guides table
    console.log("🧪 Testing service_guides table...");
    try {
      const serviceGuidesTest = await client.query(`
        SELECT guide_id, office_id, title, language, created_at
        FROM service_guides 
        LIMIT 1;
      `);
      console.log("✅ Service guides table test successful");
    } catch (error) {
      console.log("⚠️  Service guides table issue:", error.message);
      
      // Create service_guides table if it doesn't exist
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS service_guides (
            guide_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            office_id UUID NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            language VARCHAR(20) NOT NULL DEFAULT 'english',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE
          );
        `);
        console.log("✅ Created service_guides table");
      } catch (createError) {
        console.log("❌ Failed to create service_guides table:", createError.message);
      }
    }

    console.log("🎉 Database quick fix completed successfully");
  } catch (err) {
    console.error("💥 Error fixing database:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the fix
quickFixDatabase()
  .then(() => {
    console.log("✨ Database quick fix process completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Database quick fix process failed:", error);
    process.exit(1);
  });
