-- Add office_id column to users table for government officials
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS office_id UUID;

-- Add foreign key constraint
ALTER TABLE users 
ADD CONSTRAINT fk_users_office_id 
FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);
