const { Pool } = require('pg');
require('dotenv').config();

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL');
    
    // Check if office_votes table exists
    const tableResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'office_votes'
      );
    `);
    
    const tableExists = tableResult.rows[0].exists;
    console.log(`office_votes table exists: ${tableExists}`);
    
    // List all tables in the database
    console.log('\nAll tables in the database:');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    tablesResult.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    // Check if office_vote_type enum exists
    const enumResult = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_type 
        WHERE typname = 'office_vote_type'
      );
    `);
    
    const enumExists = enumResult.rows[0].exists;
    console.log(`\noffice_vote_type enum exists: ${enumExists}`);
    
    // List all enums in the database
    console.log('\nAll enums in the database:');
    const enumsResult = await client.query(`
      SELECT typname 
      FROM pg_type 
      WHERE typcategory = 'E'
      ORDER BY typname;
    `);
    
    enumsResult.rows.forEach(row => {
      console.log(`- ${row.typname}`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema()
  .then(() => {
    console.log('\nSchema check completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Schema check failed:', err);
    process.exit(1);
  });
