const bcrypt = require('bcryptjs');

async function generateHashes() {
  console.log("Generating bcrypt hashes...");
  
  const passwords = {
    'bole2024': await bcrypt.hash('bole2024', 10),
    'kirkos2024': await bcrypt.hash('kirkos2024', 10),
    'citizen123': await bcrypt.hash('citizen123', 10)
  };
  
  console.log("\nGenerated password hashes:");
  console.log("bole2024:", passwords['bole2024']);
  console.log("kirkos2024:", passwords['kirkos2024']);
  console.log("citizen123:", passwords['citizen123']);
  
  // Create the final SQL script with proper hashes
  const sqlScript = `-- Complete Office Officials Setup Script
-- This script creates the necessary database changes and sample data with proper password hashes

BEGIN;

-- 1. Add office_id column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id UUID;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_users_office_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

-- 2. Create sample woreda offices with specific UUIDs
INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Bole Woreda Office', 'woreda', 9.0192, 38.7525, 
   'Bole Road, Addis Ababa, Ethiopia', 
   'Phone: +251-11-123-4567, Email: bole@addisababa.gov.et', 
   'Monday-Friday: 8:30 AM - 5:00 PM'),
  ('22222222-2222-2222-2222-222222222222', 'Kirkos Woreda Office', 'woreda', 9.0348, 38.7469, 
   'Kirkos District, Addis Ababa, Ethiopia', 
   'Phone: +251-11-234-5678, Email: kirkos@addisababa.gov.et', 
   'Monday-Friday: 8:00 AM - 4:30 PM')
ON CONFLICT (office_id) DO NOTHING;

-- 3. Create official accounts with proper bcrypt hashes
-- Password for bole.official@addisababa.gov.et is 'bole2024'
-- Password for kirkos.official@addisababa.gov.et is 'kirkos2024'
INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
VALUES 
  ('33333333-3333-3333-3333-333333333333',
   'bole.official@addisababa.gov.et',
   '${passwords['bole2024']}',
   'official',
   'Bole Woreda Official',
   '+251911234567',
   '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444',
   'kirkos.official@addisababa.gov.et',
   '${passwords['kirkos2024']}',
   'official',
   'Kirkos Woreda Official',
   '+251922345678',
   '22222222-2222-2222-2222-222222222222')
ON CONFLICT (email) DO UPDATE SET 
  office_id = EXCLUDED.office_id,
  role = EXCLUDED.role,
  password = EXCLUDED.password;

-- 4. Create sample citizen users if they don't exist
-- Password for all citizens is 'citizen123'
INSERT INTO users (user_id, email, password, role, full_name, phone_number)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'citizen1@example.com', '${passwords['citizen123']}', 'citizen', 'Test Citizen 1', '+251912345671'),
  ('66666666-6666-6666-6666-666666666666', 'citizen2@example.com', '${passwords['citizen123']}', 'citizen', 'Test Citizen 2', '+251912345672'),
  ('77777777-7777-7777-7777-777777777777', 'citizen3@example.com', '${passwords['citizen123']}', 'citizen', 'Test Citizen 3', '+251912345673')
ON CONFLICT (email) DO NOTHING;

-- 5. Create sample reviews for Bole Woreda
INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
VALUES 
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 4, 'Good service, but waiting time could be improved. Staff was helpful and professional.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 5, 'Excellent experience! The new digital system made everything much faster.', false, 'approved'),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 3, 'Average service. The process was clear but took longer than expected.', false, 'approved'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 2, 'Long waiting times and some staff seemed unprepared. Needs improvement.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 4, 'Overall satisfied with the service. The office was clean and well-organized.', false, 'approved');

-- 6. Create sample reviews for Kirkos Woreda
INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
VALUES 
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 5, 'Outstanding service! Very efficient and the staff went above and beyond to help.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 3, 'Decent service but the facility could use some updates. Staff was knowledgeable.', false, 'approved'),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 4, 'Good experience overall. The queue management system worked well.', false, 'approved'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 1, 'Very poor service. Had to wait 4 hours and still didn\\'t get what I needed.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 4, 'Professional staff and clear instructions. Much better than my previous visits.', false, 'approved');

COMMIT;

-- Display the created accounts
SELECT 
  'Office Officials Created:' as message,
  u.email,
  u.full_name,
  o.name as office_name
FROM users u
JOIN offices o ON u.office_id = o.office_id
WHERE u.role = 'official' AND u.email LIKE '%@addisababa.gov.et';

-- Display summary
SELECT 
  'Summary:' as message,
  COUNT(CASE WHEN role = 'official' THEN 1 END) as officials_created,
  COUNT(CASE WHEN role = 'citizen' THEN 1 END) as citizens_available,
  (SELECT COUNT(*) FROM offices WHERE type = 'woreda') as woreda_offices,
  (SELECT COUNT(*) FROM reviews) as total_reviews
FROM users;`;

  // Write the SQL script to file
  const fs = require('fs');
  fs.writeFileSync('final-setup.sql', sqlScript);
  
  console.log("\n✓ Generated final-setup.sql with proper password hashes");
  console.log("\nCreated accounts will be:");
  console.log("1. Bole Woreda Official:");
  console.log("   Email: bole.official@addisababa.gov.et");
  console.log("   Password: bole2024");
  console.log("   Office: Bole Woreda Office");
  console.log("\n2. Kirkos Woreda Official:");
  console.log("   Email: kirkos.official@addisababa.gov.et");
  console.log("   Password: kirkos2024");
  console.log("   Office: Kirkos Woreda Office");
  console.log("\n3. Test Citizens (all with password 'citizen123'):");
  console.log("   - citizen1@example.com");
  console.log("   - citizen2@example.com");
  console.log("   - citizen3@example.com");
  console.log("\nEach office will have 5 sample reviews for testing.");
  console.log("\nTo apply these changes, run the final-setup.sql script in your PostgreSQL database.");
}

generateHashes().catch(console.error);
