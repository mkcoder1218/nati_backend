-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user roles enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('citizen', 'official', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create office types enum
DO $$ BEGIN
    CREATE TYPE office_type AS ENUM ('kebele', 'woreda', 'municipal', 'regional', 'federal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create review status enum
DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create sentiment enum
DO $$ BEGIN
    CREATE TYPE sentiment_type AS ENUM ('positive', 'negative', 'neutral');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create language enum
DO $$ BEGIN
    CREATE TYPE language_type AS ENUM ('amharic', 'english');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create vote type enum
DO $$ BEGIN
    CREATE TYPE vote_type AS ENUM ('helpful', 'not_helpful', 'flag');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'citizen',
    full_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- Create Offices table
CREATE TABLE IF NOT EXISTS offices (
    office_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type office_type NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    address VARCHAR(255) NOT NULL,
    contact_info VARCHAR(255) NOT NULL,
    operating_hours VARCHAR(255) NOT NULL,
    parent_office_id UUID,
    FOREIGN KEY (parent_office_id) REFERENCES offices(office_id) ON DELETE SET NULL
);

-- Create Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    review_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    office_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status review_status NOT NULL DEFAULT 'pending',
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL,
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE
);

-- Create SentimentLogs table
CREATE TABLE IF NOT EXISTS sentiment_logs (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    review_id UUID NOT NULL,
    sentiment sentiment_type NOT NULL,
    category VARCHAR(100),
    confidence_score DECIMAL(5,4) NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    language language_type NOT NULL,
    FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE
);

-- Create ServiceGuides table
CREATE TABLE IF NOT EXISTS service_guides (
    guide_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    office_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    language language_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE
);

-- Create Votes table
CREATE TABLE IF NOT EXISTS votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    review_id UUID NOT NULL,
    vote_type vote_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (review_id) REFERENCES reviews(review_id) ON DELETE CASCADE,
    UNIQUE (user_id, review_id)
);

-- Create indexes for performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_reviews_office_id ON reviews(office_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_sentiment_logs_review_id ON sentiment_logs(review_id);
CREATE INDEX IF NOT EXISTS idx_service_guides_office_id ON service_guides(office_id);
CREATE INDEX IF NOT EXISTS idx_votes_review_id ON votes(review_id);
CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);
