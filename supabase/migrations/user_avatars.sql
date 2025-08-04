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

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_avatars_user_id ON user_avatars(user_id);

-- Enable RLS
ALTER TABLE user_avatars ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all avatars" ON user_avatars
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own avatar" ON user_avatars
    FOR ALL USING (auth.uid() = user_id);

-- Function to get user avatar (returns custom or Google avatar)
CREATE OR REPLACE FUNCTION get_user_avatar(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_avatar_url TEXT;
BEGIN
    -- First check user_avatars table
    SELECT avatar_url INTO v_avatar_url
    FROM user_avatars
    WHERE user_id = p_user_id;
    
    IF v_avatar_url IS NOT NULL THEN
        RETURN v_avatar_url;
    END IF;
    
    -- Then check user_profiles table
    SELECT avatar_url INTO v_avatar_url
    FROM user_profiles
    WHERE id = p_user_id;
    
    IF v_avatar_url IS NOT NULL THEN
        RETURN v_avatar_url;
    END IF;
    
    -- Finally check auth.users metadata
    SELECT raw_user_meta_data->>'avatar_url' INTO v_avatar_url
    FROM auth.users
    WHERE id = p_user_id;
    
    RETURN v_avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;