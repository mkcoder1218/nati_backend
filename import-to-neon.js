/**
 * Import existing data to Neon database
 * 
 * This script:
 * 1. Connects to Neon using the DATABASE_URL
 * 2. Imports the corrected schema and data
 * 3. Validates the import
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting data import to Neon database...');

// Create Neon connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Mask sensitive parts of the connection string for logging
const maskedUrl = process.env.DATABASE_URL 
  ? process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@')
  : 'Not set';

console.log('📍 Connecting to Neon:', maskedUrl);

async function importToNeon() {
  let client;
  
  try {
    console.log('\n🔄 Connecting to Neon database...');
    client = await pool.connect();
    console.log('✅ Connected to Neon successfully!');
    
    // Check if we have the corrected export file
    const exportFile = path.join(__dirname, 'exports', 'full_export_corrected.sql');
    
    if (!fs.existsSync(exportFile)) {
      console.error('❌ Export file not found:', exportFile);
      console.log('\nAvailable export files:');
      const exportDir = path.join(__dirname, 'exports');
      if (fs.existsSync(exportDir)) {
        const files = fs.readdirSync(exportDir);
        files.forEach(file => console.log(`  - ${file}`));
      }
      throw new Error('Export file not found');
    }
    
    console.log('📁 Found export file:', exportFile);
    
    // Read the export file
    console.log('\n📖 Reading export file...');
    const sqlContent = fs.readFileSync(exportFile, 'utf8');
    console.log(`✅ Read ${Math.round(sqlContent.length / 1024)}KB of SQL content`);
    
    // Check current state of database
    console.log('\n🔍 Checking current database state...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log(`⚠️  Found ${tablesResult.rows.length} existing tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`   - ${row.table_name}`);
      });
      
      console.log('\n❓ Do you want to continue? This will add data to existing tables.');
      console.log('   If tables don\'t exist, they will be created.');
    } else {
      console.log('✅ Database is empty, ready for import');
    }
    
    // Begin transaction
    console.log('\n🔄 Starting import transaction...');
    await client.query('BEGIN');
    
    try {
      // Execute the SQL content
      console.log('📥 Importing schema and data...');
      await client.query(sqlContent);
      
      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Import transaction committed successfully!');
      
    } catch (importError) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('❌ Import failed, transaction rolled back');
      throw importError;
    }
    
    // Validate the import
    console.log('\n🔍 Validating import...');
    await validateImport(client);
    
    console.log('\n🎉 Data import to Neon completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during import:');
    console.error('   Message:', error.message);
    
    if (error.code) {
      console.error('   Code:', error.code);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Check if your Neon database is active');
    console.log('2. Verify your DATABASE_URL is correct');
    console.log('3. Ensure you have sufficient permissions');
    
    throw error;
    
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

async function validateImport(client) {
  const expectedTables = [
    'users', 'offices', 'reviews', 'comments', 
    'votes', 'office_votes', 'sentiment_logs', 
    'service_guides', 'notifications'
  ];
  
  console.log('📋 Checking imported tables...');
  
  for (const tableName of expectedTables) {
    try {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const count = countResult.rows[0].count;
      console.log(`   ✓ ${tableName}: ${count} records`);
    } catch (error) {
      console.log(`   ⚠️  ${tableName}: Table not found or error`);
    }
  }
  
  // Check total users
  try {
    const userResult = await client.query(`
      SELECT role, COUNT(*) as count 
      FROM users 
      GROUP BY role 
      ORDER BY role
    `);
    
    console.log('\n👥 User breakdown by role:');
    userResult.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count} users`);
    });
    
  } catch (error) {
    console.log('⚠️  Could not get user breakdown');
  }
}

// Run the import
importToNeon()
  .then(() => {
    console.log('\n✅ Import process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Import process failed:', error.message);
    process.exit(1);
  });
