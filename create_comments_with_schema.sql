-- Create comments table in the public schema
CREATE TABLE IF NOT EXISTS public.comments (
  comment_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at);

-- Update the notifications table if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        -- Check if the constraint exists
        IF EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'notifications_related_entity_type_check' 
            AND table_name = 'notifications'
        ) THEN
            -- Drop the existing constraint
            ALTER TABLE public.notifications DROP CONSTRAINT notifications_related_entity_type_check;
        END IF;
        
        -- Add the updated constraint with 'comment' as a valid entity type
        ALTER TABLE public.notifications ADD CONSTRAINT notifications_related_entity_type_check 
        CHECK (related_entity_type IS NULL OR related_entity_type IN ('review', 'office', 'service', 'user', 'comment'));
    END IF;
END $$;
