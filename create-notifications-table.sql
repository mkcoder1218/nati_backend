-- Create notification_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create entity_type enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE entity_type AS ENUM ('review', 'office', 'service', 'user', 'comment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    notification_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL DEFAULT 'info',
    related_entity_type entity_type,
    related_entity_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Verify the table was created
SELECT 'Notifications table created successfully' as status 
WHERE EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
);
