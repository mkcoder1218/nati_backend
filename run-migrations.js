require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || undefined,
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'government_feedback',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function createMigrationsTable(client) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  await client.query(createTableQuery);
  console.log("✓ Migrations table created or already exists");
}

async function getExecutedMigrations(client) {
  const result = await client.query(
    "SELECT filename FROM migrations ORDER BY id"
  );
  return result.rows.map(row => row.filename);
}

async function recordMigration(client, filename) {
  await client.query(
    "INSERT INTO migrations (filename) VALUES ($1)",
    [filename]
  );
}

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // Create migrations table if it doesn't exist
    await createMigrationsTable(client);

    // Get list of executed migrations
    const executedMigrations = await getExecutedMigrations(client);
    console.log("📋 Previously executed migrations:", executedMigrations);

    // Get all migration files
    const migrationsDir = path.join(__dirname, "src", "db", "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter(file => file.endsWith(".sql"))
      .sort(); // Sort to ensure proper order

    console.log("📁 Available migration files:", migrationFiles);

    // Run pending migrations
    for (const migrationFile of migrationFiles) {
      if (!executedMigrations.includes(migrationFile)) {
        console.log(`🚀 Running migration: ${migrationFile}`);
        
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
          
          console.log(`✅ Migration ${migrationFile} completed successfully`);
        } catch (error) {
          // Rollback transaction on error
          await client.query("ROLLBACK");
          console.error(`❌ Migration ${migrationFile} failed:`, error.message);
          throw error;
        }
      } else {
        console.log(`⏭️  Migration ${migrationFile} already executed, skipping...`);
      }
    }

    console.log("🎉 All migrations completed successfully");
  } catch (err) {
    console.error("💥 Error running migrations:", err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log("✨ Migration process completed");
    process.exit(0);
  })
  .catch(error => {
    console.error("💥 Migration process failed:", error);
    process.exit(1);
  });
