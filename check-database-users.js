const pool = require('./dist/config/database').default;

async function checkDatabaseUsers() {
  try {
    console.log('🔍 Checking users in database...\n');
    
    // Check users table
    const usersResult = await pool.query(`
      SELECT user_id, email, full_name, role, created_at, last_login
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${usersResult.rows.length} users:`);
    usersResult.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.full_name} (${user.email}) - ${user.role}`);
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Login: ${user.last_login || 'Never'}`);
      console.log('');
    });
    
    // Check recent reviews and their user associations
    console.log('\n🔍 Checking recent reviews and user associations...\n');
    
    const reviewsResult = await pool.query(`
      SELECT 
        r.review_id,
        r.user_id,
        r.rating,
        r.comment,
        r.is_anonymous,
        r.status,
        r.created_at,
        u.full_name as user_name,
        u.email as user_email,
        o.name as office_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN offices o ON r.office_id = o.office_id
      ORDER BY r.created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${reviewsResult.rows.length} reviews:`);
    reviewsResult.rows.forEach((review, index) => {
      console.log(`${index + 1}. Review ID: ${review.review_id}`);
      console.log(`   User ID: ${review.user_id || 'NULL'}`);
      console.log(`   User Name: ${review.user_name || 'NULL'}`);
      console.log(`   User Email: ${review.user_email || 'NULL'}`);
      console.log(`   Is Anonymous: ${review.is_anonymous}`);
      console.log(`   Status: ${review.status}`);
      console.log(`   Rating: ${review.rating}⭐`);
      console.log(`   Comment: ${review.comment}`);
      console.log(`   Office: ${review.office_name}`);
      console.log(`   Created: ${review.created_at}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabaseUsers();
