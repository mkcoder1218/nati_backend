import { Pool } from "pg";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Create a new pool with the database connection details
// Support both DATABASE_URL (Neon) and individual parameters (local)
const createPool = () => {
  if (process.env.DATABASE_URL) {
    console.log("Using DATABASE_URL for migration (Neon)");
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });
  }

  console.log("Using individual connection parameters (Local)");
  return new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "government_feedback",
  });
};

const pool = createPool();

interface Migration {
  id: number;
  filename: string;
  executed_at: Date;
}

async function createMigrationsTable(client: any) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await client.query(createTableQuery);
  console.log("Migrations table created or already exists");
}

async function getExecutedMigrations(client: any): Promise<string[]> {
  const result = await client.query(
    "SELECT filename FROM migrations ORDER BY id"
  );
  return result.rows.map((row: any) => row.filename);
}

async function recordMigration(client: any, filename: string) {
  await client.query("INSERT INTO migrations (filename) VALUES ($1)", [
    filename,
  ]);
}

async function runMigrations() {
  console.log("Starting migration process...");

  // Retry connection for Neon (may be sleeping)
  let client;
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      console.log(`Connection attempt ${retryCount + 1}/${maxRetries}...`);
      client = await pool.connect();
      console.log("Connected to database successfully");
      break;
    } catch (error: any) {
      retryCount++;
      console.error(`Connection attempt ${retryCount} failed:`, error.message);

      if (retryCount === maxRetries) {
        throw new Error(
          `Failed to connect after ${maxRetries} attempts: ${error.message}`
        );
      }

      console.log("Retrying in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  if (!client) {
    throw new Error("Failed to establish database connection");
  }

  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable(client);

    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(client);
    console.log("Previously executed migrations:", executedMigrations);

    // Get all migration files
    const migrationsDir = path.join(__dirname, "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort(); // Sort to ensure proper order

    console.log("Available migration files:", migrationFiles);

    // Run pending migrations
    for (const migrationFile of migrationFiles) {
      if (!executedMigrations.includes(migrationFile)) {
        console.log(`Running migration: ${migrationFile}`);

        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, "utf8");

        try {
          // Begin transaction
          await client.query("BEGIN");

          // Execute migration
          await client.query(migrationSQL);

          // Record migration as executed
          await recordMigration(client, migrationFile);

          // Commit transaction
          await client.query("COMMIT");

          console.log(`Migration ${migrationFile} completed successfully`);
        } catch (error) {
          // Rollback transaction on error
          await client.query("ROLLBACK");
          console.error(`Migration ${migrationFile} failed:`, error);
          throw error;
        }
      } else {
        console.log(`Migration ${migrationFile} already executed, skipping...`);
      }
    }

    console.log("All migrations completed successfully");
  } catch (err) {
    console.error("Error running migrations:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migration process completed");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration process failed:", err);
      process.exit(1);
    });
}

export { runMigrations };
