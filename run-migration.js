const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Create a new pool with the database connection details
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "postgres"}:${
      process.env.DB_PASSWORD || "postgres"
    }@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${
      process.env.DB_NAME || "government_feedback"
    }`,
});

async function runSpecificMigration(migrationFile) {
  const client = await pool.connect();

  try {
    console.log(`🚀 Running migration: ${migrationFile}`);

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "src",
      "db",
      "migrations",
      migrationFile
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    await client.query("BEGIN");
    await client.query(migrationSQL);
    await client.query("COMMIT");

    console.log(`✅ Migration completed successfully: ${migrationFile}`);

    // Record the migration in a migrations table (optional)
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          filename VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query(
        "INSERT INTO migrations (filename) VALUES ($1) ON CONFLICT (filename) DO NOTHING",
        [migrationFile]
      );
    } catch (err) {
      console.log(
        "Note: Could not record migration in migrations table:",
        err.message
      );
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(`❌ Migration failed: ${migrationFile}`);
    console.error("Error:", error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function runMigration() {
  try {
    console.log("🔄 Starting database migration...");

    // Get migration file from command line argument or use default
    const migrationFile =
      process.argv[2] || "007_ensure_office_assignments.sql";

    await runSpecificMigration(migrationFile);

    console.log("🎉 Migration completed successfully!");

    // If running the office assignments migration, show verification
    if (migrationFile.includes("office_assignments")) {
      console.log("\n📊 Verification:");

      // Check assigned officials
      const officialsResult = await pool.query(`
        SELECT u.email, u.full_name, o.name as office_name
        FROM users u
        LEFT JOIN offices o ON u.office_id = o.office_id
        WHERE u.role = 'official' AND u.office_id IS NOT NULL
      `);

      console.log(
        `✅ ${officialsResult.rows.length} officials assigned to offices:`
      );
      officialsResult.rows.forEach((row) => {
        console.log(`   ${row.full_name} (${row.email}) → ${row.office_name}`);
      });

      // Check offices with reviews
      const reviewsResult = await pool.query(`
        SELECT o.name, COUNT(r.review_id) as review_count
        FROM offices o
        LEFT JOIN reviews r ON o.office_id = r.office_id
        GROUP BY o.office_id, o.name
        ORDER BY review_count DESC
      `);

      console.log(`\n📝 Office review counts:`);
      reviewsResult.rows.forEach((row) => {
        console.log(`   ${row.name}: ${row.review_count} reviews`);
      });
    }
  } catch (error) {
    console.error("💥 Migration process failed:", error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Migration process completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration process failed:", err);
    process.exit(1);
  });
