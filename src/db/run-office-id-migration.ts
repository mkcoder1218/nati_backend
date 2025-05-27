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

async function runOfficeIdMigration() {
  const client = await pool.connect();

  try {
    console.log("Connected to database");

    // Read the office_id migration
    const migrationPath = path.join(__dirname, "migrations", "006_add_office_id_to_users.sql");
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    console.log("Running office_id migration...");
    
    // Execute migration
    await client.query(migrationSQL);
    
    console.log("Office_id migration completed successfully");
    
    // Check if column was added
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
      AND column_name = 'office_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log("✅ office_id column added successfully to users table");
    } else {
      console.log("❌ office_id column was not added");
    }

  } catch (err) {
    console.error("Error running office_id migration:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the migration
runOfficeIdMigration()
  .then(() => {
    console.log("Migration process completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration process failed:", err);
    process.exit(1);
  });
