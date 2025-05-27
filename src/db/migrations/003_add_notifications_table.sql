-- Create notification_type enum
CREATE TYPE notification_type AS ENUM ('info', 'warning', 'success', 'error');

-- Create entity_type enum
CREATE TYPE entity_type AS ENUM ('review', 'office', 'service', 'user');

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

-- Create index on user_id for faster queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);

-- Create index on is_read for faster unread count queries
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Create index on created_at for sorting
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
