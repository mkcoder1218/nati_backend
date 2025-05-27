-- Ensure service_guides table exists with proper structure
-- This migration is safe to run multiple times

-- Create language enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE language_type AS ENUM ('amharic', 'english');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns to offices table if they don't exist
ALTER TABLE offices
ADD COLUMN IF NOT EXISTS upvote_count INTEGER DEFAULT 0;

ALTER TABLE offices
ADD COLUMN IF NOT EXISTS downvote_count INTEGER DEFAULT 0;

ALTER TABLE offices
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE offices
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create service_guides table if it doesn't exist
CREATE TABLE IF NOT EXISTS service_guides (
    guide_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language language_type NOT NULL DEFAULT 'english',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint if it doesn't exist
DO $$ BEGIN
    ALTER TABLE service_guides
    ADD CONSTRAINT fk_service_guides_office_id
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_service_guides_office_id ON service_guides(office_id);
CREATE INDEX IF NOT EXISTS idx_service_guides_language ON service_guides(language);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_service_guides_updated_at ON service_guides;
CREATE TRIGGER update_service_guides_updated_at
    BEFORE UPDATE ON service_guides
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify table structure
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_guides'
        AND column_name = 'guide_id'
    ) THEN
        RAISE EXCEPTION 'service_guides table is missing guide_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_guides'
        AND column_name = 'office_id'
    ) THEN
        RAISE EXCEPTION 'service_guides table is missing office_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_guides'
        AND column_name = 'title'
    ) THEN
        RAISE EXCEPTION 'service_guides table is missing title column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_guides'
        AND column_name = 'content'
    ) THEN
        RAISE EXCEPTION 'service_guides table is missing content column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'service_guides'
        AND column_name = 'language'
    ) THEN
        RAISE EXCEPTION 'service_guides table is missing language column';
    END IF;

    RAISE NOTICE 'service_guides table structure verified successfully';
END $$;
