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

async function importToNeon() {
  log('📥 Manual Neon Import Tool', 'magenta');
  log('==========================', 'magenta');
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL not found in .env', 'red');
    return false;
  }
  
  // Check for export files
  const exportsDir = path.join(__dirname, 'exports');
  const exportFile = path.join(exportsDir, 'full_export_corrected.sql');
  
  if (!fs.existsSync(exportFile)) {
    log('❌ Export file not found: full_export_corrected.sql', 'red');
    log('Available files:', 'yellow');
    if (fs.existsSync(exportsDir)) {
      fs.readdirSync(exportsDir).forEach(file => {
        log(`   - ${file}`, 'cyan');
      });
    }
    return false;
  }
  
  log(`📁 Using export file: full_export_corrected.sql`, 'cyan');
  
  // Connection with optimized settings for Neon
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1, // Single connection for import
    connectionTimeoutMillis: 60000, // 1 minute timeout
    idleTimeoutMillis: 120000, // 2 minutes idle
    query_timeout: 60000, // 1 minute query timeout
  });
  
  try {
    log('🔗 Connecting to Neon...', 'yellow');
    const client = await pool.connect();
    
    log('✅ Connected successfully!', 'green');
    
    // Test basic query
    const testResult = await client.query('SELECT current_database(), current_user');
    log(`📊 Database: ${testResult.rows[0].current_database}`, 'cyan');
    log(`📊 User: ${testResult.rows[0].current_user}`, 'cyan');
    
    // Read and prepare SQL file
    log('📖 Reading export file...', 'yellow');
    const sqlContent = fs.readFileSync(exportFile, 'utf8');
    
    // Clean and split SQL content
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.match(/^\s*$/));
    
    log(`📝 Found ${statements.length} SQL statements to execute`, 'cyan');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    // Execute statements in batches
    const batchSize = 10;
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      
      log(`⏳ Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(statements.length/batchSize)} (statements ${i + 1}-${Math.min(i + batchSize, statements.length)})`, 'yellow');
      
      for (let j = 0; j < batch.length; j++) {
        const statement = batch[j];
        const statementNum = i + j + 1;
        
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
            log(`   ⚠️  Statement ${statementNum} error: ${error.message.substring(0, 100)}...`, 'yellow');
          }
        }
      }
      
      // Small delay between batches to avoid overwhelming Neon
      if (i + batchSize < statements.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    log('', 'reset');
    log('📊 Import Summary:', 'blue');
    log(`   ✅ Successful: ${successCount}`, 'green');
    log(`   ⏭️  Skipped: ${skipCount}`, 'yellow');
    log(`   ❌ Errors: ${errorCount}`, 'red');
    
    // Validate import
    log('', 'reset');
    log('🔍 Validating import...', 'blue');
    
    const tables = ['users', 'offices', 'reviews', 'comments', 'votes', 'office_votes'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result.rows[0].count;
        log(`   ✅ ${table}: ${count} records`, 'green');
      } catch (error) {
        log(`   ⚠️  ${table}: Not found or error`, 'yellow');
      }
    }
    
    client.release();
    
    log('', 'reset');
    log('🎉 Import completed successfully!', 'green');
    log('📝 Your Neon database now contains your local data.', 'green');
    log('🔄 You can now restart your backend to use Neon.', 'yellow');
    
    return true;
    
  } catch (error) {
    log(`❌ Import failed: ${error.message}`, 'red');
    return false;
  } finally {
    await pool.end();
  }
}

// Alternative: Generate psql command for manual import
function generatePsqlCommand() {
  log('', 'reset');
  log('🔧 Alternative: Manual psql Import', 'blue');
  log('==================================', 'blue');
  
  const exportFile = path.join(__dirname, 'exports', 'full_export_corrected.sql');
  
  if (fs.existsSync(exportFile)) {
    log('If Node.js connection fails, you can import manually using psql:', 'yellow');
    log('', 'reset');
    log('Command:', 'cyan');
    log(`psql "${process.env.DATABASE_URL}" -f "${exportFile}"`, 'green');
    log('', 'reset');
    log('Or step by step:', 'cyan');
    log('1. Install psql (PostgreSQL client)', 'yellow');
    log('2. Run the command above', 'yellow');
    log('3. Wait for import to complete', 'yellow');
  }
}

async function main() {
  const success = await importToNeon();
  
  if (!success) {
    generatePsqlCommand();
  }
  
  process.exit(success ? 0 : 1);
}

if (require.main === module) {
  main();
}

module.exports = { importToNeon };
