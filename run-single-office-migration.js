const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config();

// Database configuration
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    process.env.DATABASE_URL_NEON ||
    "postgresql://postgres:password@localhost:5432/negari_db",
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log(
      "🔄 Starting migration to revert to single office assignment..."
    );

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "src",
      "db",
      "migrations",
      "011_revert_to_single_office_assignment.sql"
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    await client.query(migrationSQL);

    console.log("✅ Migration completed successfully!");
    console.log("📋 Summary:");
    console.log(
      "   - Reverted to single office assignment for government officials"
    );
    console.log(
      "   - Each government official can now only be assigned to one office"
    );
    console.log(
      "   - Multiple office assignment functionality has been removed"
    );
    console.log(
      "   - Backup of user_office_assignments table created as user_office_assignments_backup"
    );
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("Full error:", error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);
