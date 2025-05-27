import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Create a new pool using the connection string or individual parameters
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "government_feedback",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    // Get the migration file path from command line arguments
    const migrationFilePath = process.argv[2];

    if (!migrationFilePath) {
      console.error("Please provide a migration file path");
      process.exit(1);
    }

    // Read the migration file
    const sql = fs.readFileSync(path.resolve(migrationFilePath), "utf8");

    // Begin transaction
    await client.query("BEGIN");

    // Run the migration
    await client.query(sql);

    // Commit transaction
    await client.query("COMMIT");

    console.log(`Migration ${migrationFilePath} applied successfully`);
  } catch (error) {
    // Rollback transaction on error
    await client.query("ROLLBACK");
    console.error("Error applying migration:", error);
    process.exit(1);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

runMigration();
