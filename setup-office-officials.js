require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function setupOfficeOfficials() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log("Starting office officials setup...");
    
    // 1. Add office_id column to users table if it doesn't exist
    console.log("Adding office_id column to users table...");
    try {
      await client.query(`
        ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id UUID;
      `);
      
      await client.query(`
        ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);
      `);
      
      console.log("✓ Office_id column added successfully");
    } catch (error) {
      console.log("Office_id column might already exist, continuing...");
    }
    
    // 2. Create sample woreda offices
    console.log("Creating sample woreda offices...");
    
    const boleWoredaId = uuidv4();
    const kirkosWoredaId = uuidv4();
    
    // Create Bole Woreda
    await client.query(`
      INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (office_id) DO NOTHING
    `, [
      boleWoredaId,
      'Bole Woreda Office',
      'woreda',
      9.0192, // Latitude for Bole area
      38.7525, // Longitude for Bole area
      'Bole Road, Addis Ababa, Ethiopia',
      'Phone: +251-11-123-4567, Email: bole@addisababa.gov.et',
      'Monday-Friday: 8:30 AM - 5:00 PM'
    ]);
    
    // Create Kirkos Woreda
    await client.query(`
      INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (office_id) DO NOTHING
    `, [
      kirkosWoredaId,
      'Kirkos Woreda Office',
      'woreda',
      9.0348, // Latitude for Kirkos area
      38.7469, // Longitude for Kirkos area
      'Kirkos District, Addis Ababa, Ethiopia',
      'Phone: +251-11-234-5678, Email: kirkos@addisababa.gov.et',
      'Monday-Friday: 8:00 AM - 4:30 PM'
    ]);
    
    console.log("✓ Sample woreda offices created");
    
    // 3. Create official accounts for each woreda
    console.log("Creating official accounts...");
    
    const boleOfficialPassword = await bcrypt.hash('bole2024', 10);
    const kirkosOfficialPassword = await bcrypt.hash('kirkos2024', 10);
    
    const boleOfficialId = uuidv4();
    const kirkosOfficialId = uuidv4();
    
    // Create Bole Woreda Official
    await client.query(`
      INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET 
        office_id = EXCLUDED.office_id,
        role = EXCLUDED.role
    `, [
      boleOfficialId,
      'bole.official@addisababa.gov.et',
      boleOfficialPassword,
      'official',
      'Bole Woreda Official',
      '+251911234567',
      boleWoredaId
    ]);
    
    // Create Kirkos Woreda Official
    await client.query(`
      INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (email) DO UPDATE SET 
        office_id = EXCLUDED.office_id,
        role = EXCLUDED.role
    `, [
      kirkosOfficialId,
      'kirkos.official@addisababa.gov.et',
      kirkosOfficialPassword,
      'official',
      'Kirkos Woreda Official',
      '+251922345678',
      kirkosWoredaId
    ]);
    
    console.log("✓ Official accounts created");
    
    // 4. Create sample reviews and feedback for each office
    console.log("Creating sample reviews and feedback...");
    
    // Get some existing citizen users or create sample ones
    const citizenResult = await client.query(`
      SELECT user_id FROM users WHERE role = 'citizen' LIMIT 3
    `);
    
    let citizenIds = citizenResult.rows.map(row => row.user_id);
    
    // If no citizens exist, create some sample ones
    if (citizenIds.length === 0) {
      console.log("Creating sample citizen users...");
      for (let i = 1; i <= 3; i++) {
        const citizenId = uuidv4();
        const citizenPassword = await bcrypt.hash('citizen123', 10);
        
        await client.query(`
          INSERT INTO users (user_id, email, password, role, full_name, phone_number)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (email) DO NOTHING
        `, [
          citizenId,
          `citizen${i}@example.com`,
          citizenPassword,
          'citizen',
          `Test Citizen ${i}`,
          `+25191234567${i}`
        ]);
        
        citizenIds.push(citizenId);
      }
    }
    
    // Create sample reviews for Bole Woreda
    const boleReviews = [
      { rating: 4, comment: "Good service, but waiting time could be improved. Staff was helpful and professional." },
      { rating: 5, comment: "Excellent experience! The new digital system made everything much faster." },
      { rating: 3, comment: "Average service. The process was clear but took longer than expected." },
      { rating: 2, comment: "Long waiting times and some staff seemed unprepared. Needs improvement." },
      { rating: 4, comment: "Overall satisfied with the service. The office was clean and well-organized." }
    ];
    
    // Create sample reviews for Kirkos Woreda
    const kirkosReviews = [
      { rating: 5, comment: "Outstanding service! Very efficient and the staff went above and beyond to help." },
      { rating: 3, comment: "Decent service but the facility could use some updates. Staff was knowledgeable." },
      { rating: 4, comment: "Good experience overall. The queue management system worked well." },
      { rating: 1, comment: "Very poor service. Had to wait 4 hours and still didn't get what I needed." },
      { rating: 4, comment: "Professional staff and clear instructions. Much better than my previous visits." }
    ];
    
    // Insert reviews for Bole Woreda
    for (let i = 0; i < boleReviews.length; i++) {
      const review = boleReviews[i];
      const citizenId = citizenIds[i % citizenIds.length];
      
      await client.query(`
        INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        citizenId,
        boleWoredaId,
        review.rating,
        review.comment,
        false,
        'approved'
      ]);
    }
    
    // Insert reviews for Kirkos Woreda
    for (let i = 0; i < kirkosReviews.length; i++) {
      const review = kirkosReviews[i];
      const citizenId = citizenIds[i % citizenIds.length];
      
      await client.query(`
        INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        uuidv4(),
        citizenId,
        kirkosWoredaId,
        review.rating,
        review.comment,
        false,
        'approved'
      ]);
    }
    
    console.log("✓ Sample reviews created");
    
    await client.query('COMMIT');
    
    console.log("\n🎉 Office officials setup completed successfully!");
    console.log("\nCreated accounts:");
    console.log("1. Bole Woreda Official:");
    console.log("   Email: bole.official@addisababa.gov.et");
    console.log("   Password: bole2024");
    console.log("   Office: Bole Woreda Office");
    console.log("\n2. Kirkos Woreda Official:");
    console.log("   Email: kirkos.official@addisababa.gov.et");
    console.log("   Password: kirkos2024");
    console.log("   Office: Kirkos Woreda Office");
    console.log("\nEach office has 5 sample reviews for testing.");
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error setting up office officials:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the setup
setupOfficeOfficials()
  .then(() => {
    console.log("Setup completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
  });
