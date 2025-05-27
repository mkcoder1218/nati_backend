-- Create office vote type enum
CREATE TYPE office_vote_type AS ENUM ('upvote', 'downvote');

-- Create Office Votes table
CREATE TABLE IF NOT EXISTS office_votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    office_id UUID NOT NULL,
    vote_type office_vote_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE,
    UNIQUE (user_id, office_id)
);

-- Create indexes for performance
CREATE INDEX idx_office_votes_office_id ON office_votes(office_id);
CREATE INDEX idx_office_votes_user_id ON office_votes(user_id);
CREATE INDEX idx_office_votes_vote_type ON office_votes(vote_type);
CREATE INDEX idx_office_votes_created_at ON office_votes(created_at);

-- Add vote count columns to offices table for quick access
ALTER TABLE offices ADD COLUMN upvote_count INTEGER DEFAULT 0;
ALTER TABLE offices ADD COLUMN downvote_count INTEGER DEFAULT 0;

-- Create function to update vote counts on offices table
CREATE OR REPLACE FUNCTION update_office_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update vote counts in offices table
    IF TG_OP = 'INSERT' THEN
        IF NEW.vote_type = 'upvote' THEN
            UPDATE offices SET upvote_count = upvote_count + 1 WHERE office_id = NEW.office_id;
        ELSIF NEW.vote_type = 'downvote' THEN
            UPDATE offices SET downvote_count = downvote_count + 1 WHERE office_id = NEW.office_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.vote_type = 'upvote' AND NEW.vote_type = 'downvote' THEN
            UPDATE offices SET upvote_count = upvote_count - 1, downvote_count = downvote_count + 1 WHERE office_id = NEW.office_id;
        ELSIF OLD.vote_type = 'downvote' AND NEW.vote_type = 'upvote' THEN
            UPDATE offices SET upvote_count = upvote_count + 1, downvote_count = downvote_count - 1 WHERE office_id = NEW.office_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.vote_type = 'upvote' THEN
            UPDATE offices SET upvote_count = upvote_count - 1 WHERE office_id = OLD.office_id;
        ELSIF OLD.vote_type = 'downvote' THEN
            UPDATE offices SET downvote_count = downvote_count - 1 WHERE office_id = OLD.office_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for vote count updates
CREATE TRIGGER office_vote_counts_trigger
AFTER INSERT OR UPDATE OR DELETE ON office_votes
FOR EACH ROW EXECUTE FUNCTION update_office_vote_counts();
