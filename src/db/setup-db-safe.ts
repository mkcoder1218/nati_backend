import { Pool } from "pg";
import dotenv from "dotenv";
import { runMigrations } from "./migrate";

dotenv.config();

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  // Connect to postgres database initially to create our app database
  database: "postgres",
});

async function setupDatabaseSafe() {
  const client = await pool.connect();

  try {
    console.log("Connected to PostgreSQL");

    // Check if database exists
    const dbCheckResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'government_feedback'"
    );

    // Create database if it doesn't exist
    if (dbCheckResult.rows.length === 0) {
      console.log("Creating database: government_feedback");
      await client.query("CREATE DATABASE government_feedback");
      console.log("Database created successfully");
    } else {
      console.log("Database government_feedback already exists");
    }

    // Close the connection to postgres database
    await client.release();
    await pool.end();

    // Run migrations on the app database
    console.log("Running migrations...");
    await runMigrations();
    
  } catch (err) {
    console.error("Error setting up database:", err);
    throw err;
  }
}

// Run the setup
setupDatabaseSafe()
  .then(() => {
    console.log("Database setup completed safely");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database setup failed:", err);
    process.exit(1);
  });
