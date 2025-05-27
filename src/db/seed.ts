import bcrypt from 'bcryptjs';
import pool from '../config/database';
import { v4 as uuidv4 } from 'uuid';

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database for seeding');
    
    // Start a transaction
    await client.query('BEGIN');
    
    // Create admin user
    const adminPassword = await bcrypt.hash('password', 10);
    const adminId = uuidv4();
    await client.query(
      `INSERT INTO users (user_id, email, password, role, full_name, phone_number) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [adminId, 'admin@example.com', adminPassword, 'admin', 'Admin User', '0911111111']
    );
    
    // Create official user
    const officialPassword = await bcrypt.hash('password', 10);
    const officialId = uuidv4();
    await client.query(
      `INSERT INTO users (user_id, email, password, role, full_name, phone_number) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [officialId, 'official@example.com', officialPassword, 'official', 'Government Official', '0922222222']
    );
    
    // Create citizen user
    const citizenPassword = await bcrypt.hash('password', 10);
    const citizenId = uuidv4();
    await client.query(
      `INSERT INTO users (user_id, email, password, role, full_name, phone_number) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [citizenId, 'citizen@example.com', citizenPassword, 'citizen', 'Citizen User', '0933333333']
    );
    
    // Create offices
    const kebeleOfficeId = uuidv4();
    await client.query(
      `INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [
        kebeleOfficeId, 
        'Bole Subcity Kebele 01', 
        'kebele', 
        9.010771, 
        38.761257, 
        'Bole Road, Addis Ababa', 
        'Phone: 0111234567, Email: bole01@addisababa.gov.et', 
        'Monday-Friday: 8:30 AM - 5:00 PM'
      ]
    );
    
    const woredaOfficeId = uuidv4();
    await client.query(
      `INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours, parent_office_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT DO NOTHING`,
      [
        woredaOfficeId, 
        'Bole Subcity Woreda Office', 
        'woreda', 
        9.017852, 
        38.763418, 
        'Bole Road, Addis Ababa', 
        'Phone: 0112345678, Email: bole@addisababa.gov.et', 
        'Monday-Friday: 8:30 AM - 5:00 PM',
        null
      ]
    );
    
    // Create service guides
    const idCardGuideId = uuidv4();
    await client.query(
      `INSERT INTO service_guides (guide_id, office_id, title, content, language) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [
        idCardGuideId,
        kebeleOfficeId,
        'ID Card Application',
        JSON.stringify({
          description: 'Apply for a new ID card or renew an existing one at your local Kebele or Woreda office.',
          requirements: [
            'Original birth certificate',
            'Residence certificate from your Kebele',
            'Two recent passport-sized photographs (3x4cm)',
            'Previous ID card (if renewing)',
            'Application form (available at the office)'
          ],
          steps: [
            {
              title: 'Gather Required Documents',
              description: 'Collect all the required documents listed above before visiting the office.'
            },
            {
              title: 'Visit Your Local Kebele Office',
              description: 'Go to the Kebele office in your area during working hours (Monday-Friday, 8:30 AM - 5:00 PM).'
            },
            {
              title: 'Fill Out Application Form',
              description: 'Complete the application form provided at the office. Staff can assist if needed.'
            },
            {
              title: 'Submit Documents and Photos',
              description: 'Submit your completed application form along with all required documents and photographs.'
            },
            {
              title: 'Payment of Fees',
              description: 'Pay the required fee for ID card processing. The current fee is approximately 100 Birr.'
            },
            {
              title: 'Receive Receipt',
              description: 'You will receive a receipt with a collection date for your ID card.'
            },
            {
              title: 'Collect Your ID Card',
              description: 'Return on the specified date with your receipt to collect your new ID card.'
            }
          ],
          estimated_time: '1-3 days',
          fees: '100 Birr',
          category: 'Personal Documents'
        }),
        'english'
      ]
    );
    
    // Create reviews
    const reviewId = uuidv4();
    await client.query(
      `INSERT INTO reviews (review_id, user_id, office_id, rating, comment, status) 
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        reviewId,
        citizenId,
        kebeleOfficeId,
        4,
        'The service was good but there was a long queue. Staff were helpful and professional.',
        'approved'
      ]
    );
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Database seeded successfully');
  } catch (error) {
    // Rollback in case of error
    await client.query('ROLLBACK');
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('Seeding completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
