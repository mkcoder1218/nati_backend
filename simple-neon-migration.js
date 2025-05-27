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

// Neon configuration optimized for pooling
const neonConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3, // Small pool for migration
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
  keepAlive: true,
};

async function testConnection() {
  log('🔗 Testing Neon connection...', 'blue');
  
  if (!process.env.DATABASE_URL) {
    log('❌ DATABASE_URL not found in .env', 'red');
    return false;
  }
  
  const pool = new Pool(neonConfig);
  
  try {
    log('⏳ Connecting (may take time if database is sleeping)...', 'yellow');
    const client = await pool.connect();
    
    const result = await client.query('SELECT version(), current_database()');
    log('✅ Connection successful!', 'green');
    log(`📋 Database: ${result.rows[0].current_database}`, 'cyan');
    
    client.release();
    return true;
  } catch (error) {
    log(`❌ Connection failed: ${error.message}`, 'red');
    return false;
  } finally {
    await pool.end();
  }
}

async function importBackupToNeon() {
  log('📥 Importing backup to Neon...', 'blue');
  
  // Find the most recent backup file
  const backupsDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupsDir)) {
    throw new Error('No backups directory found. Please run backup first.');
  }
  
  const backupFiles = fs.readdirSync(backupsDir)
    .filter(file => file.endsWith('.sql'))
    .sort()
    .reverse(); // Most recent first
  
  if (backupFiles.length === 0) {
    throw new Error('No backup files found. Please run backup first.');
  }
  
  const backupFile = path.join(backupsDir, backupFiles[0]);
  log(`📁 Using backup: ${backupFiles[0]}`, 'cyan');
  
  const pool = new Pool(neonConfig);
  
  try {
    const client = await pool.connect();
    
    // Read backup file
    const sqlContent = fs.readFileSync(backupFile, 'utf8');
    
    // Split into statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    log(`📝 Executing ${statements.length} statements...`, 'cyan');
    
    let successCount = 0;
    let skipCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        await client.query(statement + ';');
        successCount++;
        
        if ((i + 1) % 25 === 0) {
          log(`   ⏳ Progress: ${i + 1}/${statements.length}`, 'yellow');
        }
      } catch (error) {
        // Skip common conflicts
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate key') ||
            error.message.includes('violates unique constraint')) {
          skipCount++;
        } else {
          log(`   ⚠️  Error in statement ${i + 1}: ${error.message}`, 'yellow');
        }
      }
    }
    
    log(`✅ Import completed: ${successCount} successful, ${skipCount} skipped`, 'green');
    
    client.release();
    
  } catch (error) {
    log(`❌ Import failed: ${error.message}`, 'red');
    throw error;
  } finally {
    await pool.end();
  }
}

async function validateData() {
  log('🔍 Validating imported data...', 'blue');
  
  const pool = new Pool(neonConfig);
  
  try {
    const client = await pool.connect();
    
    // Check main tables
    const tables = ['users', 'offices', 'reviews', 'comments', 'votes'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        const count = result.rows[0].count;
        log(`   ✅ ${table}: ${count} records`, 'green');
      } catch (error) {
        log(`   ⚠️  ${table}: Table not found or error`, 'yellow');
      }
    }
    
    client.release();
    
  } catch (error) {
    log(`❌ Validation failed: ${error.message}`, 'red');
  } finally {
    await pool.end();
  }
}

async function main() {
  try {
    log('🚀 Simple Neon Migration Tool', 'magenta');
    log('============================', 'magenta');
    
    // Step 1: Test connection
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Cannot connect to Neon. Check your DATABASE_URL.');
    }
    
    // Step 2: Import backup
    await importBackupToNeon();
    
    // Step 3: Validate
    await validateData();
    
    log('', 'reset');
    log('🎉 Migration completed successfully!', 'green');
    log('📝 Your Neon database now has your local data.', 'green');
    log('🔄 Restart your backend to use Neon database.', 'yellow');
    
  } catch (error) {
    log('', 'reset');
    log(`💥 Migration failed: ${error.message}`, 'red');
    log('🔧 Check the error and try again.', 'yellow');
    process.exit(1);
  }
}

// Interactive runner
if (require.main === module) {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('🔄 Negari Simple Migration to Neon');
  console.log('===================================');
  console.log('');
  console.log('This will import your latest backup to Neon database.');
  console.log('');

  rl.question('Continue? (y/N): ', (answer) => {
    rl.close();
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      main();
    } else {
      console.log('❌ Migration cancelled.');
      process.exit(0);
    }
  });
}

module.exports = { main };
