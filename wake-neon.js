const { Pool } = require('pg');
require('dotenv').config();

// Color logging
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function wakeNeonDatabase() {
  log('🌅 Waking up Neon Database...', 'blue');
  log('============================', 'blue');
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL not found in .env file', 'red');
    log('Please check your .env file and ensure DATABASE_URL is set.', 'yellow');
    return false;
  }
  
  // Show masked connection string
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^:@]+)@/, ':****@');
  log(`📍 Connection: ${maskedUrl}`, 'cyan');
  
  const maxRetries = 5;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    retryCount++;
    log(`\n🔄 Attempt ${retryCount}/${maxRetries}...`, 'yellow');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 45000, // 45 seconds
      idleTimeoutMillis: 60000,
      max: 1, // Single connection for wake-up
    });
    
    try {
      log('⏳ Connecting to Neon...', 'yellow');
      
      const client = await pool.connect();
      
      log('✅ Connection successful!', 'green');
      
      // Run a simple query to fully wake up the database
      log('📋 Running wake-up query...', 'yellow');
      const result = await client.query(`
        SELECT 
          version() as version,
          current_database() as database,
          current_user as user,
          now() as current_time
      `);
      
      const row = result.rows[0];
      log('📊 Database Information:', 'cyan');
      log(`   Version: ${row.version.split(' ')[1]}`, 'cyan');
      log(`   Database: ${row.database}`, 'cyan');
      log(`   User: ${row.user}`, 'cyan');
      log(`   Time: ${row.current_time}`, 'cyan');
      
      // Check if tables exist
      log('📋 Checking for existing tables...', 'yellow');
      const tablesResult = await client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);
      
      if (tablesResult.rows.length > 0) {
        log(`📊 Found ${tablesResult.rows.length} tables:`, 'cyan');
        tablesResult.rows.forEach((table, index) => {
          log(`   ${index + 1}. ${table.tablename}`, 'cyan');
        });
      } else {
        log('📊 No tables found (empty database)', 'yellow');
      }
      
      client.release();
      await pool.end();
      
      log('\n🎉 Neon database is now awake and ready!', 'green');
      log('✅ You can now run the migration script.', 'green');
      
      return true;
      
    } catch (error) {
      await pool.end();
      
      log(`❌ Attempt ${retryCount} failed: ${error.message}`, 'red');
      
      if (retryCount < maxRetries) {
        const waitTime = retryCount * 5; // Increasing wait time
        log(`⏳ Waiting ${waitTime} seconds before retry...`, 'yellow');
        await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
      }
    }
  }
  
  log('\n💥 Failed to wake up Neon database after all attempts.', 'red');
  log('\n🔧 Troubleshooting steps:', 'yellow');
  log('1. Check your Neon dashboard - the database might be suspended', 'cyan');
  log('2. Verify your DATABASE_URL is correct', 'cyan');
  log('3. Check your internet connection', 'cyan');
  log('4. Try accessing Neon dashboard to manually wake the database', 'cyan');
  log('5. Contact Neon support if the issue persists', 'cyan');
  
  return false;
}

async function testQuickConnection() {
  log('⚡ Quick Connection Test...', 'blue');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000, // 10 seconds
    max: 1,
  });
  
  try {
    const client = await pool.connect();
    log('✅ Quick test successful!', 'green');
    client.release();
    return true;
  } catch (error) {
    log(`❌ Quick test failed: ${error.message}`, 'red');
    return false;
  } finally {
    await pool.end();
  }
}

async function main() {
  log('🌅 Neon Database Wake-Up Tool', 'magenta');
  log('=============================', 'magenta');
  
  // First try a quick connection
  const quickSuccess = await testQuickConnection();
  
  if (quickSuccess) {
    log('\n🎉 Database is already awake!', 'green');
    return true;
  }
  
  // If quick test fails, try the full wake-up process
  log('\n💤 Database appears to be sleeping. Starting wake-up process...', 'yellow');
  
  const success = await wakeNeonDatabase();
  
  if (success) {
    log('\n🚀 Ready for migration!', 'green');
    log('You can now run: node simple-neon-migration.js', 'cyan');
  }
  
  return success;
}

if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { wakeNeonDatabase, testQuickConnection };
