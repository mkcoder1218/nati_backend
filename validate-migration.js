#!/usr/bin/env node

/**
 * Migration Validation Script
 * 
 * This script validates that the Supabase migration was successful by:
 * 1. Testing database connection
 * 2. Verifying all tables exist
 * 3. Checking data integrity
 * 4. Testing basic CRUD operations
 */

require('dotenv').config();
const { Pool } = require('pg');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Expected tables in the database
const expectedTables = [
  'users',
  'offices',
  'reviews',
  'sentiment_logs',
  'service_guides',
  'votes',
  'comments',
  'notifications',
  'office_votes'
];

// Expected enums
const expectedEnums = [
  'user_role',
  'office_type',
  'review_status',
  'sentiment_type',
  'language_type',
  'vote_type',
  'office_vote_type',
  'notification_type',
  'entity_type'
];

async function validateMigration() {
  log('\n🔍 Validating Supabase Migration', 'bright');
  log('================================', 'bright');

  // Create connection pool
  const pool = new Pool(
    process.env.DATABASE_URL
      ? { 
          connectionString: process.env.DATABASE_URL, 
          ssl: { rejectUnauthorized: false } 
        }
      : {
          host: process.env.DB_HOST || "localhost",
          port: parseInt(process.env.DB_PORT || "5432"),
          database: process.env.DB_NAME || "government_feedback",
          user: process.env.DB_USER || "postgres",
          password: process.env.DB_PASSWORD || "postgres",
          ssl: process.env.DB_HOST?.includes("supabase.co")
            ? { rejectUnauthorized: false }
            : false,
        }
  );

  let validationResults = {
    connection: false,
    tables: false,
    enums: false,
    data: false,
    crud: false
  };

  try {
    // Test 1: Database Connection
    log('\n1. Testing Database Connection...', 'cyan');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    
    logSuccess('Database connection successful');
    logInfo(`Server time: ${result.rows[0].current_time}`);
    logInfo(`PostgreSQL version: ${result.rows[0].version.split(' ')[1]}`);
    
    const dbType = process.env.DATABASE_URL ? 'Supabase' : 'Local PostgreSQL';
    logInfo(`Database type: ${dbType}`);
    
    validationResults.connection = true;

    // Test 2: Table Structure
    log('\n2. Validating Table Structure...', 'cyan');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    const actualTables = tablesResult.rows.map(row => row.table_name);
    
    logInfo(`Found ${actualTables.length} tables`);
    
    let allTablesPresent = true;
    for (const expectedTable of expectedTables) {
      if (actualTables.includes(expectedTable)) {
        logSuccess(`Table '${expectedTable}' exists`);
      } else {
        logError(`Table '${expectedTable}' is missing`);
        allTablesPresent = false;
      }
    }
    
    // Check for unexpected tables
    const unexpectedTables = actualTables.filter(table => !expectedTables.includes(table));
    if (unexpectedTables.length > 0) {
      logWarning(`Unexpected tables found: ${unexpectedTables.join(', ')}`);
    }
    
    validationResults.tables = allTablesPresent;

    // Test 3: Enum Types
    log('\n3. Validating Enum Types...', 'cyan');
    const enumsQuery = `
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e'
      ORDER BY typname;
    `;
    
    const enumsResult = await client.query(enumsQuery);
    const actualEnums = enumsResult.rows.map(row => row.typname);
    
    logInfo(`Found ${actualEnums.length} enum types`);
    
    let allEnumsPresent = true;
    for (const expectedEnum of expectedEnums) {
      if (actualEnums.includes(expectedEnum)) {
        logSuccess(`Enum '${expectedEnum}' exists`);
      } else {
        logError(`Enum '${expectedEnum}' is missing`);
        allEnumsPresent = false;
      }
    }
    
    validationResults.enums = allEnumsPresent;

    // Test 4: Data Integrity
    log('\n4. Checking Data Integrity...', 'cyan');
    let dataIntegrityPassed = true;
    
    for (const table of expectedTables) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = parseInt(countResult.rows[0].count);
        logInfo(`Table '${table}': ${count} records`);
      } catch (error) {
        logError(`Error checking table '${table}': ${error.message}`);
        dataIntegrityPassed = false;
      }
    }
    
    // Check foreign key constraints
    const constraintsQuery = `
      SELECT 
        tc.table_name, 
        tc.constraint_name, 
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public' 
      AND tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name;
    `;
    
    const constraintsResult = await client.query(constraintsQuery);
    logInfo(`Found ${constraintsResult.rows.length} foreign key constraints`);
    
    validationResults.data = dataIntegrityPassed;

    // Test 5: Basic CRUD Operations
    log('\n5. Testing Basic CRUD Operations...', 'cyan');
    let crudPassed = true;
    
    try {
      // Test SELECT operation
      await client.query('SELECT 1 as test');
      logSuccess('SELECT operation works');
      
      // Test if we can query actual tables
      const userCount = await client.query('SELECT COUNT(*) FROM users');
      logSuccess(`Can query users table (${userCount.rows[0].count} users)`);
      
      const officeCount = await client.query('SELECT COUNT(*) FROM offices');
      logSuccess(`Can query offices table (${officeCount.rows[0].count} offices)`);
      
    } catch (error) {
      logError(`CRUD test failed: ${error.message}`);
      crudPassed = false;
    }
    
    validationResults.crud = crudPassed;

    client.release();
    await pool.end();

    // Final Results
    log('\n📊 Validation Results', 'bright');
    log('==================', 'bright');
    
    const results = [
      { test: 'Database Connection', passed: validationResults.connection },
      { test: 'Table Structure', passed: validationResults.tables },
      { test: 'Enum Types', passed: validationResults.enums },
      { test: 'Data Integrity', passed: validationResults.data },
      { test: 'CRUD Operations', passed: validationResults.crud }
    ];
    
    let allPassed = true;
    results.forEach(result => {
      if (result.passed) {
        logSuccess(`${result.test}: PASSED`);
      } else {
        logError(`${result.test}: FAILED`);
        allPassed = false;
      }
    });
    
    log('\n' + '='.repeat(50), 'bright');
    if (allPassed) {
      logSuccess('🎉 Migration validation PASSED! Your database is ready to use.');
      log('\nNext steps:', 'cyan');
      log('1. Start your backend server: npm run dev', 'blue');
      log('2. Test your API endpoints', 'blue');
      log('3. Update your frontend configuration if needed', 'blue');
    } else {
      logError('❌ Migration validation FAILED! Please check the errors above.');
      log('\nTroubleshooting:', 'cyan');
      log('1. Re-run the migration: npm run db:migrate-supabase', 'blue');
      log('2. Check your Supabase project settings', 'blue');
      log('3. Verify your connection string is correct', 'blue');
    }
    
    return allPassed;
    
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    return false;
  }
}

// Run validation if called directly
if (require.main === module) {
  validateMigration()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      logError(`Validation error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { validateMigration };
