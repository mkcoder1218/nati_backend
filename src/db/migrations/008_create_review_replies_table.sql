-- Create review_replies table for storing replies to reviews
-- This migration is safe to run multiple times

-- Create review_replies table if it doesn't exist
CREATE TABLE IF NOT EXISTS review_replies (
    reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
    ALTER TABLE review_replies 
    ADD CONSTRAINT fk_review_replies_review_id 
    FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE review_replies 
    ADD CONSTRAINT fk_review_replies_user_id 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_review_replies_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_review_replies_updated_at ON review_replies;
CREATE TRIGGER update_review_replies_updated_at
    BEFORE UPDATE ON review_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_review_replies_updated_at_column();

-- Verify table structure
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review_replies' 
        AND column_name = 'reply_id'
    ) THEN
        RAISE EXCEPTION 'review_replies table is missing reply_id column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review_replies' 
        AND column_name = 'review_id'
    ) THEN
        RAISE EXCEPTION 'review_replies table is missing review_id column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review_replies' 
        AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'review_replies table is missing user_id column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'review_replies' 
        AND column_name = 'content'
    ) THEN
        RAISE EXCEPTION 'review_replies table is missing content column';
    END IF;
    
    RAISE NOTICE 'review_replies table structure verified successfully';
END $$;
