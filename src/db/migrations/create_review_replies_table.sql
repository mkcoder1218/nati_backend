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

-- Create index on review_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_review_replies_created_at ON review_replies(created_at);
