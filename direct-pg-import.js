/**
 * Import database to Supabase using direct PostgreSQL connection
 *
 * This script:
 * 1. Connects directly to Supabase using the PostgreSQL connection string
 * 2. Executes SQL statements to create tables and import data
 *
 * Usage:
 * node direct-pg-import.js <postgresql-connection-string>
 *
 * Example:
 * node direct-pg-import.js postgresql://postgres:password@db.example.supabase.co:5432/postgres
 */

const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Get PostgreSQL connection string from command line
const connectionString = process.argv[2];

if (!connectionString) {
  console.error("Error: PostgreSQL connection string is required");
  console.log("Usage: node direct-pg-import.js <postgresql-connection-string>");
  console.log(
    "Example: node direct-pg-import.js postgresql://postgres:password@db.example.supabase.co:5432/postgres"
  );
  process.exit(1);
}

// Check if the connection string starts with postgresql://
if (!connectionString.startsWith("postgresql://")) {
  console.error("Error: Connection string must start with postgresql://");
  console.error(
    "Please provide a complete PostgreSQL connection string in this format:"
  );
  console.error(
    "postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_ID.supabase.co:5432/postgres"
  );
  process.exit(1);
}

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
  // Set a longer connection timeout
  connectionTimeoutMillis: 30000,
});

// Path to the exported files
const exportsDir = path.join(__dirname, "exports");
const schemaFile = path.join(exportsDir, "schema.sql");
const dataFile = path.join(exportsDir, "data.sql");

// Check if export files exist
if (!fs.existsSync(exportsDir)) {
  console.error(
    "Error: Exports directory not found. Run export-database-js.js first."
  );
  process.exit(1);
}

// Function to split SQL file into individual statements
function splitSqlStatements(sql) {
  // This is a simple implementation and might not handle all edge cases
  return sql
    .replace(/--.*$/gm, "") // Remove comments
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
}

// Main function to import database
async function importDatabase() {
  let client;

  try {
    console.log("Connecting to Supabase PostgreSQL...");
    client = await pool.connect();
    console.log("Connected successfully!");

    // Test the connection
    const testResult = await client.query(
      "SELECT current_database() as db_name, current_user as user_name"
    );
    console.log("Connected to database:", testResult.rows[0].db_name);
    console.log("Connected as user:", testResult.rows[0].user_name);

    // Read schema file
    if (fs.existsSync(schemaFile)) {
      console.log("Importing schema...");
      const schemaContent = fs.readFileSync(schemaFile, "utf8");
      const schemaStatements = splitSqlStatements(schemaContent);

      console.log(
        `Found ${schemaStatements.length} schema statements to execute.`
      );

      // Begin transaction for schema
      await client.query("BEGIN");

      try {
        // Execute each schema statement
        for (let i = 0; i < schemaStatements.length; i++) {
          const stmt = schemaStatements[i];

          if (i % 10 === 0 || i === schemaStatements.length - 1) {
            console.log(
              `Executing schema statement ${i + 1}/${
                schemaStatements.length
              }...`
            );
          }

          try {
            await client.query(stmt);
          } catch (error) {
            console.error(`Error executing schema statement: ${error.message}`);
            console.error(`Statement: ${stmt.substring(0, 100)}...`);
            // Continue with next statement
          }
        }

        // Commit schema transaction
        await client.query("COMMIT");
        console.log("Schema import completed successfully.");
      } catch (error) {
        // Rollback on error
        await client.query("ROLLBACK");
        console.error("Error importing schema. Rolling back changes.");
        throw error;
      }
    } else {
      console.error("Schema file not found:", schemaFile);
    }

    // Read data file
    if (fs.existsSync(dataFile)) {
      console.log("Importing data...");
      const dataContent = fs.readFileSync(dataFile, "utf8");
      const dataStatements = splitSqlStatements(dataContent);

      console.log(`Found ${dataStatements.length} data statements to execute.`);

      // Execute each data statement in its own transaction
      for (let i = 0; i < dataStatements.length; i++) {
        const stmt = dataStatements[i];

        if (i % 100 === 0 || i === dataStatements.length - 1) {
          console.log(
            `Executing data statement ${i + 1}/${dataStatements.length}...`
          );
        }

        try {
          // Begin transaction for this statement
          await client.query("BEGIN");

          // Execute the statement
          await client.query(stmt);

          // Commit transaction
          await client.query("COMMIT");
        } catch (error) {
          // Rollback on error
          await client.query("ROLLBACK");
          console.error(`Error executing data statement: ${error.message}`);
          // Continue with next statement
        }
      }

      console.log("Data import completed.");
    } else {
      console.error("Data file not found:", dataFile);
    }

    console.log("Database import completed.");
  } catch (error) {
    console.error("Error importing database:", error.message);
    console.error("Error details:", error);

    // Check for common connection issues
    if (error.code === "ECONNREFUSED") {
      console.error("\nConnection refused. This could be due to:");
      console.error("1. Incorrect host name or port");
      console.error("2. Firewall blocking the connection");
      console.error("3. Database server is not running");
    }

    if (error.code === "ENOTFOUND") {
      console.error("\nHost not found. This could be due to:");
      console.error("1. Incorrect host name");
      console.error("2. DNS resolution issues");
    }

    if (error.code === "ETIMEDOUT") {
      console.error("\nConnection timed out. This could be due to:");
      console.error("1. Network connectivity issues");
      console.error("2. Firewall blocking the connection");
      console.error("3. Your IP address is not in the allowlist");
    }

    if (error.message.includes("password authentication failed")) {
      console.error("\nAuthentication failed. This could be due to:");
      console.error("1. Incorrect username or password");
      console.error(
        "2. Special characters in password not properly URL-encoded"
      );
    }

    if (error.message.includes("no pg_hba.conf entry")) {
      console.error("\nAccess denied. This could be due to:");
      console.error("1. Your IP address is not in the allowlist");
      console.error(
        "2. Go to Supabase Dashboard > Project Settings > Database > Connection Pooling"
      );
      console.error("3. Add your IP address to the allowlist");
    }
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the import
importDatabase();
