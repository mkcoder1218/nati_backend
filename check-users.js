/**
 * Script to check existing users and their details
 */

require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Create a connection to the database
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'government_feedback',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkUsers() {
  try {
    console.log('🔍 Checking existing users...\n');

    const result = await pool.query(`
      SELECT user_id, email, full_name, role, password, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    console.log(`Found ${result.rows.length} users:\n`);

    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Password Hash: ${user.password.substring(0, 20)}...`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // Test password verification for a known user
    if (result.rows.length > 0) {
      console.log('Testing password verification...');
      const testUser = result.rows.find(u => u.email === 'citizen2@example.com') || result.rows[0];
      
      console.log(`Testing with user: ${testUser.email}`);
      
      // Common test passwords
      const testPasswords = ['password123', 'password', '123456', 'citizen123'];
      
      for (const testPassword of testPasswords) {
        const isValid = await bcrypt.compare(testPassword, testUser.password);
        console.log(`   Password "${testPassword}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
        if (isValid) break;
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsers();
