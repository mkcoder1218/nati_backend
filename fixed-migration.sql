-- Fixed migration script for adding office_id column
-- This handles the constraint creation properly

BEGIN;

-- 1. Add office_id column if it doesn't exist
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

-- 2. Add foreign key constraint if it doesn't exist
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

-- 3. Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

COMMIT;

-- Verify the migration
SELECT 
    'Migration completed!' as status,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'office_id';
