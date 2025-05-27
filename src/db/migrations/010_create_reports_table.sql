-- Create reports table for storing generated reports
-- This migration is safe to run multiple times
-- Note: Enum types report_type and report_status should already exist

-- Create reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    format VARCHAR(50) NOT NULL DEFAULT 'pdf',
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('sentiment', 'feedback', 'performance', 'services')),
    office_id UUID,
    user_id UUID NOT NULL,
    start_date DATE,
    end_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraints if they don't exist
DO $$ BEGIN
    ALTER TABLE reports
    ADD CONSTRAINT fk_reports_office_id
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE reports
    ADD CONSTRAINT fk_reports_user_id
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_office_id ON reports(office_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);

-- Add updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_reports_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at_column();

-- Verify table structure
DO $$
BEGIN
    -- Check if all required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports'
        AND column_name = 'report_id'
    ) THEN
        RAISE EXCEPTION 'reports table is missing report_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports'
        AND column_name = 'title'
    ) THEN
        RAISE EXCEPTION 'reports table is missing title column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports'
        AND column_name = 'user_id'
    ) THEN
        RAISE EXCEPTION 'reports table is missing user_id column';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'reports'
        AND column_name = 'report_type'
    ) THEN
        RAISE EXCEPTION 'reports table is missing report_type column';
    END IF;

    RAISE NOTICE 'reports table structure verified successfully';
END $$;
