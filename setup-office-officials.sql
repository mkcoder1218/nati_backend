-- Setup Office Officials Script
-- This script creates the necessary database changes and sample data

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

-- 2. Create sample woreda offices
-- Generate UUIDs for the offices (you may need to replace these with actual UUIDs)
INSERT INTO offices (office_id, name, type, latitude, longitude, address, contact_info, operating_hours)
VALUES 
  (gen_random_uuid(), 'Bole Woreda Office', 'woreda', 9.0192, 38.7525, 
   'Bole Road, Addis Ababa, Ethiopia', 
   'Phone: +251-11-123-4567, Email: bole@addisababa.gov.et', 
   'Monday-Friday: 8:30 AM - 5:00 PM'),
  (gen_random_uuid(), 'Kirkos Woreda Office', 'woreda', 9.0348, 38.7469, 
   'Kirkos District, Addis Ababa, Ethiopia', 
   'Phone: +251-11-234-5678, Email: kirkos@addisababa.gov.et', 
   'Monday-Friday: 8:00 AM - 4:30 PM')
ON CONFLICT (office_id) DO NOTHING;

-- Get the office IDs for reference
-- Note: In a real scenario, you would use the actual UUIDs generated above

-- 3. Create official accounts for each woreda
-- Note: Passwords are hashed with bcrypt. These are the hashes for 'bole2024' and 'kirkos2024'
-- You may need to generate these hashes using a bcrypt tool

-- For now, let's create the accounts with placeholder passwords that need to be updated
INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
SELECT 
  gen_random_uuid(),
  'bole.official@addisababa.gov.et',
  '$2a$10$placeholder_hash_for_bole2024', -- This needs to be replaced with actual bcrypt hash
  'official',
  'Bole Woreda Official',
  '+251911234567',
  o.office_id
FROM offices o 
WHERE o.name = 'Bole Woreda Office'
ON CONFLICT (email) DO UPDATE SET 
  office_id = EXCLUDED.office_id,
  role = EXCLUDED.role;

INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
SELECT 
  gen_random_uuid(),
  'kirkos.official@addisababa.gov.et',
  '$2a$10$placeholder_hash_for_kirkos2024', -- This needs to be replaced with actual bcrypt hash
  'official',
  'Kirkos Woreda Official',
  '+251922345678',
  o.office_id
FROM offices o 
WHERE o.name = 'Kirkos Woreda Office'
ON CONFLICT (email) DO UPDATE SET 
  office_id = EXCLUDED.office_id,
  role = EXCLUDED.role;

-- 4. Create sample citizen users if they don't exist
INSERT INTO users (user_id, email, password, role, full_name, phone_number)
VALUES 
  (gen_random_uuid(), 'citizen1@example.com', '$2a$10$placeholder_hash_for_citizen123', 'citizen', 'Test Citizen 1', '+251912345671'),
  (gen_random_uuid(), 'citizen2@example.com', '$2a$10$placeholder_hash_for_citizen123', 'citizen', 'Test Citizen 2', '+251912345672'),
  (gen_random_uuid(), 'citizen3@example.com', '$2a$10$placeholder_hash_for_citizen123', 'citizen', 'Test Citizen 3', '+251912345673')
ON CONFLICT (email) DO NOTHING;

-- 5. Create sample reviews for Bole Woreda
INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
SELECT 
  gen_random_uuid(),
  (SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1 OFFSET 0),
  (SELECT office_id FROM offices WHERE name = 'Bole Woreda Office'),
  4,
  'Good service, but waiting time could be improved. Staff was helpful and professional.',
  false,
  'approved'
WHERE EXISTS (SELECT 1 FROM offices WHERE name = 'Bole Woreda Office');

INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
SELECT 
  gen_random_uuid(),
  (SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1 OFFSET 1),
  (SELECT office_id FROM offices WHERE name = 'Bole Woreda Office'),
  5,
  'Excellent experience! The new digital system made everything much faster.',
  false,
  'approved'
WHERE EXISTS (SELECT 1 FROM offices WHERE name = 'Bole Woreda Office');

INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
SELECT 
  gen_random_uuid(),
  (SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1 OFFSET 2),
  (SELECT office_id FROM offices WHERE name = 'Bole Woreda Office'),
  3,
  'Average service. The process was clear but took longer than expected.',
  false,
  'approved'
WHERE EXISTS (SELECT 1 FROM offices WHERE name = 'Bole Woreda Office');

-- 6. Create sample reviews for Kirkos Woreda
INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
SELECT 
  gen_random_uuid(),
  (SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1 OFFSET 0),
  (SELECT office_id FROM offices WHERE name = 'Kirkos Woreda Office'),
  5,
  'Outstanding service! Very efficient and the staff went above and beyond to help.',
  false,
  'approved'
WHERE EXISTS (SELECT 1 FROM offices WHERE name = 'Kirkos Woreda Office');

INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
SELECT 
  gen_random_uuid(),
  (SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1 OFFSET 1),
  (SELECT office_id FROM offices WHERE name = 'Kirkos Woreda Office'),
  3,
  'Decent service but the facility could use some updates. Staff was knowledgeable.',
  false,
  'approved'
WHERE EXISTS (SELECT 1 FROM offices WHERE name = 'Kirkos Woreda Office');

INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
SELECT 
  gen_random_uuid(),
  (SELECT user_id FROM users WHERE role = 'citizen' LIMIT 1 OFFSET 2),
  (SELECT office_id FROM offices WHERE name = 'Kirkos Woreda Office'),
  4,
  'Good experience overall. The queue management system worked well.',
  false,
  'approved'
WHERE EXISTS (SELECT 1 FROM offices WHERE name = 'Kirkos Woreda Office');

COMMIT;

-- Display the created accounts
SELECT 
  'Office Officials Created:' as message,
  u.email,
  u.full_name,
  o.name as office_name,
  'Password needs to be set manually' as note
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
FROM users;
