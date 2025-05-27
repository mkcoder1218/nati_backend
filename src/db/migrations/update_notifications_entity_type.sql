-- Add 'comment' to the entity_type enum if it doesn't already exist
DO $$
BEGIN
    -- Check if 'comment' value already exists in the enum
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum
        WHERE enumlabel = 'comment'
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'entity_type'
        )
    ) THEN
        -- Add 'comment' to the entity_type enum
        ALTER TYPE entity_type ADD VALUE 'comment';
    END IF;
END $$;
