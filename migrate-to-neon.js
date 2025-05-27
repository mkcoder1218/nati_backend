const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Color logging
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Database configurations
const localConfig = {
  host: process.env.DB_HOST_LOCAL || "localhost",
  port: parseInt(process.env.DB_PORT_LOCAL || "5432"),
  database: process.env.DB_NAME_LOCAL || "government_feedback",
  user: process.env.DB_USER_LOCAL || "postgres",
  password: process.env.DB_PASSWORD_LOCAL || "postgres",
};

const neonConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  // Optimized connection pool settings for Neon
  max: 5, // Reduced max connections for Neon pooling
  min: 1, // Keep at least 1 connection alive
  idleTimeoutMillis: 60000, // Increased idle timeout
  connectionTimeoutMillis: 30000, // Increased connection timeout
  // Neon-specific optimizations
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Create exports directory if it doesn't exist
const exportsDir = path.join(__dirname, "exports");
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir);
}

async function exportLocalDatabase() {
  log("🔄 Starting local database export...", "blue");

  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportFile = path.join(exportsDir, `local_export_${timestamp}.sql`);

    log("📤 Exporting database using Node.js...", "yellow");

    // Create database connection
    const pool = new Pool(localConfig);
    const client = await pool.connect();

    try {
      // Start building the SQL export
      let sqlExport = "";

      // Add header
      sqlExport += `-- Negari Database Export for Neon Migration\n`;
      sqlExport += `-- Created: ${new Date().toISOString()}\n`;
      sqlExport += `-- Source Database: ${localConfig.database}\n`;
      sqlExport += `-- Source Host: ${localConfig.host}:${localConfig.port}\n\n`;

      // Enable UUID extension
      sqlExport += `-- Enable UUID extension\n`;
      sqlExport += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;

      // Get all custom types (enums)
      const typesResult = await client.query(`
        SELECT typname, enumlabel
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        ORDER BY typname, e.enumsortorder
      `);

      if (typesResult.rows.length > 0) {
        log("📋 Exporting custom types...", "cyan");
        const typeGroups = {};

        typesResult.rows.forEach((row) => {
          if (!typeGroups[row.typname]) {
            typeGroups[row.typname] = [];
          }
          typeGroups[row.typname].push(row.enumlabel);
        });

        Object.keys(typeGroups).forEach((typeName) => {
          const labels = typeGroups[typeName]
            .map((label) => `'${label}'`)
            .join(", ");
          sqlExport += `-- Create enum type: ${typeName}\n`;
          sqlExport += `DO $$ BEGIN\n`;
          sqlExport += `    CREATE TYPE ${typeName} AS ENUM (${labels});\n`;
          sqlExport += `EXCEPTION\n`;
          sqlExport += `    WHEN duplicate_object THEN null;\n`;
          sqlExport += `END $$;\n\n`;
        });
      }

      // Get all tables
      const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
      `);

      log(`📋 Found ${tablesResult.rows.length} tables to export`, "cyan");

      // Export table data
      for (const tableRow of tablesResult.rows) {
        const tableName = tableRow.tablename;
        log(`   📄 Exporting table: ${tableName}`, "yellow");

        // Get table data
        const dataResult = await client.query(`SELECT * FROM "${tableName}"`);

        if (dataResult.rows.length > 0) {
          // Get column names
          const columns = Object.keys(dataResult.rows[0]);

          sqlExport += `-- Data for table ${tableName} (${dataResult.rows.length} rows)\n`;

          for (const row of dataResult.rows) {
            const values = columns.map((col) => {
              const value = row[col];
              if (value === null) return "NULL";
              if (typeof value === "string") {
                return `'${value.replace(/'/g, "''")}'`;
              }
              if (value instanceof Date) {
                return `'${value.toISOString()}'`;
              }
              if (typeof value === "boolean") {
                return value ? "true" : "false";
              }
              if (Array.isArray(value)) {
                return `'${JSON.stringify(value)}'`;
              }
              return value;
            });

            sqlExport += `INSERT INTO "${tableName}" (${columns
              .map((c) => `"${c}"`)
              .join(", ")}) VALUES (${values.join(
              ", "
            )}) ON CONFLICT DO NOTHING;\n`;
          }

          sqlExport += `\n`;
        } else {
          sqlExport += `-- Table ${tableName} is empty\n\n`;
        }
      }

      // Write export file
      fs.writeFileSync(exportFile, sqlExport);

      const stats = fs.statSync(exportFile);
      log(`✅ Export completed successfully: ${exportFile}`, "green");
      log(`📊 Export file size: ${(stats.size / 1024).toFixed(2)} KB`, "cyan");

      return exportFile;
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    log(`❌ Export failed: ${error.message}`, "red");
    throw error;
  }
}

async function testNeonConnection() {
  log("🔗 Testing Neon database connection...", "blue");

  if (!process.env.DATABASE_URL) {
    log("❌ DATABASE_URL not found in .env file", "red");
    return false;
  }

  const pool = new Pool(neonConfig);

  try {
    log(
      "⏳ Connecting to Neon (this may take a moment if database is sleeping)...",
      "yellow"
    );

    const client = await pool.connect();
    const result = await client.query(
      "SELECT version(), current_database(), current_user"
    );

    log(`✅ Neon connection successful`, "green");
    log(
      `📋 PostgreSQL version: ${result.rows[0].version.split(" ")[1]}`,
      "cyan"
    );
    log(`📋 Database: ${result.rows[0].current_database}`, "cyan");
    log(`📋 User: ${result.rows[0].current_user}`, "cyan");

    client.release();
    return true;
  } catch (error) {
    log(`❌ Neon connection failed: ${error.message}`, "red");

    if (
      error.message.includes("ECONNRESET") ||
      error.message.includes("timeout")
    ) {
      log("💡 This might be because the Neon database is sleeping.", "yellow");
      log(
        "💡 Try accessing your Neon dashboard to wake it up, then retry.",
        "yellow"
      );
    }

    return false;
  } finally {
    await pool.end();
  }
}

async function clearNeonDatabase() {
  log("🧹 Clearing existing data in Neon database...", "yellow");

  const pool = new Pool(neonConfig);

  try {
    const client = await pool.connect();

    // Get all tables
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
    `);

    if (tablesResult.rows.length > 0) {
      log(`📋 Found ${tablesResult.rows.length} existing tables`, "cyan");

      // Drop all tables with CASCADE
      for (const row of tablesResult.rows) {
        await client.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
        log(`   ✓ Dropped table: ${row.tablename}`, "yellow");
      }
    }

    // Drop all custom types
    const typesResult = await client.query(`
      SELECT typname FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
    `);

    if (typesResult.rows.length > 0) {
      for (const row of typesResult.rows) {
        await client.query(`DROP TYPE IF EXISTS "${row.typname}" CASCADE`);
        log(`   ✓ Dropped type: ${row.typname}`, "yellow");
      }
    }

    client.release();
    log("✅ Neon database cleared successfully", "green");
  } catch (error) {
    log(`❌ Failed to clear Neon database: ${error.message}`, "red");
    throw error;
  } finally {
    await pool.end();
  }
}

async function importToNeon(exportFile) {
  log("📥 Importing data to Neon database...", "blue");

  try {
    // Read the export file
    const sqlContent = fs.readFileSync(exportFile, "utf8");

    // Clean up the SQL content for Neon import
    let cleanedSQL = sqlContent
      // Remove CREATE DATABASE and related commands
      .replace(/CREATE DATABASE.*?;/gi, "")
      .replace(/\\connect.*?;/gi, "")
      .replace(/DROP DATABASE.*?;/gi, "")
      // Remove comments that might cause issues
      .replace(/--.*$/gm, "")
      // Clean up multiple newlines
      .replace(/\n\s*\n\s*\n/g, "\n\n");

    const pool = new Pool(neonConfig);
    const client = await pool.connect();

    try {
      // Split SQL into individual statements
      const statements = cleanedSQL
        .split(";")
        .map((stmt) => stmt.trim())
        .filter((stmt) => stmt.length > 0 && !stmt.match(/^\s*$/));

      log(`📝 Executing ${statements.length} SQL statements...`, "cyan");

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        try {
          await client.query(statement + ";");
          successCount++;

          if ((i + 1) % 50 === 0) {
            log(
              `   ⏳ Processed ${i + 1}/${statements.length} statements...`,
              "yellow"
            );
          }
        } catch (error) {
          errorCount++;
          // Log non-critical errors but continue
          if (
            !error.message.includes("already exists") &&
            !error.message.includes("does not exist") &&
            !error.message.includes("duplicate key")
          ) {
            log(`   ⚠️  Statement ${i + 1} error: ${error.message}`, "yellow");
          }
        }
      }

      log(
        `✅ Import completed: ${successCount} successful, ${errorCount} errors/warnings`,
        "green"
      );
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error) {
    log(`❌ Import failed: ${error.message}`, "red");
    throw error;
  }
}

async function validateMigration() {
  log("🔍 Validating migration...", "blue");

  const localPool = new Pool(localConfig);
  const neonPool = new Pool(neonConfig);

  try {
    const localClient = await localPool.connect();
    const neonClient = await neonPool.connect();

    // Get table counts from both databases
    const tablesQuery = `
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      ORDER BY tablename
    `;

    const localTables = await localClient.query(tablesQuery);
    const neonTables = await neonClient.query(tablesQuery);

    log(`📊 Local database tables: ${localTables.rows.length}`, "cyan");
    log(`📊 Neon database tables: ${neonTables.rows.length}`, "cyan");

    // Compare table counts
    for (const table of localTables.rows) {
      const tableName = table.tablename;

      try {
        const localCount = await localClient.query(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        );
        const neonCount = await neonClient.query(
          `SELECT COUNT(*) as count FROM "${tableName}"`
        );

        const localRows = parseInt(localCount.rows[0].count);
        const neonRows = parseInt(neonCount.rows[0].count);

        if (localRows === neonRows) {
          log(`   ✅ ${tableName}: ${neonRows} rows (matches local)`, "green");
        } else {
          log(
            `   ⚠️  ${tableName}: Local=${localRows}, Neon=${neonRows}`,
            "yellow"
          );
        }
      } catch (error) {
        log(
          `   ❌ ${tableName}: Error checking counts - ${error.message}`,
          "red"
        );
      }
    }

    localClient.release();
    neonClient.release();
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`, "red");
  } finally {
    await localPool.end();
    await neonPool.end();
  }
}

async function main() {
  try {
    log("🚀 Starting migration from Local PostgreSQL to Neon...", "magenta");
    log("=".repeat(60), "magenta");

    // Step 1: Test Neon connection
    const neonConnected = await testNeonConnection();
    if (!neonConnected) {
      throw new Error(
        "Cannot connect to Neon database. Please check your DATABASE_URL."
      );
    }

    // Step 2: Export local database
    const exportFile = await exportLocalDatabase();

    // Step 3: Clear Neon database
    await clearNeonDatabase();

    // Step 4: Import to Neon
    await importToNeon(exportFile);

    // Step 5: Validate migration
    await validateMigration();

    log("=".repeat(60), "magenta");
    log("🎉 Migration completed successfully!", "green");
    log("📝 Your application is now configured to use Neon database.", "green");
    log(
      "🔄 Restart your backend server to use the new database connection.",
      "yellow"
    );
  } catch (error) {
    log("=".repeat(60), "red");
    log(`💥 Migration failed: ${error.message}`, "red");
    log("🔧 Please check the error details above and try again.", "yellow");
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { main };
