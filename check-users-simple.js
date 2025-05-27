const pool = require('./src/config/database').default;

async function checkUsers() {
  try {
    console.log('Checking users in database...');
    
    const result = await pool.query(`
      SELECT user_id, email, full_name, role, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('Found', result.rows.length, 'users:');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.email}) - ${user.role}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
