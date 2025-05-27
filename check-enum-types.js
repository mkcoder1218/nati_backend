require('dotenv').config();
const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

async function checkEnumTypes() {
  const client = await pool.connect();

  try {
    console.log("🔗 Connected to database");

    // Check existing enum types
    const enumResult = await client.query(`
      SELECT typname, enumlabel 
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid 
      WHERE typname LIKE '%report%' OR typname LIKE '%status%'
      ORDER BY typname, enumlabel;
    `);

    console.log("📋 Existing enum types related to reports:");
    const enumsByType = {};
    enumResult.rows.forEach(row => {
      if (!enumsByType[row.typname]) {
        enumsByType[row.typname] = [];
      }
      enumsByType[row.typname].push(row.enumlabel);
    });

    Object.keys(enumsByType).forEach(typeName => {
      console.log(`  ${typeName}: [${enumsByType[typeName].join(', ')}]`);
    });

    // Check if reports table exists
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'reports'
    `);

    if (tableResult.rows.length > 0) {
      console.log("✅ reports table exists");
      
      // Check table structure
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'reports'
        ORDER BY ordinal_position;
      `);
      
      console.log("📋 reports table structure:");
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } else {
      console.log("❌ reports table does NOT exist");
    }

    await client.release();
    await pool.end();
    
    console.log("🎉 Check completed successfully!");
  } catch (error) {
    console.error("💥 Error checking enum types:", error.message);
    process.exit(1);
  }
}

checkEnumTypes();
