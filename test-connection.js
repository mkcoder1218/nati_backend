require("dotenv").config();
const { Pool } = require("pg");

console.log("Testing Supabase connection...");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Set" : "Not set");
console.log("DB_HOST:", process.env.DB_HOST);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  try {
    console.log("Attempting to connect...");
    const client = await pool.connect();
    console.log("✅ Connected successfully!");

    const result = await client.query("SELECT NOW() as current_time");
    console.log("✅ Query successful:", result.rows[0].current_time);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log(`Found ${tablesResult.rows.length} tables:`);
    tablesResult.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    if (tablesResult.rows.length === 0) {
      console.log("⚠️  No tables found. You need to run the migration first.");
      console.log("Run: node migrate-to-supabase.js export");
      console.log(
        'Then: node migrate-to-supabase.js import "your-connection-string"'
      );
    }

    client.release();
    await pool.end();
    console.log("✅ Connection test completed successfully!");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("Error details:", error);
  }
}

testConnection();
