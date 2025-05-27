const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Create a new pool with the database connection details
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'government_feedback',
});

// Sample data
const users = [
  { email: 'admin@example.com', password: 'password', role: 'admin', fullName: 'Admin User', phoneNumber: '0911111111' },
  { email: 'official@example.com', password: 'password', role: 'official', fullName: 'Government Official', phoneNumber: '0922222222' },
  { email: 'citizen1@example.com', password: 'password', role: 'citizen', fullName: 'John Citizen', phoneNumber: '0933333333' },
  { email: 'citizen2@example.com', password: 'password', role: 'citizen', fullName: 'Jane Citizen', phoneNumber: '0944444444' },
  { email: 'citizen3@example.com', password: 'password', role: 'citizen', fullName: 'Bob Citizen', phoneNumber: '0955555555' },
];

const offices = [
  {
    name: 'Addis Ababa City Administration',
    type: 'municipal',
    latitude: 9.0222,
    longitude: 38.7468,
    address: 'Kirkos, Addis Ababa',
    contactInfo: 'Phone: +251 11 551 3346',
    operatingHours: 'Monday-Friday: 8:30 AM - 5:00 PM',
  },
  {
    name: 'Bole Sub-City Office',
    type: 'woreda',
    latitude: 8.9806,
    longitude: 38.7578,
    address: 'Bole Road, Addis Ababa',
    contactInfo: 'Phone: +251 11 661 2345',
    operatingHours: 'Monday-Friday: 8:30 AM - 5:00 PM',
    parentOfficeId: null, // Will be set after creating the first office
  },
  {
    name: 'Kirkos Sub-City Office',
    type: 'woreda',
    latitude: 9.0137,
    longitude: 38.7611,
    address: 'Kazanchis, Addis Ababa',
    contactInfo: 'Phone: +251 11 551 8765',
    operatingHours: 'Monday-Friday: 8:30 AM - 5:00 PM',
    parentOfficeId: null, // Will be set after creating the first office
  },
  {
    name: 'Yeka Sub-City Office',
    type: 'woreda',
    latitude: 9.0299,
    longitude: 38.8079,
    address: 'Yeka, Addis Ababa',
    contactInfo: 'Phone: +251 11 646 9876',
    operatingHours: 'Monday-Friday: 8:30 AM - 5:00 PM',
    parentOfficeId: null, // Will be set after creating the first office
  },
  {
    name: 'Federal Transport Authority',
    type: 'federal',
    latitude: 9.0341,
    longitude: 38.7612,
    address: 'Mexico Square, Addis Ababa',
    contactInfo: 'Phone: +251 11 551 7170',
    operatingHours: 'Monday-Friday: 8:30 AM - 5:00 PM',
  },
];

const serviceGuides = [
  {
    title: 'How to Get a Driver\'s License',
    content: JSON.stringify({
      description: 'A guide to obtaining a driver\'s license in Ethiopia',
      requirements: ['Valid ID', 'Medical certificate', 'Application form', 'Payment receipt'],
      steps: [
        { title: 'Submit Application', description: 'Fill out the application form and submit it with required documents' },
        { title: 'Take Written Test', description: 'Pass the written test about traffic rules and regulations' },
        { title: 'Take Practical Test', description: 'Pass the practical driving test' },
        { title: 'Receive License', description: 'Collect your driver\'s license' }
      ],
      estimated_time: '2-4 weeks',
      fees: 'ETB 500',
      documents: [{ name: 'Application Form', url: '#' }],
      category: 'Transportation'
    }),
    language: 'english',
  },
  {
    title: 'Business Registration Process',
    content: JSON.stringify({
      description: 'How to register a new business in Addis Ababa',
      requirements: ['Business plan', 'ID documents', 'TIN certificate', 'Office lease agreement'],
      steps: [
        { title: 'Name Verification', description: 'Check if your business name is available' },
        { title: 'Submit Documents', description: 'Submit all required documents' },
        { title: 'Pay Fees', description: 'Pay registration fees' },
        { title: 'Collect Certificate', description: 'Collect your business registration certificate' }
      ],
      estimated_time: '1-2 weeks',
      fees: 'ETB 1,000 - 5,000 (depends on business type)',
      documents: [{ name: 'Registration Form', url: '#' }],
      category: 'Business'
    }),
    language: 'english',
  },
  {
    title: 'Residence ID Card Application',
    content: JSON.stringify({
      description: 'Process for obtaining a residence ID card',
      requirements: ['Birth certificate', 'Passport photos', 'Proof of address', 'Application form'],
      steps: [
        { title: 'Fill Application', description: 'Complete the application form' },
        { title: 'Submit Documents', description: 'Submit all required documents at your local kebele office' },
        { title: 'Verification', description: 'Wait for verification of your information' },
        { title: 'Collect ID Card', description: 'Collect your ID card when ready' }
      ],
      estimated_time: '1-3 weeks',
      fees: 'ETB 100',
      documents: [{ name: 'ID Application Form', url: '#' }],
      category: 'Identity'
    }),
    language: 'english',
  },
];

const reviews = [
  {
    rating: 4,
    comment: 'The staff was helpful and the process was straightforward. Only had to wait about 30 minutes.',
    isAnonymous: false,
    status: 'approved',
  },
  {
    rating: 2,
    comment: 'Long waiting times and confusing instructions. Had to come back multiple times to complete a simple process.',
    isAnonymous: false,
    status: 'approved',
  },
  {
    rating: 5,
    comment: 'Excellent service! The new online system made everything much faster and more efficient.',
    isAnonymous: false,
    status: 'approved',
  },
  {
    rating: 3,
    comment: 'Average experience. Some staff were helpful, others not so much. The process could be more streamlined.',
    isAnonymous: true,
    status: 'approved',
  },
  {
    rating: 1,
    comment: 'Terrible experience. Waited for hours only to be told I was missing a document that wasn\'t mentioned on the website.',
    isAnonymous: false,
    status: 'approved',
  },
];

// Function to create test data
async function createTestData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to PostgreSQL');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Create users
    console.log('Creating users...');
    const userIds = [];
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const userId = uuidv4();
      userIds.push(userId);
      
      await client.query(
        `INSERT INTO users (user_id, email, password, role, full_name, phone_number) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (email) DO NOTHING`,
        [userId, user.email, hashedPassword, user.role, user.fullName, user.phoneNumber]
      );
    }
    
    // Create offices
    console.log('Creating offices...');
    const officeIds = [];
    for (let i = 0; i < offices.length; i++) {
      const office = offices[i];
      const officeId = uuidv4();
      officeIds.push(officeId);
      
      // Set parent office ID for sub-city offices
      let parentOfficeId = null;
      if (i > 0 && i < 4) {
        parentOfficeId = officeIds[0]; // First office is the parent
      }
      
      await client.query(
        `INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours, parent_office_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [officeId, office.name, office.type, office.latitude, office.longitude, office.address, office.contactInfo, office.operatingHours, parentOfficeId]
      );
    }
    
    // Create service guides
    console.log('Creating service guides...');
    for (let i = 0; i < serviceGuides.length; i++) {
      const guide = serviceGuides[i];
      const guideId = uuidv4();
      const officeId = officeIds[i % officeIds.length]; // Distribute guides among offices
      
      await client.query(
        `INSERT INTO service_guides (guide_id, office_id, title, content, language) 
         VALUES ($1, $2, $3, $4, $5)`,
        [guideId, officeId, guide.title, guide.content, guide.language]
      );
    }
    
    // Create reviews
    console.log('Creating reviews...');
    const reviewIds = [];
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      const reviewId = uuidv4();
      reviewIds.push(reviewId);
      
      // Skip the first user (admin) and second user (official) for reviews
      const userId = review.isAnonymous ? null : userIds[2 + (i % 3)]; // Use citizen users
      const officeId = officeIds[i % officeIds.length];
      
      await client.query(
        `INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [reviewId, userId, officeId, review.rating, review.comment, review.isAnonymous, review.status]
      );
    }
    
    // Create votes on reviews
    console.log('Creating votes on reviews...');
    for (let i = 0; i < reviewIds.length; i++) {
      const reviewId = reviewIds[i];
      
      // Create 2-5 votes for each review
      const voteCount = 2 + Math.floor(Math.random() * 4);
      
      for (let j = 0; j < voteCount; j++) {
        const voteId = uuidv4();
        // Skip the first user (admin) for votes
        const userId = userIds[1 + (j % 4)]; // Mix of official and citizen users
        
        // Randomize vote type
        const voteTypes = ['helpful', 'not_helpful', 'flag'];
        const voteType = voteTypes[Math.floor(Math.random() * (j === 0 ? 2 : 3))]; // First vote is never a flag
        
        await client.query(
          `INSERT INTO votes (vote_id, user_id, review_id, vote_type) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, review_id) DO NOTHING`,
          [voteId, userId, reviewId, voteType]
        );
      }
    }
    
    // Create office votes
    console.log('Creating office votes...');
    for (let i = 0; i < officeIds.length; i++) {
      const officeId = officeIds[i];
      
      // Create 5-10 votes for each office
      const voteCount = 5 + Math.floor(Math.random() * 6);
      
      for (let j = 0; j < voteCount; j++) {
        const voteId = uuidv4();
        // Skip the first user (admin) for votes
        const userId = userIds[1 + (j % 4)]; // Mix of official and citizen users
        
        // Randomize vote type with more upvotes than downvotes (70/30 split)
        const voteType = Math.random() < 0.7 ? 'upvote' : 'downvote';
        
        await client.query(
          `INSERT INTO office_votes (vote_id, user_id, office_id, vote_type) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, office_id) DO NOTHING`,
          [voteId, userId, officeId, voteType]
        );
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Test data created successfully');
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Error creating test data:', error);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Run the function
createTestData()
  .then(() => {
    console.log('Test data creation process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test data creation process failed:', err);
    process.exit(1);
  });
