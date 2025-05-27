/**
 * Script to export the PostgreSQL database schema and data for migration to Supabase
 * 
 * This script:
 * 1. Exports the database schema (tables, functions, triggers, etc.)
 * 2. Exports the data from all tables
 * 
 * Requirements:
 * - pg_dump command-line tool must be installed
 * - Valid PostgreSQL connection details in .env file
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create exports directory if it doesn't exist
const exportsDir = path.join(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir);
}

// Database connection details from .env
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'government_feedback';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';

// Connection string (password masked for logging)
const maskedConnectionString = `postgresql://${dbUser}:${'*'.repeat(dbPassword.length)}@${dbHost}:${dbPort}/${dbName}`;
console.log(`Using connection: ${maskedConnectionString}`);

// Export schema (without data)
const schemaFile = path.join(exportsDir, 'schema.sql');
const schemaCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --schema-only -f "${schemaFile}"`;

console.log('Exporting database schema...');
exec(schemaCommand, { env: { ...process.env, PGPASSWORD: dbPassword } }, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error exporting schema: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Schema export stderr: ${stderr}`);
  }
  console.log(`Schema exported to ${schemaFile}`);
  
  // After schema export succeeds, export data
  exportData();
});

// Export data only
function exportData() {
  const dataFile = path.join(exportsDir, 'data.sql');
  const dataCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --data-only --inserts -f "${dataFile}"`;
  
  console.log('Exporting database data...');
  exec(dataCommand, { env: { ...process.env, PGPASSWORD: dbPassword } }, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error exporting data: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Data export stderr: ${stderr}`);
    }
    console.log(`Data exported to ${dataFile}`);
    
    // Create a combined file for convenience
    const combinedFile = path.join(exportsDir, 'full_export.sql');
    console.log('Creating combined export file...');
    
    try {
      const schemaContent = fs.readFileSync(schemaFile, 'utf8');
      const dataContent = fs.readFileSync(dataFile, 'utf8');
      
      fs.writeFileSync(combinedFile, `-- SCHEMA\n${schemaContent}\n\n-- DATA\n${dataContent}`);
      console.log(`Combined export saved to ${combinedFile}`);
      
      console.log('\nExport completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Import the schema and data to Supabase');
      console.log('2. Update your application\'s database connection settings');
    } catch (err) {
      console.error(`Error creating combined file: ${err.message}`);
    }
  });
}
