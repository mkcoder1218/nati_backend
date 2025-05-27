require('dotenv').config();
const { Pool } = require('pg');

async function testConnection() {
  console.log("Testing database connection...");
  console.log("DB_HOST:", process.env.DB_HOST);
  console.log("DB_PORT:", process.env.DB_PORT);
  console.log("DB_NAME:", process.env.DB_NAME);
  console.log("DB_USER:", process.env.DB_USER);
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  
  try {
    const client = await pool.connect();
    console.log("✓ Database connection successful!");
    
    // Test if users table exists
    const result = await client.query("SELECT COUNT(*) FROM users");
    console.log("✓ Users table accessible, count:", result.rows[0].count);
    
    // Test if offices table exists
    const officesResult = await client.query("SELECT COUNT(*) FROM offices");
    console.log("✓ Offices table accessible, count:", officesResult.rows[0].count);
    
    client.release();
    await pool.end();
    
    console.log("Database is ready for setup!");
    return true;
  } catch (error) {
    console.error("✗ Database connection failed:", error.message);
    await pool.end();
    return false;
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
