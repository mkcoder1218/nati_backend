-- Migration: Ensure proper office assignments for government officials
-- This migration ensures that government officials are properly assigned to offices
-- and creates sample data for offices that don't have any reviews yet

-- First, ensure the office_id column exists (should already exist from previous migrations)
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_id UUID;

-- Clean up any empty string values in office_id (convert to NULL)
UPDATE users SET office_id = NULL WHERE office_id::text = '';

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_office_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_office_id
        FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index for faster lookups if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_office_id ON users(office_id);

-- Function to create sample data for an office
CREATE OR REPLACE FUNCTION create_sample_data_for_office(target_office_id UUID)
RETURNS VOID AS $$
DECLARE
    citizen_user_id UUID;
    office_name_var VARCHAR(255);
    review_data RECORD;
    new_review_id UUID;
BEGIN
    -- Get office name
    SELECT name INTO office_name_var FROM offices WHERE office_id = target_office_id;

    IF office_name_var IS NULL THEN
        RAISE NOTICE 'Office not found: %', target_office_id;
        RETURN;
    END IF;

    RAISE NOTICE 'Creating sample data for office: %', office_name_var;

    -- Get a citizen user to create reviews
    SELECT user_id INTO citizen_user_id FROM users WHERE role = 'citizen' LIMIT 1;

    IF citizen_user_id IS NULL THEN
        RAISE NOTICE 'No citizen users found, cannot create sample reviews';
        RETURN;
    END IF;

    -- Create sample reviews
    FOR review_data IN
        SELECT * FROM (VALUES
            (4, 'Good service, but waiting time could be improved', 'positive', 'Service Quality'),
            (5, 'Excellent staff and quick processing', 'positive', 'Staff Performance'),
            (3, 'Average experience, some delays in document processing', 'neutral', 'Processing Time'),
            (2, 'Long waiting times and unclear requirements', 'negative', 'Wait Time'),
            (4, 'Helpful staff but office facilities need improvement', 'positive', 'Facilities'),
            (1, 'Very poor service and rude staff behavior', 'negative', 'Staff Behavior'),
            (5, 'Outstanding service delivery and professional staff', 'positive', 'Service Quality'),
            (3, 'Okay service but could be more efficient', 'neutral', 'Efficiency')
        ) AS t(rating, comment, sentiment, category)
    LOOP
        -- Insert review
        INSERT INTO reviews (user_id, office_id, rating, comment, created_at, status)
        VALUES (
            citizen_user_id,
            target_office_id,
            review_data.rating,
            review_data.comment,
            NOW() - INTERVAL '1 day' * (random() * 30)::int,
            'approved'
        )
        RETURNING review_id INTO new_review_id;

        -- Insert sentiment log
        INSERT INTO sentiment_logs (review_id, sentiment, category, confidence_score, language)
        VALUES (
            new_review_id,
            review_data.sentiment::sentiment_type,
            review_data.category,
            0.85 + (random() * 0.1),
            'english'
        );
    END LOOP;

    RAISE NOTICE 'Created 8 sample reviews for office: %', office_name_var;
END;
$$ LANGUAGE plpgsql;

-- Create sample data for offices that don't have any reviews
DO $$
DECLARE
    office_record RECORD;
    review_count INTEGER;
BEGIN
    FOR office_record IN SELECT office_id, name FROM offices
    LOOP
        -- Check if office has any reviews
        SELECT COUNT(*) INTO review_count
        FROM reviews
        WHERE office_id = office_record.office_id;

        IF review_count = 0 THEN
            RAISE NOTICE 'Office % has no reviews, creating sample data', office_record.name;
            PERFORM create_sample_data_for_office(office_record.office_id);
        ELSE
            RAISE NOTICE 'Office % already has % reviews, skipping', office_record.name, review_count;
        END IF;
    END LOOP;
END $$;

-- Assign unassigned government officials to offices
DO $$
DECLARE
    official_record RECORD;
    office_record RECORD;
    assignment_count INTEGER := 0;
BEGIN
    -- Get unassigned officials
    FOR official_record IN
        SELECT user_id, email, full_name
        FROM users
        WHERE role = 'official' AND office_id IS NULL
    LOOP
        -- Get an office that doesn't have an assigned official
        SELECT o.office_id, o.name INTO office_record
        FROM offices o
        LEFT JOIN users u ON u.office_id = o.office_id AND u.role = 'official'
        WHERE u.user_id IS NULL
        LIMIT 1;

        IF office_record.office_id IS NOT NULL THEN
            -- Assign official to office
            UPDATE users
            SET office_id = office_record.office_id
            WHERE user_id = official_record.user_id;

            assignment_count := assignment_count + 1;

            RAISE NOTICE 'Assigned % (%) to %',
                official_record.full_name,
                official_record.email,
                office_record.name;
        END IF;
    END LOOP;

    RAISE NOTICE 'Assigned % officials to offices', assignment_count;
END $$;

-- Clean up the function (optional, comment out if you want to keep it)
-- DROP FUNCTION IF EXISTS create_sample_data_for_office(UUID);
