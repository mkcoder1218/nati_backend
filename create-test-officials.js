const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'government_feedback'}`,
});

async function createTestOfficials() {
  try {
    console.log('🏛️ Creating test government officials...\n');
    
    // Check existing officials
    const existingResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'official'
    `);
    
    const existingCount = parseInt(existingResult.rows[0].count);
    console.log(`📊 Current government officials: ${existingCount}`);
    
    // Create test officials if needed
    const testOfficials = [
      {
        email: 'official1@addisababa.gov.et',
        full_name: 'Alemayehu Tadesse',
        phone_number: '+251911111111',
        password: 'official123'
      },
      {
        email: 'official2@addisababa.gov.et', 
        full_name: 'Meron Bekele',
        phone_number: '+251922222222',
        password: 'official123'
      },
      {
        email: 'official3@addisababa.gov.et',
        full_name: 'Dawit Haile',
        phone_number: '+251933333333', 
        password: 'official123'
      },
      {
        email: 'official4@addisababa.gov.et',
        full_name: 'Hanan Mohammed',
        phone_number: '+251944444444',
        password: 'official123'
      },
      {
        email: 'official5@addisababa.gov.et',
        full_name: 'Tesfaye Girma',
        phone_number: '+251955555555',
        password: 'official123'
      }
    ];
    
    let createdCount = 0;
    
    for (const official of testOfficials) {
      try {
        // Check if official already exists
        const existingOfficial = await pool.query(
          'SELECT user_id FROM users WHERE email = $1',
          [official.email]
        );
        
        if (existingOfficial.rows.length > 0) {
          console.log(`⚠️  Official ${official.full_name} (${official.email}) already exists`);
          continue;
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(official.password, 10);
        
        // Create official
        const result = await pool.query(`
          INSERT INTO users (user_id, email, password, role, full_name, phone_number)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING user_id, email, full_name
        `, [
          uuidv4(),
          official.email,
          hashedPassword,
          'official',
          official.full_name,
          official.phone_number
        ]);
        
        console.log(`✅ Created official: ${result.rows[0].full_name} (${result.rows[0].email})`);
        createdCount++;
        
      } catch (error) {
        console.error(`❌ Error creating official ${official.full_name}:`, error.message);
      }
    }
    
    // Final summary
    console.log(`\n📈 Summary:`);
    console.log(`   Created: ${createdCount} new officials`);
    
    const finalResult = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'official'
    `);
    const finalCount = parseInt(finalResult.rows[0].count);
    console.log(`   Total officials now: ${finalCount}`);
    
    // List all officials
    console.log(`\n👥 All Government Officials:`);
    const allOfficials = await pool.query(`
      SELECT email, full_name, phone_number, office_id
      FROM users 
      WHERE role = 'official'
      ORDER BY full_name
    `);
    
    allOfficials.rows.forEach(official => {
      console.log(`   • ${official.full_name} (${official.email})`);
      console.log(`     Phone: ${official.phone_number}`);
      console.log(`     Office ID: ${official.office_id || 'Not assigned'}\n`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test officials:', error);
  } finally {
    await pool.end();
  }
}

createTestOfficials();
