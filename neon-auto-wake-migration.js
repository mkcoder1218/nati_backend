const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Color logging
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Neon-optimized connection with auto-wake handling
async function createNeonConnection() {
  const maxRetries = 8; // More retries for sleeping database
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    retryCount++;
    
    log(`🔄 Connection attempt ${retryCount}/${maxRetries}...`, 'yellow');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1, // Single connection for migration
      connectionTimeoutMillis: 45000, // 45 seconds - enough time for wake-up
      idleTimeoutMillis: 300000, // 5 minutes - keep connection alive during migration
      query_timeout: 60000, // 1 minute per query
    });
    
    try {
      if (retryCount === 1) {
        log('⏳ Connecting to Neon (waking up database if sleeping)...', 'cyan');
      } else {
        log(`⏳ Retry ${retryCount - 1}: Database may still be waking up...`, 'cyan');
      }
      
      const client = await pool.connect();
      
      // Test the connection with a simple query
      await client.query('SELECT 1');
      
      log('✅ Connection successful! Database is awake.', 'green');
      
      return { pool, client };
      
    } catch (error) {
      await pool.end();
      
      if (error.message.includes('ECONNRESET') || 
          error.message.includes('timeout') ||
          error.message.includes('ENOTFOUND')) {
        
        if (retryCount < maxRetries) {
          const waitTime = Math.min(retryCount * 3, 15); // Progressive wait, max 15 seconds
          log(`💤 Database is sleeping. Waiting ${waitTime}s before retry...`, 'yellow');
          await new Promise(resolve => setTimeout(resolve, waitTime * 1000));
        } else {
          log('❌ Database failed to wake up after all attempts.', 'red');
          throw new Error('Neon database failed to wake up. Please try again later or check your dashboard.');
        }
      } else {
        log(`❌ Connection failed: ${error.message}`, 'red');
        throw error;
      }
    }
  }
}

async function importWithAutoWake() {
  log('🌅 Neon Auto-Wake Migration Tool', 'magenta');
  log('================================', 'magenta');
  log('This tool handles Neon\'s auto-sleep behavior automatically.', 'cyan');
  log('', 'reset');
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL not found in .env', 'red');
    return false;
  }
  
  // Check for export file
  const exportFile = path.join(__dirname, 'exports', 'full_export_corrected.sql');
  if (!fs.existsSync(exportFile)) {
    log('❌ Export file not found: exports/full_export_corrected.sql', 'red');
    return false;
  }
  
  log('📁 Using export file: full_export_corrected.sql', 'cyan');
  
  let pool, client;
  
  try {
    // Connect with auto-wake handling
    ({ pool, client } = await createNeonConnection());
    
    // Get database info
    const dbInfo = await client.query('SELECT current_database(), current_user, version()');
    log(`📊 Database: ${dbInfo.rows[0].current_database}`, 'cyan');
    log(`📊 User: ${dbInfo.rows[0].current_user}`, 'cyan');
    log(`📊 Version: ${dbInfo.rows[0].version.split(' ')[1]}`, 'cyan');
    log('', 'reset');
    
    // Read and prepare SQL
    log('📖 Reading export file...', 'yellow');
    const sqlContent = fs.readFileSync(exportFile, 'utf8');
    
    // Clean and split SQL content
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\s*$/));
    
    log(`📝 Found ${statements.length} SQL statements`, 'cyan');
    log('', 'reset');
    
    // Execute statements with progress tracking
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    const batchSize = 25; // Smaller batches to avoid timeouts
    const totalBatches = Math.ceil(statements.length / batchSize);
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      log(`⏳ Processing batch ${batchNum}/${totalBatches} (statements ${i + 1}-${Math.min(i + batchSize, statements.length)})`, 'yellow');
      
      for (let j = 0; j < batch.length; j++) {
        const statement = batch[j];
        
        try {
          await client.query(statement + ';');
          successCount++;
        } catch (error) {
          // Handle common conflicts gracefully
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key') ||
              error.message.includes('violates unique constraint') ||
              error.message.includes('does not exist')) {
            skipCount++;
          } else {
            errorCount++;
            if (errorCount <= 5) { // Only show first 5 errors to avoid spam
              log(`   ⚠️  Error: ${error.message.substring(0, 80)}...`, 'yellow');
            }
          }
        }
      }
      
      // Keep connection alive and show progress
      if (batchNum % 5 === 0) {
        await client.query('SELECT 1'); // Keep-alive query
        log(`   📊 Progress: ${successCount} successful, ${skipCount} skipped, ${errorCount} errors`, 'cyan');
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    log('', 'reset');
    log('📊 Import Summary:', 'blue');
    log(`   ✅ Successful: ${successCount}`, 'green');
    log(`   ⏭️  Skipped: ${skipCount}`, 'yellow');
    log(`   ❌ Errors: ${errorCount}`, errorCount > 0 ? 'red' : 'green');
    log('', 'reset');
    
    // Validate import
    log('🔍 Validating import...', 'blue');
    const tables = ['users', 'offices', 'reviews', 'comments', 'votes', 'office_votes'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result.rows[0].count;
        log(`   ✅ ${table}: ${count} records`, 'green');
      } catch (error) {
        log(`   ⚠️  ${table}: Not found`, 'yellow');
      }
    }
    
    log('', 'reset');
    log('🎉 Migration completed successfully!', 'green');
    log('📝 Your Neon database now contains your local data.', 'green');
    log('🔄 Restart your backend server to use Neon database.', 'yellow');
    log('', 'reset');
    log('💡 Note: Neon databases auto-sleep after inactivity.', 'cyan');
    log('💡 Your first request after sleep may take a few seconds.', 'cyan');
    
    return true;
    
  } catch (error) {
    log(`❌ Migration failed: ${error.message}`, 'red');
    return false;
  } finally {
    if (client) client.release();
    if (pool) await pool.end();
  }
}

// Interactive runner
async function main() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🌅 Neon Auto-Wake Migration');
  console.log('===========================');
  console.log('');
  console.log('This tool will:');
  console.log('• Automatically wake up your Neon database if sleeping');
  console.log('• Import your local data to Neon');
  console.log('• Handle connection timeouts gracefully');
  console.log('');

  rl.question('Continue with migration? (y/N): ', async (answer) => {
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      const success = await importWithAutoWake();
      process.exit(success ? 0 : 1);
    } else {
      console.log('❌ Migration cancelled.');
      process.exit(0);
    }
  });
}

if (require.main === module) {
  main();
}

module.exports = { importWithAutoWake };
