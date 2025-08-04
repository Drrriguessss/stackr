-- Add avatar_url to user_profiles if not exists
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create user_avatars table for custom avatars
CREATE TABLE IF NOT EXISTS user_avatars (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    avatar_url TEXT NOT NULL,
    google_avatar_url TEXT, -- Store original Google avatar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_avatars
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_avatars
CREATE POLICY "Users can view their own avatar" ON user_avatars
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own avatar" ON user_avatars
    FOR ALL USING (auth.uid() = user_id);

-- Create function to get user avatar with fallbacks
CREATE OR REPLACE FUNCTION get_user_avatar(input_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    avatar_url TEXT;
BEGIN
    -- Try custom avatar first
    SELECT ua.avatar_url INTO avatar_url
    FROM user_avatars ua
    WHERE ua.user_id = input_user_id;
    
    IF avatar_url IS NOT NULL THEN
        RETURN avatar_url;
    END IF;
    
    -- Try profile avatar
    SELECT up.avatar_url INTO avatar_url
    FROM user_profiles up
    WHERE up.id = input_user_id;
    
    IF avatar_url IS NOT NULL THEN
        RETURN avatar_url;
    END IF;
    
    -- Try Google avatar from user_avatars
    SELECT ua.google_avatar_url INTO avatar_url
    FROM user_avatars ua
    WHERE ua.user_id = input_user_id;
    
    RETURN avatar_url; -- May be NULL, handled by client
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;