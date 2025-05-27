const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'government_feedback'}`,
});

async function setupOfficialPassword() {
  try {
    console.log('🔐 Setting up government official password...\n');
    
    // Check current official user
    const officialResult = await pool.query(`
      SELECT user_id, email, full_name, password, office_id
      FROM users 
      WHERE role = 'official'
    `);
    
    if (officialResult.rows.length === 0) {
      console.log('❌ No government official found');
      return;
    }
    
    const official = officialResult.rows[0];
    console.log('👤 Found government official:');
    console.log(`   Email: ${official.email}`);
    console.log(`   Name: ${official.full_name}`);
    console.log(`   Office ID: ${official.office_id}`);
    console.log(`   Current password hash: ${official.password.substring(0, 20)}...`);
    
    // Create a new password hash
    const newPassword = 'official123';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log(`\n🔑 Creating new password: ${newPassword}`);
    console.log(`   New hash: ${hashedPassword.substring(0, 20)}...`);
    
    // Update the password
    await pool.query(
      'UPDATE users SET password = $1 WHERE user_id = $2',
      [hashedPassword, official.user_id]
    );
    
    console.log('\n✅ Password updated successfully!');
    
    // Test the password
    const testResult = await bcrypt.compare(newPassword, hashedPassword);
    console.log(`🧪 Password test: ${testResult ? 'PASS' : 'FAIL'}`);
    
    console.log('\n📋 Login credentials:');
    console.log(`   Email: ${official.email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Role: official`);
    
    // Get office information
    if (official.office_id) {
      const officeResult = await pool.query(
        'SELECT name FROM offices WHERE office_id = $1',
        [official.office_id]
      );
      
      if (officeResult.rows.length > 0) {
        console.log(`   Assigned Office: ${officeResult.rows[0].name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error setting up password:', error);
  } finally {
    await pool.end();
  }
}

setupOfficialPassword();
