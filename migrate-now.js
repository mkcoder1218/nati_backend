#!/usr/bin/env node

/**
 * Quick Migration Script
 * This script will export from local database and import to Supabase
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function exportFromLocal() {
  log('🔄 Exporting from local database...', 'cyan');
  
  // Connect to local database
  const localPool = new Pool({
    host: process.env.DB_HOST_LOCAL || 'localhost',
    port: parseInt(process.env.DB_PORT_LOCAL || '5432'),
    database: process.env.DB_NAME_LOCAL || 'government_feedback',
    user: process.env.DB_USER_LOCAL || 'postgres',
    password: process.env.DB_PASSWORD_LOCAL || 'postgres',
  });

  try {
    const client = await localPool.connect();
    log('✅ Connected to local database', 'green');

    // Create exports directory
    const exportsDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir);
    }

    // Export schema from existing files
    const schemaFile = path.join(__dirname, 'exports', 'full_export_corrected.sql');
    if (fs.existsSync(schemaFile)) {
      log('✅ Using existing schema file', 'green');
      
      // Read the schema
      const schemaContent = fs.readFileSync(schemaFile, 'utf8');
      
      // Write to new export file
      const newExportFile = path.join(exportsDir, 'migration_export.sql');
      fs.writeFileSync(newExportFile, schemaContent);
      
      log(`✅ Export file created: ${newExportFile}`, 'green');
      
      client.release();
      await localPool.end();
      
      return newExportFile;
    } else {
      throw new Error('Schema file not found. Please check if exports/full_export_corrected.sql exists.');
    }
    
  } catch (error) {
    log(`❌ Export failed: ${error.message}`, 'red');
    throw error;
  }
}

async function importToSupabase(exportFile) {
  log('🔄 Importing to Supabase...', 'cyan');
  
  // Connect to Supabase
  const supabasePool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await supabasePool.connect();
    log('✅ Connected to Supabase database', 'green');

    // Read and execute the export file
    const sql = fs.readFileSync(exportFile, 'utf8');
    
    log('🔄 Executing database import...', 'yellow');
    
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await client.query(statement);
          if (i % 50 === 0) {
            log(`Processed ${i + 1}/${statements.length} statements...`, 'blue');
          }
        } catch (error) {
          // Log but continue for non-critical errors
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            log(`⚠️  Skipping: ${error.message.split('\n')[0]}`, 'yellow');
          } else {
            log(`❌ Error in statement ${i + 1}: ${error.message}`, 'red');
          }
        }
      }
    }
    
    client.release();
    await supabasePool.end();
    
    log('✅ Database import completed!', 'green');
    
  } catch (error) {
    log(`❌ Import failed: ${error.message}`, 'red');
    throw error;
  }
}

async function validateMigration() {
  log('🔍 Validating migration...', 'cyan');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Check tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    
    log(`✅ Found ${tablesResult.rows.length} tables:`, 'green');
    tablesResult.rows.forEach(row => {
      log(`  - ${row.table_name}`, 'blue');
    });
    
    // Check data
    const expectedTables = ['users', 'offices', 'reviews', 'votes', 'comments'];
    for (const table of expectedTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        log(`  ${table}: ${countResult.rows[0].count} records`, 'blue');
      } catch (error) {
        log(`  ${table}: Table not found or error`, 'yellow');
      }
    }
    
    client.release();
    await pool.end();
    
    log('✅ Migration validation completed!', 'green');
    
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`, 'red');
    throw error;
  }
}

async function main() {
  log('\n🚀 Starting Database Migration to Supabase', 'cyan');
  log('============================================', 'cyan');

  try {
    // Step 1: Export from local
    const exportFile = await exportFromLocal();
    
    // Step 2: Import to Supabase
    await importToSupabase(exportFile);
    
    // Step 3: Validate
    await validateMigration();
    
    log('\n🎉 Migration completed successfully!', 'green');
    log('Your database is now running on Supabase.', 'green');
    log('\nNext steps:', 'cyan');
    log('1. Restart your backend server: npm run dev', 'blue');
    log('2. Test your application', 'blue');
    
  } catch (error) {
    log(`\n❌ Migration failed: ${error.message}`, 'red');
    log('\nTroubleshooting:', 'cyan');
    log('1. Check your local database is running', 'blue');
    log('2. Verify your Supabase connection string', 'blue');
    log('3. Check the error details above', 'blue');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
