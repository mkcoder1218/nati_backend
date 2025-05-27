-- Create report type enum for scheduled reports
DO $$ BEGIN
    CREATE TYPE report_type AS ENUM ('sentiment', 'feedback', 'performance', 'services');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create frequency enum for scheduled reports
DO $$ BEGIN
    CREATE TYPE frequency_type AS ENUM ('daily', 'weekly', 'monthly', 'quarterly');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create scheduled_report_status enum
DO $$ BEGIN
    CREATE TYPE scheduled_report_status AS ENUM ('active', 'paused', 'inactive');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Scheduled Reports table
CREATE TABLE IF NOT EXISTS scheduled_reports (
    scheduled_report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    report_type report_type NOT NULL,
    frequency frequency_type NOT NULL,
    office_id UUID,
    user_id UUID NOT NULL,
    recipients TEXT[] NOT NULL, -- Array of email addresses
    next_run_date TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run_date TIMESTAMP WITH TIME ZONE,
    status scheduled_report_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_user_id ON scheduled_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_office_id ON scheduled_reports(office_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_status ON scheduled_reports(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next_run ON scheduled_reports(next_run_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_frequency ON scheduled_reports(frequency);
