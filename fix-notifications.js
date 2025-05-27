const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

async function createNotificationsTable() {
  console.log('🔧 Starting notifications table creation...');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'government_feedback',
  });

  try {
    console.log('📡 Connecting to database...');
    const client = await pool.connect();
    
    try {
      // Check if table exists
      console.log('🔍 Checking if notifications table exists...');
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ Notifications table already exists!');
        return;
      }
      
      console.log('📝 Creating notifications table...');
      
      // Read and execute the SQL file
      const sqlPath = path.join(__dirname, 'create-notifications-table.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');
      
      await client.query(sql);
      
      // Verify creation
      const verifyCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'notifications'
        );
      `);
      
      if (verifyCheck.rows[0].exists) {
        console.log('✅ Notifications table created successfully!');
        
        // Test the table by getting count
        const countResult = await client.query('SELECT COUNT(*) FROM notifications');
        console.log(`📊 Current notifications count: ${countResult.rows[0].count}`);
      } else {
        console.log('❌ Failed to create notifications table');
      }
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
  } finally {
    await pool.end();
  }
}

// Run the function
createNotificationsTable()
  .then(() => {
    console.log('🎉 Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
