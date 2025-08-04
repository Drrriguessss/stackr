-- Fix notifications table by adding missing from_user_id column
-- This will allow friend requests to work properly

-- First, check if the column already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'from_user_id'
    ) THEN
        -- Add the missing from_user_id column
        ALTER TABLE notifications 
        ADD COLUMN from_user_id UUID REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added from_user_id column to notifications table';
    ELSE
        RAISE NOTICE 'from_user_id column already exists in notifications table';
    END IF;
END $$;

-- Update RLS policies if needed
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;  
CREATE POLICY "Users can insert their own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = from_user_id);

-- Make sure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;