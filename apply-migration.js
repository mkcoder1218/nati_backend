require('dotenv').config();
const { Pool } = require('pg');

async function applyMigration() {
  console.log("Applying database migration for office_id column...");
  
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("1. Adding office_id column to users table...");
    
    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'office_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      // Add the column
      await client.query(`ALTER TABLE users ADD COLUMN office_id UUID;`);
      console.log("✓ office_id column added");
    } else {
      console.log("✓ office_id column already exists");
    }
    
    console.log("2. Adding foreign key constraint...");
    
    // Check if constraint already exists
    const constraintCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' AND constraint_name = 'fk_users_office_id'
    `);
    
    if (constraintCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE users ADD CONSTRAINT fk_users_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
      `);
      console.log("✓ Foreign key constraint added");
    } else {
      console.log("✓ Foreign key constraint already exists");
    }
    
    console.log("3. Creating index...");
    
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);`);
    console.log("✓ Index created");
    
    await client.query('COMMIT');
    console.log("\n🎉 Migration applied successfully!");
    
    // Verify the changes
    console.log("\nVerifying changes...");
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'office_id'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log("✓ office_id column verified:", verifyResult.rows[0]);
    } else {
      console.log("✗ office_id column not found after migration");
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log("\nMigration completed successfully!");
    console.log("You can now restart your backend server and test the login.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
