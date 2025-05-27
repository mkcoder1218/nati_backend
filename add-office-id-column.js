const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'government_feedback'
});

async function addOfficeIdColumn() {
  try {
    console.log('Adding office_id column to users table...');
    
    // Add the office_id column
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS office_id UUID REFERENCES offices(office_id) ON DELETE SET NULL
    `);
    
    console.log('office_id column added successfully');
    
    // Verify the column was added
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'office_id'
    `);
    
    if (result.rows.length > 0) {
      console.log('Verification: office_id column exists');
      console.log(`  - ${result.rows[0].column_name} (${result.rows[0].data_type}) ${result.rows[0].is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    } else {
      console.log('Warning: office_id column not found after addition');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addOfficeIdColumn();
