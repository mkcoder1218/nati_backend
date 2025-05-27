-- Government Service Feedback System - Reply System Setup
-- Run this SQL script to enable the reply functionality

-- Create review_replies table
CREATE TABLE IF NOT EXISTS review_replies (
  reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at);

-- Verify table creation
SELECT 'review_replies table created successfully' as status
WHERE EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'review_replies'
);
