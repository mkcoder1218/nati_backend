require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

console.log("📥 Neon Data Import Tool");
console.log("========================");

// Neon connection configuration
const createNeonPool = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not found in .env file");
  }

  console.log("📍 Using Neon database connection");
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 5,
    min: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 45000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });
};

// Retry connection function for Neon
async function connectWithRetry(pool, maxRetries = 3) {
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

      const waitTime = attempt * 3;
      console.log(`⏳ Waiting ${waitTime} seconds before retry...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime * 1000));
    }
  }
}

// Extract data-only SQL from the full export
function extractDataSQL(fullExportPath) {
  console.log("📄 Reading export file...");
  const content = fs.readFileSync(fullExportPath, "utf8");

  // Find the data section
  const dataSectionStart = content.indexOf(
    "-- ========================================\n-- DATA SECTION"
  );
  if (dataSectionStart === -1) {
    throw new Error("Data section not found in export file");
  }

  // Extract only the data part
  const dataSQL = content.substring(dataSectionStart);
  console.log("✅ Data section extracted successfully");

  return dataSQL;
}

// Clean existing data from tables (Neon-compatible approach)
async function cleanExistingData(client) {
  console.log("🧹 Cleaning existing data...");

  // Order matters due to foreign key constraints
  const tables = [
    "notifications",
    "votes",
    "office_votes",
    "service_guides",
    "sentiment_logs",
    "reviews",
    "offices",
    "users",
  ];

  try {
    // Delete in order to respect foreign key constraints
    for (const table of tables) {
      try {
        const result = await client.query(`DELETE FROM ${table}`);
        console.log(`   ✓ Cleared ${table}: ${result.rowCount} rows deleted`);
      } catch (error) {
        // If foreign key constraint error, try to handle it gracefully
        if (error.message.includes("violates foreign key constraint")) {
          console.log(
            `   ⚠️  ${table}: Skipping due to foreign key constraints`
          );
        } else {
          console.log(`   ⚠️  ${table}: ${error.message}`);
        }
      }
    }

    console.log("✅ Data cleanup completed");
  } catch (error) {
    throw new Error(`Data cleanup failed: ${error.message}`);
  }
}

// Import data with proper error handling
async function importData(client, dataSQL) {
  console.log("📥 Importing data...");

  // Split into individual INSERT statements
  const statements = dataSQL
    .split("\n")
    .filter((line) => line.trim().startsWith("INSERT INTO"))
    .map((line) => line.trim());

  console.log(`📊 Found ${statements.length} INSERT statements`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  try {
    await client.query("BEGIN");

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      try {
        await client.query(statement);
        successCount++;

        if ((i + 1) % 10 === 0) {
          console.log(
            `   ⏳ Progress: ${i + 1}/${
              statements.length
            } (${successCount} success, ${skipCount} skipped, ${errorCount} errors)`
          );
        }
      } catch (error) {
        if (
          error.message.includes("duplicate key") ||
          error.message.includes("already exists") ||
          error.message.includes("violates unique constraint")
        ) {
          skipCount++;
        } else {
          errorCount++;
          console.log(
            `   ⚠️  Error in statement ${i + 1}: ${error.message.substring(
              0,
              100
            )}...`
          );
        }
      }
    }

    await client.query("COMMIT");

    console.log("");
    console.log("📊 Import Summary:");
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⏭️  Skipped: ${skipCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log("⚠️  Some errors occurred, but import continued");
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw new Error(`Data import failed: ${error.message}`);
  }
}

// Validate imported data
async function validateData(client) {
  console.log("🔍 Validating imported data...");

  const tables = [
    "users",
    "offices",
    "reviews",
    "sentiment_logs",
    "service_guides",
    "office_votes",
    "votes",
    "notifications",
  ];

  const counts = {};

  for (const table of tables) {
    try {
      const result = await client.query(
        `SELECT COUNT(*) as count FROM ${table}`
      );
      const count = parseInt(result.rows[0].count);
      counts[table] = count;
      console.log(`   ✅ ${table}: ${count} records`);
    } catch (error) {
      console.log(`   ❌ ${table}: Error - ${error.message}`);
      counts[table] = "Error";
    }
  }

  return counts;
}

async function main() {
  const pool = createNeonPool();
  let client;

  try {
    console.log("🚀 Starting data import to Neon...");
    console.log("");

    // Connect to Neon
    client = await connectWithRetry(pool);

    // Test connection
    console.log("🔍 Testing database connection...");
    const testResult = await client.query(
      "SELECT version(), current_database()"
    );
    console.log(`📊 Database: ${testResult.rows[0].current_database}`);
    console.log(`📊 PostgreSQL: ${testResult.rows[0].version.split(" ")[1]}`);
    console.log("");

    // Check for export file
    const exportFile = path.join(
      __dirname,
      "exports",
      "full_export_corrected.sql"
    );
    if (!fs.existsSync(exportFile)) {
      throw new Error(
        "Export file not found: exports/full_export_corrected.sql"
      );
    }
    console.log("📁 Using export file: full_export_corrected.sql");

    // Extract data SQL
    const dataSQL = extractDataSQL(exportFile);

    // Clean existing data
    await cleanExistingData(client);
    console.log("");

    // Import data
    await importData(client, dataSQL);
    console.log("");

    // Validate data
    const counts = await validateData(client);
    console.log("");

    console.log("🎉 Data import completed successfully!");
    console.log("📊 Your Neon database now contains all your application data");
    console.log("✅ You can now start your backend server");
  } catch (error) {
    console.error("💥 Import failed:", error.message);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the import
if (require.main === module) {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🔄 Negari Data Import to Neon");
  console.log("=============================");
  console.log("");
  console.log("This will import all your application data to Neon database.");
  console.log("⚠️  This will replace any existing data in Neon.");
  console.log("");

  rl.question("Continue with data import? (y/N): ", (answer) => {
    rl.close();

    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      main()
        .then(() => {
          console.log("✨ Process completed successfully");
          process.exit(0);
        })
        .catch((error) => {
          console.error("💥 Process failed:", error.message);
          process.exit(1);
        });
    } else {
      console.log("❌ Import cancelled.");
      process.exit(0);
    }
  });
}

module.exports = { main };
