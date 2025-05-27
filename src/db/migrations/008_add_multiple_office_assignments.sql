-- Migration: Add support for multiple office assignments for government officials
-- This migration creates a many-to-many relationship between users and offices

-- Create user_office_assignments table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_office_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    office_id UUID NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID, -- Who assigned this official to this office
    is_primary BOOLEAN DEFAULT FALSE, -- Mark one office as primary for each official
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (office_id) REFERENCES offices(office_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(user_id) ON DELETE SET NULL,
    UNIQUE (user_id, office_id) -- Prevent duplicate assignments
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_office_assignments_user_id ON user_office_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_office_assignments_office_id ON user_office_assignments(office_id);
CREATE INDEX IF NOT EXISTS idx_user_office_assignments_primary ON user_office_assignments(user_id, is_primary);

-- Migrate existing office_id assignments to the new table
INSERT INTO user_office_assignments (user_id, office_id, is_primary, status)
SELECT user_id, office_id, TRUE, 'active'
FROM users
WHERE office_id IS NOT NULL AND role = 'official'
ON CONFLICT (user_id, office_id) DO NOTHING;

-- Function to get all offices for a user
CREATE OR REPLACE FUNCTION get_user_offices(target_user_id UUID)
RETURNS TABLE (
    office_id UUID,
    office_name VARCHAR(255),
    office_type VARCHAR(50),
    is_primary BOOLEAN,
    assigned_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.office_id,
        o.name as office_name,
        o.type::VARCHAR(50) as office_type,
        uoa.is_primary,
        uoa.assigned_at
    FROM user_office_assignments uoa
    JOIN offices o ON uoa.office_id = o.office_id
    WHERE uoa.user_id = target_user_id
    AND uoa.status = 'active'
    ORDER BY uoa.is_primary DESC, uoa.assigned_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get primary office for a user
CREATE OR REPLACE FUNCTION get_user_primary_office(target_user_id UUID)
RETURNS TABLE (
    office_id UUID,
    office_name VARCHAR(255),
    office_type VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.office_id,
        o.name as office_name,
        o.type::VARCHAR(50) as office_type
    FROM user_office_assignments uoa
    JOIN offices o ON uoa.office_id = o.office_id
    WHERE uoa.user_id = target_user_id
    AND uoa.is_primary = TRUE
    AND uoa.status = 'active'
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to assign user to office
CREATE OR REPLACE FUNCTION assign_user_to_office(
    target_user_id UUID,
    target_office_id UUID,
    make_primary BOOLEAN DEFAULT FALSE,
    assigned_by_user_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    assignment_exists BOOLEAN;
BEGIN
    -- Check if assignment already exists
    SELECT EXISTS(
        SELECT 1 FROM user_office_assignments
        WHERE user_id = target_user_id AND office_id = target_office_id
    ) INTO assignment_exists;

    IF assignment_exists THEN
        -- Update existing assignment
        UPDATE user_office_assignments
        SET status = 'active', assigned_at = CURRENT_TIMESTAMP
        WHERE user_id = target_user_id AND office_id = target_office_id;
    ELSE
        -- Create new assignment
        INSERT INTO user_office_assignments (user_id, office_id, assigned_by, is_primary, status)
        VALUES (target_user_id, target_office_id, assigned_by_user_id, make_primary, 'active');
    END IF;

    -- If this should be primary, unset other primary assignments
    IF make_primary THEN
        UPDATE user_office_assignments
        SET is_primary = FALSE
        WHERE user_id = target_user_id AND office_id != target_office_id;

        UPDATE user_office_assignments
        SET is_primary = TRUE
        WHERE user_id = target_user_id AND office_id = target_office_id;
    END IF;

    -- If this is the user's first office, make it primary
    IF NOT EXISTS(
        SELECT 1 FROM user_office_assignments
        WHERE user_id = target_user_id AND is_primary = TRUE AND status = 'active'
    ) THEN
        UPDATE user_office_assignments
        SET is_primary = TRUE
        WHERE user_id = target_user_id AND office_id = target_office_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to remove user from office
CREATE OR REPLACE FUNCTION remove_user_from_office(
    target_user_id UUID,
    target_office_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    was_primary BOOLEAN;
    new_primary_office UUID;
BEGIN
    -- Check if this was the primary office
    SELECT is_primary INTO was_primary
    FROM user_office_assignments
    WHERE user_id = target_user_id AND office_id = target_office_id;

    -- Remove the assignment
    DELETE FROM user_office_assignments
    WHERE user_id = target_user_id AND office_id = target_office_id;

    -- If this was primary, assign a new primary office
    IF was_primary THEN
        SELECT office_id INTO new_primary_office
        FROM user_office_assignments
        WHERE user_id = target_user_id AND status = 'active'
        ORDER BY assigned_at ASC
        LIMIT 1;

        IF new_primary_office IS NOT NULL THEN
            UPDATE user_office_assignments
            SET is_primary = TRUE
            WHERE user_id = target_user_id AND office_id = new_primary_office;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE user_office_assignments IS 'Many-to-many relationship between users and offices for government officials';
COMMENT ON COLUMN user_office_assignments.is_primary IS 'Indicates the primary office for officials with multiple assignments';
COMMENT ON COLUMN user_office_assignments.status IS 'Status of the assignment: active, inactive, suspended';

-- Note: Keep the existing office_id column in users table for backward compatibility
-- It will be used as a reference to the primary office
COMMENT ON COLUMN users.office_id IS 'DEPRECATED: Use user_office_assignments table. Kept for backward compatibility.';

DO $$
BEGIN
    RAISE NOTICE 'Migration completed: Multiple office assignments support added';
    RAISE NOTICE 'Government officials can now be assigned to multiple offices';
    RAISE NOTICE 'Use get_user_offices() function to retrieve all offices for a user';
    RAISE NOTICE 'Use assign_user_to_office() function to assign users to offices';
END $$;
