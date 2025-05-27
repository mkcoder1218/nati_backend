import pool from '../config/database';

async function verifyAdminAccounts() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for admin accounts...\n');
    
    // Get all admin users
    const result = await client.query(
      `SELECT user_id, email, role, full_name, phone_number, created_at 
       FROM users 
       WHERE role = 'admin' 
       ORDER BY created_at DESC`
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No admin accounts found!');
      console.log('💡 Run "npm run seed-db" or "npm run create-admin" to create an admin account.');
      return;
    }
    
    console.log(`✅ Found ${result.rows.length} admin account(s):\n`);
    
    result.rows.forEach((admin, index) => {
      console.log(`${index + 1}. Admin Account:`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   👤 Name: ${admin.full_name}`);
      console.log(`   📱 Phone: ${admin.phone_number}`);
      console.log(`   🆔 ID: ${admin.user_id}`);
      console.log(`   📅 Created: ${new Date(admin.created_at).toLocaleString()}`);
      console.log('');
    });
    
    console.log('🔑 Default Login Credentials (if using seeded data):');
    console.log('   Email: admin@example.com');
    console.log('   Password: password');
    console.log('');
    console.log('🌐 Login URL: http://localhost:3001/auth/signin');
    
  } catch (error) {
    console.error('❌ Error checking admin accounts:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Run the verification
verifyAdminAccounts()
  .then(() => {
    console.log('\n✅ Verification completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  });
