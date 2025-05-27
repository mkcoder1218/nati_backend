const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: 'government_feedback'
});

async function restoreDataOnly() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database for data restoration');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Clear existing data first
    console.log('Clearing existing data...');
    await client.query('TRUNCATE TABLE votes CASCADE');
    await client.query('TRUNCATE TABLE office_votes CASCADE');
    await client.query('TRUNCATE TABLE sentiment_logs CASCADE');
    await client.query('TRUNCATE TABLE service_guides CASCADE');
    await client.query('TRUNCATE TABLE reviews CASCADE');
    await client.query('TRUNCATE TABLE notifications CASCADE');
    await client.query('TRUNCATE TABLE offices CASCADE');
    await client.query('TRUNCATE TABLE users CASCADE');
    
    // Insert users
    console.log('Inserting users...');
    await client.query(`INSERT INTO users (user_id, email, password, role, full_name, phone_number, created_at, last_login) VALUES 
      ('313f53ad-0269-4ac2-aba4-b0f5cc86fdee', 'citizen2@example.com', '$2a$10$uwWHErQv9k8Z3ESnqTAm8u6545zF23gTJ5ekoIQft1HZbONoDrXDy', 'citizen', 'Jane Citizen', '0944444444', '2025-05-21T00:26:35.824Z', NULL),
      ('06fa2252-c4fc-4207-a139-ec87da81ffd3', 'citizen3@example.com', '$2a$10$caw.4MMXXF.cxN/ubyrbru0lzXw9Ogpriqh/WPFrwCfg2vlS9N47S', 'citizen', 'Bob Citizen', '0955555555', '2025-05-21T00:26:35.824Z', NULL),
      ('bd722171-c04c-4e80-a799-399692757463', 'citizen1@example.com', '$2a$10$hm3J9mO86jcXP.R8uySpBO4kZ9ErYIFLFO8OrXOPD6SGtfne6ybw.', 'citizen', 'John Citizen', '0933333333', '2025-05-21T00:26:35.824Z', '2025-05-21T07:08:01.383Z'),
      ('73ea39ac-8182-47fb-8ad3-b767e6ea15c5', 'codemk1218@gmail.com', '$2a$10$6JnNne3CeHzJeRM5XamIWO.JccJ2FVVMGpFqGMKiiohhGybKGAWBa', 'citizen', 'mk code', '0933894492', '2025-05-21T13:08:23.930Z', NULL),
      ('d12ec42f-62da-4712-89cf-650d50b0f7a7', 'abcs@gamil.com', '$2a$10$tu7T6EhUO/HJG71vMeTif.uPpGczCA1C70ngnMBZEmT6iFJqhwMb2', 'citizen', 'mk code', '0933894495', '2025-05-21T13:11:04.780Z', NULL),
      ('67a22678-0175-4dee-9583-e3e8b517b7a8', 'admin@example.com', '$2a$10$scPIB7vRSFp5061dJsrmJObfn.sFAE/utwVQhfalz22CMq1BE6fye', 'admin', 'Admin User', '0911111111', '2025-05-21T00:26:35.824Z', '2025-05-21T21:31:59.715Z'),
      ('7e9b263b-3d47-4d6d-ad86-77ac5ba9e0a1', 'gikebuddano-9895@yopmail.com', '$2a$10$Ui7LC2ne9RT.9B4uhpG9bev5REWiXeDU3P7raRqGEnfKUSUFMzqEu', 'citizen', 'mk code', '0933894490', '2025-05-21T21:54:52.752Z', NULL),
      ('4c84b12f-a745-44d9-a9a6-ace618091ec1', 'official@example.com', '$2a$10$CK7Cta9WQesn.OEccM.eA.ptLQRnDvkojW2CP1CCGk0HdAHimOlLq', 'official', 'Government Official', '0922222222', '2025-05-21T00:26:35.824Z', '2025-05-22T00:24:58.212Z')`);
    
    // Insert offices
    console.log('Inserting offices...');
    await client.query(`INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours, parent_office_id, upvote_count, downvote_count) VALUES 
      ('328e4f74-4896-4dfd-8d6b-00c86be70599', 'Addis Ababa City Administration', 'municipal', '9.02220000', '38.74680000', 'Kirkos, Addis Ababa', 'Phone: +251 11 551 3346', 'Monday-Friday: 8:30 AM - 5:00 PM', NULL, 0, 0),
      ('5767101c-235d-4353-8e1f-26f2989967aa', 'Bole Sub-City Office', 'woreda', '8.98060000', '38.75780000', 'Bole Road, Addis Ababa', 'Phone: +251 11 661 2345', 'Monday-Friday: 8:30 AM - 5:00 PM', '328e4f74-4896-4dfd-8d6b-00c86be70599', 0, 0),
      ('8963bb00-62d4-466c-af0c-06a3e99699c0', 'Kirkos Sub-City Office', 'woreda', '9.01370000', '38.76110000', 'Kazanchis, Addis Ababa', 'Phone: +251 11 551 8765', 'Monday-Friday: 8:30 AM - 5:00 PM', '328e4f74-4896-4dfd-8d6b-00c86be70599', 0, 0),
      ('4a05c892-4ee6-4e23-b76b-069c01459726', 'Federal Transport Authority', 'federal', '9.03410000', '38.76120000', 'Mexico Square, Addis Ababa', 'Phone: +251 11 551 7170', 'Monday-Friday: 8:30 AM - 5:00 PM', NULL, 0, 0),
      ('2badae38-cff7-4c40-af09-52d43231ce6f', 'Yeka Sub-City Office', 'woreda', '9.02990000', '38.80790000', 'Yeka, Addis Ababa', 'Phone: +251 11 646 9876', 'Monday-Friday: 8:30 AM - 5:00 PM', '328e4f74-4896-4dfd-8d6b-00c86be70599', 4, 0)`);
    
    // Insert reviews
    console.log('Inserting reviews...');
    await client.query(`INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, created_at, updated_at, status) VALUES 
      ('1aa7cf79-4d51-402f-94c2-199974020088', '313f53ad-0269-4ac2-aba4-b0f5cc86fdee', '5767101c-235d-4353-8e1f-26f2989967aa', 2, 'Long waiting times and confusing instructions. Had to come back multiple times to complete a simple process.', false, '2025-05-21T00:26:35.824Z', '2025-05-21T00:26:35.824Z', 'approved'),
      ('e52ec6d1-a845-4c86-a1bf-34e3bcea8aa6', '06fa2252-c4fc-4207-a139-ec87da81ffd3', '8963bb00-62d4-466c-af0c-06a3e99699c0', 5, 'Excellent service! The new online system made everything much faster and more efficient.', false, '2025-05-21T00:26:35.824Z', '2025-05-21T00:26:35.824Z', 'approved'),
      ('5c51dbaf-42a9-4de3-bec0-7adda013c4a5', NULL, '2badae38-cff7-4c40-af09-52d43231ce6f', 3, 'Average experience. Some staff were helpful, others not so much. The process could be more streamlined.', true, '2025-05-21T00:26:35.824Z', '2025-05-21T00:26:35.824Z', 'approved'),
      ('e729a9c9-07c2-46b2-a37e-e26b8b11d5b8', '313f53ad-0269-4ac2-aba4-b0f5cc86fdee', '4a05c892-4ee6-4e23-b76b-069c01459726', 1, 'Terrible experience. Waited for hours only to be told I was missing a document that wasn''t mentioned on the website.', false, '2025-05-21T00:26:35.824Z', '2025-05-21T00:26:35.824Z', 'approved'),
      ('8fc98e8c-21a1-4881-ad24-9a656f72abaa', NULL, '5767101c-235d-4353-8e1f-26f2989967aa', 5, 'nice', false, '2025-05-21T01:06:42.206Z', '2025-05-21T01:06:42.206Z', 'pending'),
      ('3db498f6-6501-48b4-ac9f-4abefb603ea9', 'bd722171-c04c-4e80-a799-399692757463', '328e4f74-4896-4dfd-8d6b-00c86be70599', 4, 'The staff was helpful and the process was straightforward. Only had to wait about 30 minutes.', false, '2025-05-21T00:26:35.824Z', '2025-05-21T02:49:06.136Z', 'approved'),
      ('41284e6e-7d7b-4d65-ae3b-a06cc51e9920', NULL, '4a05c892-4ee6-4e23-b76b-069c01459726', 5, 'nice', false, '2025-05-21T02:56:34.524Z', '2025-05-21T02:56:34.524Z', 'pending')`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Data restoration completed successfully');
    
    // Verify the restoration
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    const officeCount = await client.query('SELECT COUNT(*) FROM offices');
    const reviewCount = await client.query('SELECT COUNT(*) FROM reviews');
    
    console.log(`Restored data summary:`);
    console.log(`- Users: ${userCount.rows[0].count}`);
    console.log(`- Offices: ${officeCount.rows[0].count}`);
    console.log(`- Reviews: ${reviewCount.rows[0].count}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during data restoration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the restoration
restoreDataOnly()
  .then(() => {
    console.log('Data restoration process completed');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Data restoration process failed:', err);
    process.exit(1);
  });
