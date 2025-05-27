-- Create comment_replies table for user responses to admin responses
CREATE TABLE IF NOT EXISTS comment_replies (
  reply_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comment_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (comment_id) REFERENCES comments(comment_id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comment_replies_comment_id ON comment_replies(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_user_id ON comment_replies(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_replies_created_at ON comment_replies(created_at);
