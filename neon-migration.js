require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

console.log("🚀 Neon Database Migration Tool");
console.log("================================");

// Neon connection configuration with retry logic
const createNeonPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not found in .env file");
  }

  console.log("📍 Using Neon database connection");
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    min: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 45000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
};

// Retry connection function for Neon (handles sleeping databases)
async function connectWithRetry(pool, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Connection attempt ${attempt}/${maxRetries}...`);
      const client = await pool.connect();
      console.log("✅ Connected to Neon database successfully!");
      return client;
    } catch (error) {
      console.log(`❌ Attempt ${attempt} failed: ${error.message}`);

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to connect after ${maxRetries} attempts: ${error.message}`
        );
      }

      const waitTime = attempt * 3; // Increasing wait time
      console.log(`⏳ Waiting ${waitTime} seconds before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
    }
  }
}

async function createMigrationsTable(client) {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await client.query(createTableQuery);
  console.log("✓ Migrations table ready");
}

async function getExecutedMigrations(client) {
  try {
    const result = await client.query(
      "SELECT filename FROM migrations ORDER BY id"
    );
    return result.rows.map((row) => row.filename);
  } catch (error) {
    // If migrations table doesn't exist, return empty array
    return [];
  }
}

async function recordMigration(client, filename) {
  await client.query("INSERT INTO migrations (filename) VALUES ($1)", [
    filename,
  ]);
}

async function runMigrations() {
  const pool = createNeonPool();
  let client;

  try {
    // Connect with retry logic
    client = await connectWithRetry(pool);

    // Test basic query to ensure database is fully awake
    console.log("🔍 Testing database connection...");
    const testResult = await client.query(
      "SELECT version(), current_database()"
    );
    console.log(`📊 Database: ${testResult.rows[0].current_database}`);
    console.log(`📊 PostgreSQL: ${testResult.rows[0].version.split(" ")[1]}`);

    // Create migrations table
    await createMigrationsTable(client);

    // Get executed migrations
    const executedMigrations = await getExecutedMigrations(client);
    console.log(
      `📋 Previously executed: ${executedMigrations.length} migrations`
    );

    // Get migration files
    const migrationsDir = path.join(__dirname, "src", "db", "migrations");

    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }

    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort((a, b) => {
        // Custom sort to ensure dependencies are handled
        const priorityOrder = [
          "create_comments_table.sql",
          "add_admin_response_to_comments.sql",
          "create_comment_replies_table.sql",
          "create_review_replies_table.sql",
          "update_notifications_entity_type.sql",
        ];

        const aIndex = priorityOrder.indexOf(a);
        const bIndex = priorityOrder.indexOf(b);

        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        } else if (aIndex !== -1) {
          return 1; // a has priority, put it later in the normal sort
        } else if (bIndex !== -1) {
          return -1; // b has priority, put it later in the normal sort
        }

        return a.localeCompare(b); // Normal alphabetical sort
      });

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    if (migrationFiles.length === 0) {
      console.log("⚠️  No migration files found");
      return;
    }

    // Run pending migrations
    let executedCount = 0;
    for (const migrationFile of migrationFiles) {
      if (!executedMigrations.includes(migrationFile)) {
        console.log(`🚀 Running: ${migrationFile}`);

        const migrationPath = path.join(migrationsDir, migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, "utf8");

        try {
          await client.query("BEGIN");
          await client.query(migrationSQL);
          await recordMigration(client, migrationFile);
          await client.query("COMMIT");

          console.log(`✅ Completed: ${migrationFile}`);
          executedCount++;
        } catch (error) {
          await client.query("ROLLBACK");

          // Handle common migration conflicts gracefully
          if (
            error.message.includes("already exists") ||
            error.message.includes("duplicate key") ||
            error.message.includes("violates unique constraint")
          ) {
            console.log(
              `⚠️  Skipping: ${migrationFile} (${
                error.message.split(" - ")[0]
              })`
            );
            // Still record as executed to avoid future attempts
            await client.query("BEGIN");
            await recordMigration(client, migrationFile);
            await client.query("COMMIT");
          } else {
            console.error(`❌ Failed: ${migrationFile} - ${error.message}`);
            throw error;
          }
        }
      } else {
        console.log(`⏭️  Skipping: ${migrationFile} (already executed)`);
      }
    }

    console.log("");
    console.log("🎉 Migration completed successfully!");
    console.log(`📊 Executed ${executedCount} new migrations`);
    console.log("✅ Neon database is ready for use");
  } catch (error) {
    console.error("💥 Migration failed:", error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the migration
runMigrations()
  .then(() => {
    console.log("✨ Process completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Process failed:", error.message);
    process.exit(1);
  });
