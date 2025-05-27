-- Add admin response columns to comments table
ALTER TABLE comments 
ADD COLUMN IF NOT EXISTS admin_response TEXT,
ADD COLUMN IF NOT EXISTS admin_response_by UUID,
ADD COLUMN IF NOT EXISTS admin_response_at TIMESTAMP WITH TIME ZONE;

-- Add foreign key constraint for admin_response_by
ALTER TABLE comments 
ADD CONSTRAINT fk_comments_admin_response_by 
FOREIGN KEY (admin_response_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- Create index for admin responses
CREATE INDEX IF NOT EXISTS idx_comments_admin_response_by ON comments(admin_response_by);
CREATE INDEX IF NOT EXISTS idx_comments_admin_response_at ON comments(admin_response_at);
