-- Fix notification system for friend media sharing
-- Run this in your Supabase SQL editor

-- 1. First, check the current notifications table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 2. Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add from_user_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'from_user_id'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN from_user_id UUID REFERENCES auth.users(id);
        
        RAISE NOTICE 'Added from_user_id column to notifications table';
    END IF;
    
    -- Add related_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'related_id'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN related_id TEXT;
        
        RAISE NOTICE 'Added related_id column to notifications table';
    END IF;
    
    -- Add data field if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'data'
    ) THEN
        ALTER TABLE notifications 
        ADD COLUMN data JSONB;
        
        RAISE NOTICE 'Added data column to notifications table';
    END IF;
END $$;

-- 3. Update RLS policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;  
CREATE POLICY "Users can insert notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = from_user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_id ON notifications(related_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 5. Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Test the notification system by checking current structure
SELECT 'Notifications table structure:' as info;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;