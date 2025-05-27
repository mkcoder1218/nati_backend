-- Migration: Revert to single office assignment for government officials
-- This migration reverts the many-to-many relationship back to one-to-one
-- Each government official can only be assigned to one office

BEGIN;

-- Step 1: Migrate primary office assignments back to users.office_id
-- Update users table with their primary office from user_office_assignments
UPDATE users 
SET office_id = (
    SELECT uoa.office_id 
    FROM user_office_assignments uoa 
    WHERE uoa.user_id = users.user_id 
    AND uoa.is_primary = TRUE 
    AND uoa.status = 'active'
    LIMIT 1
)
WHERE role = 'official' 
AND EXISTS (
    SELECT 1 FROM user_office_assignments uoa 
    WHERE uoa.user_id = users.user_id 
    AND uoa.is_primary = TRUE 
    AND uoa.status = 'active'
);

-- Step 2: For officials without a primary office, assign the first active office
UPDATE users 
SET office_id = (
    SELECT uoa.office_id 
    FROM user_office_assignments uoa 
    WHERE uoa.user_id = users.user_id 
    AND uoa.status = 'active'
    ORDER BY uoa.assigned_at ASC
    LIMIT 1
)
WHERE role = 'official' 
AND office_id IS NULL
AND EXISTS (
    SELECT 1 FROM user_office_assignments uoa 
    WHERE uoa.user_id = users.user_id 
    AND uoa.status = 'active'
);

-- Step 3: Remove the many-to-many relationship functions
DROP FUNCTION IF EXISTS get_user_offices(UUID);
DROP FUNCTION IF EXISTS get_user_primary_office(UUID);
DROP FUNCTION IF EXISTS assign_user_to_office(UUID, UUID, BOOLEAN, UUID);
DROP FUNCTION IF EXISTS remove_user_from_office(UUID, UUID);

-- Step 4: Create backup of user_office_assignments before dropping
-- (Optional: Create a backup table for historical data)
CREATE TABLE IF NOT EXISTS user_office_assignments_backup AS 
SELECT * FROM user_office_assignments;

-- Step 5: Drop the user_office_assignments table
DROP TABLE IF EXISTS user_office_assignments;

-- Step 6: Update the comment on users.office_id to reflect current usage
COMMENT ON COLUMN users.office_id IS 'Links government officials to their assigned office. NULL for citizens and admins. Each official can only be assigned to one office.';

-- Step 7: Add constraint to ensure data integrity
-- Ensure foreign key constraint exists
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

-- Step 8: Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

-- Step 9: Add a unique constraint to prevent multiple officials per office (optional)
-- Uncomment the following lines if you want to enforce one official per office
-- ALTER TABLE users ADD CONSTRAINT unique_office_assignment 
-- UNIQUE (office_id) WHERE role = 'official' AND office_id IS NOT NULL;

-- Step 10: Verification and reporting
DO $$
DECLARE
    official_count INTEGER;
    assigned_officials INTEGER;
    unassigned_officials INTEGER;
BEGIN
    -- Count total officials
    SELECT COUNT(*) INTO official_count 
    FROM users WHERE role = 'official';
    
    -- Count assigned officials
    SELECT COUNT(*) INTO assigned_officials 
    FROM users WHERE role = 'official' AND office_id IS NOT NULL;
    
    -- Count unassigned officials
    SELECT COUNT(*) INTO unassigned_officials 
    FROM users WHERE role = 'official' AND office_id IS NULL;
    
    RAISE NOTICE 'Migration completed: Reverted to single office assignment';
    RAISE NOTICE 'Total government officials: %', official_count;
    RAISE NOTICE 'Officials with office assignment: %', assigned_officials;
    RAISE NOTICE 'Officials without office assignment: %', unassigned_officials;
    
    IF unassigned_officials > 0 THEN
        RAISE WARNING 'There are % government officials without office assignments', unassigned_officials;
        RAISE NOTICE 'These officials may need manual assignment to offices';
    END IF;
END $$;

COMMIT;
