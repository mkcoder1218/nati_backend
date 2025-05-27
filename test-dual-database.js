require('dotenv').config();
const { Pool } = require('pg');

console.log('🔄 Dual Database Testing Tool');
console.log('=============================');

// Database configurations
const neonConfig = {
  connectionString: process.env.DATABASE_URL_NEON || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 3,
  connectionTimeoutMillis: 10000,
};

const localConfig = {
  connectionString: process.env.DATABASE_URL_LOCAL,
  host: process.env.DB_HOST_LOCAL || 'localhost',
  port: parseInt(process.env.DB_PORT_LOCAL || '5432'),
  database: process.env.DB_NAME_LOCAL || 'government_feedback',
  user: process.env.DB_USER_LOCAL || 'postgres',
  password: process.env.DB_PASSWORD_LOCAL || 'postgres',
  ssl: false,
  max: 3,
  connectionTimeoutMillis: 5000,
};

// Test individual database connection
async function testDatabase(config, name) {
  console.log(`\n🔍 Testing ${name} Database...`);
  console.log('─'.repeat(40));
  
  const pool = new Pool(config);
  
  try {
    const client = await pool.connect();
    
    // Basic connection test
    console.log(`✅ Connection: Successful`);
    
    // Get database info
    const dbInfo = await client.query(`
      SELECT 
        current_database() as database_name,
        current_user as user_name,
        version() as version,
        now() as current_time
    `);
    
    const info = dbInfo.rows[0];
    console.log(`📊 Database: ${info.database_name}`);
    console.log(`👤 User: ${info.user_name}`);
    console.log(`🔧 Version: ${info.version.split(' ').slice(0, 2).join(' ')}`);
    console.log(`⏰ Time: ${new Date(info.current_time).toLocaleString()}`);
    
    // Test table existence
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'offices', 'reviews', 'votes')
      ORDER BY table_name
    `);
    
    if (tables.rows.length > 0) {
      console.log(`📋 Tables found: ${tables.rows.map(r => r.table_name).join(', ')}`);
      
      // Get record counts
      for (const table of tables.rows) {
        try {
          const count = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
          console.log(`   📊 ${table.table_name}: ${count.rows[0].count} records`);
        } catch (error) {
          console.log(`   ⚠️  ${table.table_name}: Error counting records`);
        }
      }
    } else {
      console.log(`⚠️  No application tables found`);
    }
    
    client.release();
    await pool.end();
    
    return {
      success: true,
      database: info.database_name,
      user: info.user_name,
      version: info.version.split(' ')[1],
      tables: tables.rows.length,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    await pool.end();
    console.log(`❌ Connection: Failed`);
    console.log(`💥 Error: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Test fallback system
async function testFallbackSystem() {
  console.log(`\n🔄 Testing Fallback System...`);
  console.log('─'.repeat(40));
  
  const dbPrimary = process.env.DB_PRIMARY || 'auto';
  console.log(`📋 Current DB_PRIMARY setting: ${dbPrimary}`);
  
  // Test based on current setting
  switch (dbPrimary.toLowerCase()) {
    case 'neon':
      console.log('🌐 Testing Neon-only mode...');
      return await testDatabase(neonConfig, 'Neon');
      
    case 'local':
      console.log('🏠 Testing Local-only mode...');
      return await testDatabase(localConfig, 'Local');
      
    case 'auto':
    default:
      console.log('🔄 Testing Auto-fallback mode...');
      
      // Try Neon first
      console.log('🌐 Trying Neon first...');
      const neonResult = await testDatabase(neonConfig, 'Neon');
      
      if (neonResult.success) {
        console.log('✅ Neon successful - would use Neon as primary');
        return { primary: 'neon', result: neonResult };
      } else {
        console.log('❌ Neon failed - testing fallback to Local...');
        const localResult = await testDatabase(localConfig, 'Local');
        
        if (localResult.success) {
          console.log('✅ Local successful - would use Local as fallback');
          return { primary: 'local', result: localResult, fallback: true };
        } else {
          console.log('❌ Both databases failed');
          return { primary: 'none', neonError: neonResult.error, localError: localResult.error };
        }
      }
  }
}

// Main test function
async function runTests() {
  try {
    console.log('🚀 Starting dual database tests...');
    console.log(`📅 ${new Date().toLocaleString()}`);
    
    // Test individual databases
    const neonResult = await testDatabase(neonConfig, 'Neon');
    const localResult = await testDatabase(localConfig, 'Local');
    
    // Test fallback system
    const fallbackResult = await testFallbackSystem();
    
    // Summary
    console.log(`\n📊 Test Summary`);
    console.log('═'.repeat(40));
    console.log(`🌐 Neon Database: ${neonResult.success ? '✅ Available' : '❌ Unavailable'}`);
    console.log(`🏠 Local Database: ${localResult.success ? '✅ Available' : '❌ Unavailable'}`);
    
    if (fallbackResult.primary === 'neon') {
      console.log(`🎯 Active Database: Neon (Primary)`);
    } else if (fallbackResult.primary === 'local') {
      console.log(`🎯 Active Database: Local ${fallbackResult.fallback ? '(Fallback)' : '(Primary)'}`);
    } else {
      console.log(`🎯 Active Database: None (Both failed)`);
    }
    
    console.log(`\n💡 Recommendations:`);
    
    if (neonResult.success && localResult.success) {
      console.log(`✅ Both databases are working perfectly!`);
      console.log(`🔄 Your fallback system is fully operational`);
    } else if (neonResult.success && !localResult.success) {
      console.log(`⚠️  Neon works but Local database has issues`);
      console.log(`🔧 Consider fixing local PostgreSQL for complete fallback support`);
    } else if (!neonResult.success && localResult.success) {
      console.log(`⚠️  Local works but Neon database has issues`);
      console.log(`🌐 Check your Neon connection or try waking up the database`);
    } else {
      console.log(`❌ Both databases have issues`);
      console.log(`🔧 Please fix database connections before running the application`);
    }
    
    console.log(`\n🔧 Configuration Tips:`);
    console.log(`• Set DB_PRIMARY=neon to always use Neon`);
    console.log(`• Set DB_PRIMARY=local to always use Local`);
    console.log(`• Set DB_PRIMARY=auto for automatic fallback (recommended)`);
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run tests
if (require.main === module) {
  runTests().then(() => {
    console.log('\n✨ Tests completed');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Tests failed:', error.message);
    process.exit(1);
  });
}

module.exports = { testDatabase, testFallbackSystem, runTests };
