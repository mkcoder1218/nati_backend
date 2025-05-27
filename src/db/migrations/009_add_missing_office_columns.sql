-- Add missing columns to offices table
-- This migration is safe to run multiple times

-- Add missing columns to offices table if they don't exist
ALTER TABLE offices 
ADD COLUMN IF NOT EXISTS upvote_count INTEGER DEFAULT 0;

ALTER TABLE offices 
ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0;

ALTER TABLE offices 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE offices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_offices_upvote_count ON offices(upvote_count);
CREATE INDEX IF NOT EXISTS idx_offices_downvote_count ON offices(downvote_count);
CREATE INDEX IF NOT EXISTS idx_offices_created_at ON offices(created_at);
CREATE INDEX IF NOT EXISTS idx_offices_updated_at ON offices(updated_at);

-- Add updated_at trigger function for offices if it doesn't exist
CREATE OR REPLACE FUNCTION update_offices_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_offices_updated_at ON offices;
CREATE TRIGGER update_offices_updated_at
    BEFORE UPDATE ON offices
    FOR EACH ROW
    EXECUTE FUNCTION update_offices_updated_at_column();

-- Update existing records to have proper timestamps if they don't have them
UPDATE offices 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;

UPDATE offices 
SET updated_at = CURRENT_TIMESTAMP 
WHERE updated_at IS NULL;

-- Verify table structure
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offices' 
        AND column_name = 'upvote_count'
    ) THEN
        RAISE EXCEPTION 'offices table is missing upvote_count column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offices' 
        AND column_name = 'downvote_count'
    ) THEN
        RAISE EXCEPTION 'offices table is missing downvote_count column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offices' 
        AND column_name = 'created_at'
    ) THEN
        RAISE EXCEPTION 'offices table is missing created_at column';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'offices' 
        AND column_name = 'updated_at'
    ) THEN
        RAISE EXCEPTION 'offices table is missing updated_at column';
    END IF;
    
    RAISE NOTICE 'offices table structure verified successfully';
END $$;
