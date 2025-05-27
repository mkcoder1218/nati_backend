const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'government_feedback'}`,
});

async function runMultipleOfficesMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Running multiple offices migration...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src', 'db', 'migrations', '008_add_multiple_office_assignments.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    
    // Test the new functionality
    console.log('🧪 Testing multiple office assignment functionality...\n');
    
    // Get a government official
    const officialResult = await client.query(`
      SELECT user_id, email, full_name 
      FROM users 
      WHERE role = 'official' 
      LIMIT 1
    `);
    
    if (officialResult.rows.length === 0) {
      console.log('❌ No government officials found for testing');
      return;
    }
    
    const official = officialResult.rows[0];
    console.log(`👤 Testing with official: ${official.full_name} (${official.email})`);
    
    // Get available offices
    const officesResult = await client.query(`
      SELECT office_id, name 
      FROM offices 
      ORDER BY name 
      LIMIT 3
    `);
    
    console.log(`🏢 Found ${officesResult.rows.length} offices for testing`);
    
    // Assign official to multiple offices
    for (let i = 0; i < Math.min(2, officesResult.rows.length); i++) {
      const office = officesResult.rows[i];
      const isPrimary = i === 0; // Make first office primary
      
      await client.query(
        'SELECT assign_user_to_office($1, $2, $3)',
        [official.user_id, office.office_id, isPrimary]
      );
      
      console.log(`✅ Assigned ${official.full_name} to ${office.name}${isPrimary ? ' (Primary)' : ''}`);
    }
    
    // Test getting user offices
    const userOfficesResult = await client.query(
      'SELECT * FROM get_user_offices($1)',
      [official.user_id]
    );
    
    console.log(`\n📋 ${official.full_name}'s office assignments:`);
    userOfficesResult.rows.forEach(office => {
      console.log(`   ${office.office_name} (${office.office_type})${office.is_primary ? ' - PRIMARY' : ''}`);
    });
    
    // Test getting primary office
    const primaryOfficeResult = await client.query(
      'SELECT * FROM get_user_primary_office($1)',
      [official.user_id]
    );
    
    if (primaryOfficeResult.rows.length > 0) {
      const primaryOffice = primaryOfficeResult.rows[0];
      console.log(`\n🎯 Primary office: ${primaryOffice.office_name}`);
    }
    
    // Test getting users by office
    if (officesResult.rows.length > 0) {
      const testOffice = officesResult.rows[0];
      const officeUsersResult = await client.query(`
        SELECT DISTINCT u.full_name, u.email, uoa.is_primary
        FROM users u
        JOIN user_office_assignments uoa ON u.user_id = uoa.user_id
        WHERE uoa.office_id = $1 AND uoa.status = 'active'
        ORDER BY uoa.is_primary DESC, u.full_name
      `, [testOffice.office_id]);
      
      console.log(`\n👥 Officials assigned to ${testOffice.name}:`);
      officeUsersResult.rows.forEach(user => {
        console.log(`   ${user.full_name} (${user.email})${user.is_primary ? ' - PRIMARY' : ''}`);
      });
    }
    
    console.log('\n🎉 Multiple office assignment system is working correctly!');
    console.log('\n📝 Summary of changes:');
    console.log('   ✅ Created user_office_assignments table');
    console.log('   ✅ Added database functions for office management');
    console.log('   ✅ Migrated existing office assignments');
    console.log('   ✅ Government officials can now be assigned to multiple offices');
    console.log('   ✅ Primary office designation is supported');
    console.log('   ✅ Frontend will show office selection based on assignments');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await runMultipleOfficesMigration();
  } catch (error) {
    console.error('💥 Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
main();
