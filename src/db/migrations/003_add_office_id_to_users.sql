-- Add office_id column to users table to link government officials to specific offices
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id UUID;

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
    ALTER TABLE users ADD CONSTRAINT fk_users_office_id
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

-- Add comment for documentation
COMMENT ON COLUMN users.office_id IS 'Links government officials to their assigned office. NULL for citizens and admins.';
