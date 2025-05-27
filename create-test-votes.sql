-- Create test votes for existing reviews to demonstrate upvoted/downvoted functionality
-- This script creates realistic voting data for government officials

BEGIN;

-- First, let's check if we have officials and reviews
DO $$
DECLARE
    official_count INTEGER;
    review_count INTEGER;
    office_count INTEGER;
BEGIN
    -- Count officials
    SELECT COUNT(*) INTO official_count FROM users WHERE role = 'official';
    RAISE NOTICE 'Found % officials', official_count;
    
    -- Count approved reviews
    SELECT COUNT(*) INTO review_count FROM reviews WHERE status = 'approved';
    RAISE NOTICE 'Found % approved reviews', review_count;
    
    -- Count offices
    SELECT COUNT(*) INTO office_count FROM offices;
    RAISE NOTICE 'Found % offices', office_count;
    
    IF official_count = 0 THEN
        RAISE NOTICE 'No officials found. Creating sample officials...';
        
        -- Create sample officials for existing offices
        INSERT INTO users (user_id, email, password, role, full_name, phone_number, office_id)
        SELECT 
            gen_random_uuid(),
            'official.' || LOWER(REPLACE(o.name, ' ', '.')) || '@gov.et',
            '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: password
            'official',
            'Official for ' || o.name,
            '+251911' || LPAD((RANDOM() * 999999)::INTEGER::TEXT, 6, '0'),
            o.office_id
        FROM offices o
        WHERE NOT EXISTS (
            SELECT 1 FROM users u WHERE u.office_id = o.office_id AND u.role = 'official'
        )
        LIMIT 5;
        
        RAISE NOTICE 'Created sample officials';
    END IF;
    
    IF review_count = 0 THEN
        RAISE NOTICE 'No approved reviews found. Please ensure there are approved reviews in the system.';
    END IF;
END $$;

-- Create votes from officials for reviews in their assigned offices
INSERT INTO votes (vote_id, user_id, review_id, vote_type, created_at)
SELECT 
    gen_random_uuid(),
    u.user_id,
    r.review_id,
    CASE 
        WHEN RANDOM() < 0.7 THEN 'helpful'  -- 70% helpful votes
        ELSE 'not_helpful'                   -- 30% not helpful votes
    END,
    r.created_at + INTERVAL '1 day' + (RANDOM() * INTERVAL '30 days')
FROM users u
JOIN reviews r ON r.office_id = u.office_id
WHERE u.role = 'official' 
AND u.office_id IS NOT NULL
AND r.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM votes v 
    WHERE v.user_id = u.user_id AND v.review_id = r.review_id
)
-- Limit to create realistic voting patterns (not every official votes on every review)
AND RANDOM() < 0.6  -- 60% chance an official votes on a review
ON CONFLICT (user_id, review_id) DO NOTHING;

-- Create some additional votes from admins on reviews from all offices
INSERT INTO votes (vote_id, user_id, review_id, vote_type, created_at)
SELECT 
    gen_random_uuid(),
    u.user_id,
    r.review_id,
    CASE 
        WHEN RANDOM() < 0.6 THEN 'helpful'   -- 60% helpful votes from admins
        ELSE 'not_helpful'                    -- 40% not helpful votes from admins
    END,
    r.created_at + INTERVAL '2 days' + (RANDOM() * INTERVAL '25 days')
FROM users u
CROSS JOIN reviews r
WHERE u.role = 'admin' 
AND r.status = 'approved'
AND NOT EXISTS (
    SELECT 1 FROM votes v 
    WHERE v.user_id = u.user_id AND v.review_id = r.review_id
)
-- Admins vote less frequently than officials
AND RANDOM() < 0.3  -- 30% chance an admin votes on a review
ON CONFLICT (user_id, review_id) DO NOTHING;

-- Create some votes from citizens on reviews (citizens can vote on any approved review)
INSERT INTO votes (vote_id, user_id, review_id, vote_type, created_at)
SELECT 
    gen_random_uuid(),
    u.user_id,
    r.review_id,
    CASE 
        WHEN RANDOM() < 0.8 THEN 'helpful'   -- 80% helpful votes from citizens
        ELSE 'not_helpful'                    -- 20% not helpful votes from citizens
    END,
    r.created_at + INTERVAL '3 days' + (RANDOM() * INTERVAL '20 days')
FROM users u
CROSS JOIN reviews r
WHERE u.role = 'citizen' 
AND r.status = 'approved'
AND u.user_id != r.user_id  -- Citizens can't vote on their own reviews
AND NOT EXISTS (
    SELECT 1 FROM votes v 
    WHERE v.user_id = u.user_id AND v.review_id = r.review_id
)
-- Citizens vote occasionally
AND RANDOM() < 0.4  -- 40% chance a citizen votes on a review
ON CONFLICT (user_id, review_id) DO NOTHING;

-- Update vote counts for reviews
UPDATE reviews SET 
    upvote_count = (
        SELECT COUNT(*) FROM votes 
        WHERE review_id = reviews.review_id AND vote_type = 'helpful'
    ),
    downvote_count = (
        SELECT COUNT(*) FROM votes 
        WHERE review_id = reviews.review_id AND vote_type = 'not_helpful'
    );

-- Display summary of created votes
DO $$
DECLARE
    total_votes INTEGER;
    helpful_votes INTEGER;
    not_helpful_votes INTEGER;
    official_votes INTEGER;
    admin_votes INTEGER;
    citizen_votes INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_votes FROM votes;
    SELECT COUNT(*) INTO helpful_votes FROM votes WHERE vote_type = 'helpful';
    SELECT COUNT(*) INTO not_helpful_votes FROM votes WHERE vote_type = 'not_helpful';
    
    SELECT COUNT(*) INTO official_votes 
    FROM votes v JOIN users u ON v.user_id = u.user_id 
    WHERE u.role = 'official';
    
    SELECT COUNT(*) INTO admin_votes 
    FROM votes v JOIN users u ON v.user_id = u.user_id 
    WHERE u.role = 'admin';
    
    SELECT COUNT(*) INTO citizen_votes 
    FROM votes v JOIN users u ON v.user_id = u.user_id 
    WHERE u.role = 'citizen';
    
    RAISE NOTICE '=== VOTE CREATION SUMMARY ===';
    RAISE NOTICE 'Total votes created: %', total_votes;
    RAISE NOTICE 'Helpful votes: %', helpful_votes;
    RAISE NOTICE 'Not helpful votes: %', not_helpful_votes;
    RAISE NOTICE 'Votes by officials: %', official_votes;
    RAISE NOTICE 'Votes by admins: %', admin_votes;
    RAISE NOTICE 'Votes by citizens: %', citizen_votes;
    RAISE NOTICE '================================';
END $$;

COMMIT;
