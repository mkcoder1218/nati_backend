/**
 * Check if database exports exist and create them if not
 * 
 * This script:
 * 1. Checks if the exports directory exists
 * 2. Checks if schema.sql and data.sql files exist
 * 3. If not, runs the export-database-js.js script
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Path to the exported files
const exportsDir = path.join(__dirname, 'exports');
const schemaFile = path.join(exportsDir, 'schema.sql');
const dataFile = path.join(exportsDir, 'data.sql');

// Check if exports directory exists
if (!fs.existsSync(exportsDir)) {
  console.log('Exports directory not found. Creating directory...');
  fs.mkdirSync(exportsDir);
}

// Check if schema and data files exist
const schemaExists = fs.existsSync(schemaFile);
const dataExists = fs.existsSync(dataFile);

if (!schemaExists || !dataExists) {
  console.log('Schema or data files not found. Running export-database-js.js...');
  
  // Run the export script
  exec('node export-database-js.js', (error, stdout, stderr) => {
    if (error) {
      console.error(`Error running export script: ${error.message}`);
      return;
    }
    
    console.log(stdout);
    
    if (stderr) {
      console.error(`Export script stderr: ${stderr}`);
    }
    
    // Check if files were created
    const schemaExistsNow = fs.existsSync(schemaFile);
    const dataExistsNow = fs.existsSync(dataFile);
    
    if (schemaExistsNow && dataExistsNow) {
      console.log('Export completed successfully.');
      console.log(`Schema file: ${schemaFile}`);
      console.log(`Data file: ${dataFile}`);
      
      // Show file sizes
      const schemaSize = fs.statSync(schemaFile).size;
      const dataSize = fs.statSync(dataFile).size;
      
      console.log(`Schema file size: ${(schemaSize / 1024).toFixed(2)} KB`);
      console.log(`Data file size: ${(dataSize / 1024).toFixed(2)} KB`);
      
      console.log('\nNext steps:');
      console.log('1. Import the database to Supabase:');
      console.log('   node direct-pg-import.js postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_ID.supabase.co:5432/postgres');
      console.log('2. Update your backend configuration:');
      console.log('   node update-supabase-config.js postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_ID.supabase.co:5432/postgres');
    } else {
      console.error('Export failed. Files were not created.');
    }
  });
} else {
  console.log('Export files already exist:');
  console.log(`Schema file: ${schemaFile}`);
  console.log(`Data file: ${dataFile}`);
  
  // Show file sizes
  const schemaSize = fs.statSync(schemaFile).size;
  const dataSize = fs.statSync(dataFile).size;
  
  console.log(`Schema file size: ${(schemaSize / 1024).toFixed(2)} KB`);
  console.log(`Data file size: ${(dataSize / 1024).toFixed(2)} KB`);
  
  console.log('\nNext steps:');
  console.log('1. Import the database to Supabase:');
  console.log('   node direct-pg-import.js postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_ID.supabase.co:5432/postgres');
  console.log('2. Update your backend configuration:');
  console.log('   node update-supabase-config.js postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT_ID.supabase.co:5432/postgres');
}
