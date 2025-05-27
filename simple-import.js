const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🚀 Simple Neon Import (No psql required)');
console.log('========================================');

async function simpleImport() {
  // Check if export file exists
  const exportFile = path.join(__dirname, 'exports', 'full_export_corrected.sql');
  if (!fs.existsSync(exportFile)) {
    console.log('❌ Export file not found');
    return false;
  }

  console.log('📁 Found export file');
  console.log('⏳ Connecting to Neon...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 60000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon!');

    // Test query
    const test = await client.query('SELECT current_database()');
    console.log(`📊 Database: ${test.rows[0].current_database}`);

    // Read SQL file
    console.log('📖 Reading SQL file...');
    const sql = fs.readFileSync(exportFile, 'utf8');
    
    // Split into statements
    const statements = sql.split(';').filter(s => s.trim().length > 0);
    console.log(`📝 Found ${statements.length} statements`);

    console.log('⏳ Importing data...');
    let success = 0;
    let skipped = 0;

    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i] + ';');
        success++;
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate')) {
          skipped++;
        }
      }

      if ((i + 1) % 50 === 0) {
        console.log(`   Progress: ${i + 1}/${statements.length}`);
      }
    }

    console.log('');
    console.log('📊 Results:');
    console.log(`   ✅ Success: ${success}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);

    // Validate
    console.log('');
    console.log('🔍 Checking tables...');
    const tables = ['users', 'offices', 'reviews'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ✅ ${table}: ${result.rows[0].count} records`);
      } catch {
        console.log(`   ⚠️  ${table}: Not found`);
      }
    }

    client.release();
    console.log('');
    console.log('🎉 Import completed!');
    return true;

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

simpleImport().then(success => {
  if (success) {
    console.log('✅ Your Neon database is ready!');
    console.log('🔄 Restart your backend to use Neon.');
  } else {
    console.log('❌ Import failed. Try the Neon SQL Editor instead.');
  }
});
