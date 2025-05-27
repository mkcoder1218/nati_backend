const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: 'government_feedback'
});

async function restoreData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database for data restoration');
    
    // Read the export file
    const exportPath = './exports/full_export_corrected.sql';
    const sqlContent = fs.readFileSync(exportPath, 'utf8');
    
    console.log('Executing data restoration...');
    
    // Split the SQL content by statements and execute them one by one
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          await client.query(statement);
          if (i % 10 === 0) {
            console.log(`Executed ${i + 1}/${statements.length} statements...`);
          }
        } catch (error) {
          // Skip errors for statements that might already exist
          if (!error.message.includes('already exists') && 
              !error.message.includes('duplicate key') &&
              !error.message.includes('violates unique constraint')) {
            console.warn(`Warning on statement ${i + 1}:`, error.message);
          }
        }
      }
    }
    
    console.log('Data restoration completed successfully');
    
    // Verify the restoration by checking some key tables
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const officeCount = await client.query('SELECT COUNT(*) FROM offices');
    const reviewCount = await client.query('SELECT COUNT(*) FROM reviews');
    
    console.log(`Restored data summary:`);
    console.log(`- Users: ${userCount.rows[0].count}`);
    console.log(`- Offices: ${officeCount.rows[0].count}`);
    console.log(`- Reviews: ${reviewCount.rows[0].count}`);
    
  } catch (error) {
    console.error('Error during data restoration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the restoration
restoreData()
  .then(() => {
    console.log('Data restoration process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Data restoration process failed:', err);
    process.exit(1);
  });
