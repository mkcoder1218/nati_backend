-- Create report_status enum
CREATE TYPE report_status AS ENUM ('generating', 'completed', 'failed');

-- Create report_type enum  
CREATE TYPE report_type AS ENUM ('sentiment', 'feedback', 'performance', 'services');

-- Create Reports table
CREATE TABLE IF NOT EXISTS reports (
    report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    format VARCHAR(10) NOT NULL DEFAULT 'pdf',
    report_type report_type NOT NULL,
    office_id UUID,
    user_id UUID NOT NULL,
    start_date DATE,
    end_date DATE,
    status report_status NOT NULL DEFAULT 'generating',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_office_id ON reports(office_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
