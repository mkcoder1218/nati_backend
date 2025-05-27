const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

console.log("Starting notifications migration...");
console.log("Database config:", {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || "5432",
  database: process.env.DB_NAME || "government_feedback",
  user: process.env.DB_USER || "postgres",
});

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "government_feedback",
});

async function runNotificationsMigration() {
  const client = await pool.connect();

  try {
    console.log("Connected to database");

    // Check if notifications table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log("Notifications table already exists");
      return;
    }

    console.log("Notifications table does not exist. Running migration...");

    // Read the notifications migration file
    const migrationPath = path.join(
      __dirname,
      "src",
      "db",
      "migrations",
      "003_add_notifications_table.sql"
    );

    if (!fs.existsSync(migrationPath)) {
      console.error("Migration file not found:", migrationPath);
      return;
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Run the migration
    await client.query(migrationSQL);
    console.log("Notifications table migration completed successfully");

    // Check if we need to run the entity type update
    const updateMigrationPath = path.join(
      __dirname,
      "src",
      "db",
      "migrations",
      "update_notifications_entity_type.sql"
    );

    if (fs.existsSync(updateMigrationPath)) {
      console.log("Running entity type update migration...");
      const updateSQL = fs.readFileSync(updateMigrationPath, "utf8");
      await client.query(updateSQL);
      console.log("Entity type update migration completed successfully");
    }

    // Verify the table was created
    const verifyCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'notifications'
      );
    `);

    if (verifyCheck.rows[0].exists) {
      console.log("✅ Notifications table created successfully");
    } else {
      console.error("❌ Failed to create notifications table");
    }
  } catch (error) {
    console.error("Error running notifications migration:", error);
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the migration
runNotificationsMigration()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
