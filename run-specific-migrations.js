require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create database connection using the same config as the main app
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function runSpecificMigrations() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");
    console.log(`📍 Database: ${process.env.DB_NAME || 'government_feedback'}`);
    console.log(`👤 User: ${process.env.DB_USER || 'postgres'}`);
    console.log(`🏠 Host: ${process.env.DB_HOST || 'localhost'}`);

    // List of specific migrations to run
    const migrationsToRun = [
      'create_review_replies_table.sql',
      '009_add_missing_office_columns.sql'
    ];

    for (const migrationFile of migrationsToRun) {
      console.log(`\n📝 Running migration: ${migrationFile}`);
      
      const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', migrationFile);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠️  Migration file not found: ${migrationPath}`);
        continue;
      }

      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        // Begin transaction
        await client.query('BEGIN');
        
        // Execute migration
        await client.query(migrationSQL);
        
        // Commit transaction
        await client.query('COMMIT');
        
        console.log(`✅ Migration ${migrationFile} completed successfully`);
      } catch (error) {
        // Rollback transaction on error
        await client.query('ROLLBACK');
        console.error(`❌ Migration ${migrationFile} failed:`, error.message);
        
        // Continue with other migrations instead of stopping
        continue;
      }
    }

    // Test the tables
    console.log('\n🧪 Testing tables...');
    
    // Test review_replies table
    try {
      const repliesTest = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'review_replies'
        ORDER BY ordinal_position;
      `);
      
      if (repliesTest.rows.length > 0) {
        console.log('✅ review_replies table exists with columns:');
        repliesTest.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
      } else {
        console.log('❌ review_replies table does not exist');
      }
    } catch (error) {
      console.log('❌ Error testing review_replies table:', error.message);
    }

    // Test offices table columns
    try {
      const officesTest = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'offices' AND column_name IN ('upvote_count', 'downvote_count', 'created_at', 'updated_at')
        ORDER BY ordinal_position;
      `);
      
      if (officesTest.rows.length > 0) {
        console.log('✅ offices table has required columns:');
        officesTest.rows.forEach(row => {
          console.log(`  - ${row.column_name}: ${row.data_type}`);
        });
      } else {
        console.log('❌ offices table missing required columns');
      }
    } catch (error) {
      console.log('❌ Error testing offices table:', error.message);
    }

    console.log('\n🎉 Migration process completed!');
  } catch (err) {
    console.error('💥 Error running migrations:', err);
    throw err;
  } finally {
    await client.release();
    await pool.end();
  }
}

// Run the migrations
runSpecificMigrations()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Process failed:', error);
    process.exit(1);
  });
