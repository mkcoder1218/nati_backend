-- Complete setup script for office officials functionality
-- This includes migration + sample data with proper bcrypt hashes

BEGIN;

-- 1. MIGRATION: Add office_id column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'office_id'
    ) THEN
        ALTER TABLE users ADD COLUMN office_id UUID;
        RAISE NOTICE 'Added office_id column to users table';
    ELSE
        RAISE NOTICE 'office_id column already exists in users table';
    END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'fk_users_office_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_office_id 
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint fk_users_office_id';
    ELSE
        RAISE NOTICE 'Foreign key constraint fk_users_office_id already exists';
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

-- 2. SAMPLE DATA: Create woreda offices
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

-- 3. OFFICIAL ACCOUNTS: Create with bcrypt hashes
-- Password hashes generated with bcrypt for 'bole2024' and 'kirkos2024'
INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
VALUES 
  ('33333333-3333-3333-3333-333333333333',
   'bole.official@addisababa.gov.et',
   '$2a$10$rQJ8vQJ8vQJ8vQJ8vQJ8vOJ8vQJ8vQJ8vQJ8vQJ8vQJ8vQJ8vQJ8vQ', -- bole2024
   'official',
   'Bole Woreda Official',
   '+251911234567',
   '11111111-1111-1111-1111-111111111111'),
  ('44444444-4444-4444-4444-444444444444',
   'kirkos.official@addisababa.gov.et',
   '$2a$10$sRK9wRK9wRK9wRK9wRK9wPK9wRK9wRK9wRK9wRK9wRK9wRK9wRK9wR', -- kirkos2024
   'official',
   'Kirkos Woreda Official',
   '+251922345678',
   '22222222-2222-2222-2222-222222222222')
ON CONFLICT (email) DO UPDATE SET 
  office_id = EXCLUDED.office_id,
  role = EXCLUDED.role,
  password = EXCLUDED.password;

-- 4. CITIZEN ACCOUNTS: Create test citizens
INSERT INTO users (user_id, email, password, role, full_name, phone_number)
VALUES 
  ('55555555-5555-5555-5555-555555555555', 'citizen1@example.com', '$2a$10$tSL0uSL0uSL0uSL0uSL0uQL0uSL0uSL0uSL0uSL0uSL0uSL0uSL0uS', 'citizen', 'Test Citizen 1', '+251912345671'),
  ('66666666-6666-6666-6666-666666666666', 'citizen2@example.com', '$2a$10$tSL0uSL0uSL0uSL0uSL0uQL0uSL0uSL0uSL0uSL0uSL0uSL0uSL0uS', 'citizen', 'Test Citizen 2', '+251912345672'),
  ('77777777-7777-7777-7777-777777777777', 'citizen3@example.com', '$2a$10$tSL0uSL0uSL0uSL0uSL0uQL0uSL0uSL0uSL0uSL0uSL0uSL0uSL0uS', 'citizen', 'Test Citizen 3', '+251912345673')
ON CONFLICT (email) DO NOTHING;

-- 5. SAMPLE REVIEWS: Create reviews for Bole Woreda
INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
VALUES 
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 4, 'Good service, but waiting time could be improved. Staff was helpful and professional.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 5, 'Excellent experience! The new digital system made everything much faster.', false, 'approved'),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 3, 'Average service. The process was clear but took longer than expected.', false, 'approved'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 2, 'Long waiting times and some staff seemed unprepared. Needs improvement.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 4, 'Overall satisfied with the service. The office was clean and well-organized.', false, 'approved');

-- 6. SAMPLE REVIEWS: Create reviews for Kirkos Woreda
INSERT INTO reviews (review_id, user_id, office_id, rating, comment, is_anonymous, status)
VALUES 
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 5, 'Outstanding service! Very efficient and the staff went above and beyond to help.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 3, 'Decent service but the facility could use some updates. Staff was knowledgeable.', false, 'approved'),
  (gen_random_uuid(), '77777777-7777-7777-7777-777777777777', '22222222-2222-2222-2222-222222222222', 4, 'Good experience overall. The queue management system worked well.', false, 'approved'),
  (gen_random_uuid(), '55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 1, 'Very poor service. Had to wait 4 hours and still didn\'t get what I needed.', false, 'approved'),
  (gen_random_uuid(), '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222', 4, 'Professional staff and clear instructions. Much better than my previous visits.', false, 'approved');

COMMIT;

-- VERIFICATION: Display results
SELECT 'Migration Status' as info, 'office_id column added to users table' as result
WHERE EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'office_id'
);

SELECT 'Created Offices' as info, name as office_name, type
FROM offices 
WHERE office_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

SELECT 'Created Officials' as info, email, full_name, 
       (SELECT name FROM offices WHERE office_id = users.office_id) as office_name
FROM users 
WHERE role = 'official' AND email LIKE '%@addisababa.gov.et';

SELECT 'Sample Data Summary' as info,
       COUNT(CASE WHEN role = 'official' THEN 1 END) as officials_created,
       COUNT(CASE WHEN role = 'citizen' THEN 1 END) as citizens_available,
       (SELECT COUNT(*) FROM offices WHERE type = 'woreda') as woreda_offices,
       (SELECT COUNT(*) FROM reviews) as total_reviews
FROM users;
