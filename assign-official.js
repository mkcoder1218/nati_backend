const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'password',
  database: 'government_feedback'
});

async function assignOfficial() {
  try {
    // Get the official user
    const officialResult = await pool.query(`
      SELECT user_id, email, full_name 
      FROM users 
      WHERE role = 'official'
    `);
    
    if (officialResult.rows.length === 0) {
      console.log('No official users found');
      return;
    }
    
    const official = officialResult.rows[0];
    console.log('Found official:', official.email, '-', official.full_name);
    
    // Get available offices
    const officesResult = await pool.query(`
      SELECT office_id, name, type 
      FROM offices 
      ORDER BY name
    `);
    
    console.log('Available offices:');
    officesResult.rows.forEach((office, index) => {
      console.log(`  ${index + 1}. ${office.name} (${office.type})`);
    });
    
    // Assign the official to the first office (Addis Ababa City Administration)
    const targetOffice = officesResult.rows[0];
    
    await pool.query(`
      UPDATE users 
      SET office_id = $1 
      WHERE user_id = $2
    `, [targetOffice.office_id, official.user_id]);
    
    console.log(`\nAssigned ${official.full_name} to ${targetOffice.name}`);
    
    // Verify the assignment
    const verifyResult = await pool.query(`
      SELECT u.email, u.full_name, o.name as office_name
      FROM users u
      LEFT JOIN offices o ON u.office_id = o.office_id
      WHERE u.user_id = $1
    `, [official.user_id]);
    
    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log(`Verification: ${user.full_name} is now assigned to ${user.office_name}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

assignOfficial();
