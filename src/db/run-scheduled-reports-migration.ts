import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "government_feedback",
});

async function runScheduledReportsMigration() {
  const client = await pool.connect();

  try {
    console.log("Connected to database");

    // Read the scheduled reports migration
    const migrationPath = path.join(__dirname, "migrations", "005_create_scheduled_reports_table.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("Running scheduled reports migration...");
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log("Scheduled reports migration completed successfully");
    
    // Check if table was created
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'scheduled_reports'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log("✅ scheduled_reports table created successfully");
    } else {
      console.log("❌ scheduled_reports table was not created");
    }

  } catch (err) {
    console.error("Error running scheduled reports migration:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the migration
runScheduledReportsMigration()
  .then(() => {
    console.log("Migration process completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration process failed:", err);
    process.exit(1);
  });
