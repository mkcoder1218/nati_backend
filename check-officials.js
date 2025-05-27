const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'government_feedback'}`,
});

async function checkOfficials() {
  try {
    console.log('🔍 Checking government officials in database...\n');
    
    // Check all officials
    console.log('👥 All Government Officials:');
    const allOfficialsResult = await pool.query(`
      SELECT u.user_id, u.email, u.full_name, u.role, o.name as office_name, u.office_id
      FROM users u
      LEFT JOIN offices o ON u.office_id = o.office_id
      WHERE u.role = 'official'
      ORDER BY u.full_name
    `);
    
    if (allOfficialsResult.rows.length === 0) {
      console.log('   ❌ No government officials found');
    } else {
      allOfficialsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.full_name} (${row.email})`);
        console.log(`      Office: ${row.office_name || 'Not assigned'}`);
        console.log(`      Office ID: ${row.office_id || 'None'}\n`);
      });
    }
    
    // Check available (unassigned) officials
    console.log('🆓 Available (Unassigned) Government Officials:');
    const availableOfficialsResult = await pool.query(`
      SELECT user_id, email, full_name, role
      FROM users 
      WHERE role = 'official' AND office_id IS NULL
      ORDER BY full_name
    `);
    
    if (availableOfficialsResult.rows.length === 0) {
      console.log('   ❌ No available (unassigned) government officials found');
      console.log('   ℹ️  This is why the dropdown is empty - all officials are already assigned to offices');
    } else {
      availableOfficialsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.full_name} (${row.email})`);
      });
    }
    
    // Check total counts
    console.log('\n📊 Summary:');
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(CASE WHEN role = 'official' THEN 1 END) as total_officials,
        COUNT(CASE WHEN role = 'official' AND office_id IS NULL THEN 1 END) as available_officials,
        COUNT(CASE WHEN role = 'official' AND office_id IS NOT NULL THEN 1 END) as assigned_officials
      FROM users
    `);
    
    const summary = summaryResult.rows[0];
    console.log(`   Total Officials: ${summary.total_officials}`);
    console.log(`   Available Officials: ${summary.available_officials}`);
    console.log(`   Assigned Officials: ${summary.assigned_officials}`);
    
  } catch (error) {
    console.error('❌ Error checking officials:', error);
  } finally {
    await pool.end();
  }
}

checkOfficials();
