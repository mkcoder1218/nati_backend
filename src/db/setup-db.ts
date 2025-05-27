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
  // Connect to postgres database initially to create our app database
  database: "postgres",
});

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log("Connected to PostgreSQL");

    // Check if database exists
    const dbCheckResult = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = 'government_feedback'"
    );

    // Drop database if it exists
    if (dbCheckResult.rows.length > 0) {
      console.log("Dropping existing database: government_feedback");
      // Terminate all connections to the database
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'government_feedback'
        AND pid <> pg_backend_pid()
      `);
      await client.query("DROP DATABASE government_feedback");
      console.log("Database dropped successfully");
    }

    // Create database
    console.log("Creating database: government_feedback");
    await client.query("CREATE DATABASE government_feedback");
    console.log("Database created successfully");

    // Close the connection to postgres database
    await client.release();

    // Connect to our app database to run migrations
    const appPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      database: "government_feedback",
    });

    const appClient = await appPool.connect();

    try {
      console.log("Connected to government_feedback database");

      // Read and execute the migration SQL files
      const migrationFiles = [
        "001_create_tables.sql",
        "005_create_scheduled_reports_table.sql",
      ];

      console.log("Running migrations...");
      for (const migrationFile of migrationFiles) {
        const migrationPath = path.join(__dirname, "migrations", migrationFile);
        if (fs.existsSync(migrationPath)) {
          console.log(`Running migration: ${migrationFile}`);
          const migrationSQL = fs.readFileSync(migrationPath, "utf8");
          await appClient.query(migrationSQL);
          console.log(`Migration ${migrationFile} completed successfully`);
        } else {
          console.log(`Migration file ${migrationFile} not found, skipping...`);
        }
      }
      console.log("All migrations completed successfully");
    } catch (err) {
      console.error("Error running migrations:", err);
      throw err;
    } finally {
      await appClient.release();
      await appPool.end();
    }
  } catch (err) {
    console.error("Error setting up database:", err);
    throw err;
  } finally {
    await pool.end();
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log("Database setup completed");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Database setup failed:", err);
    process.exit(1);
  });
