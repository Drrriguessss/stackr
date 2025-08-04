-- Create media_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL CHECK (item_type IN ('games', 'movies', 'music', 'books')),
    item_title TEXT NOT NULL,
    item_image TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(activity_id, user_id)
);

-- Create activity_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE media_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for media_shares
DO $$ 
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can view shares sent to them" ON media_shares;
    DROP POLICY IF EXISTS "Users can create shares" ON media_shares;
    
    -- Create new policies
    CREATE POLICY "Users can view shares sent to them" ON media_shares
        FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
    
    CREATE POLICY "Users can create shares" ON media_shares
        FOR INSERT WITH CHECK (auth.uid() = from_user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- RLS policies for activity_likes
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own likes" ON activity_likes;
    
    CREATE POLICY "Users can manage their own likes" ON activity_likes
        FOR ALL USING (auth.uid() = user_id);
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- RLS policies for activity_comments
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view and manage comments" ON activity_comments;
    
    CREATE POLICY "Users can view and manage comments" ON activity_comments
        FOR ALL USING (true); -- Comments are public but users can only modify their own
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_shares_to_user ON media_shares(to_user_id);
CREATE INDEX IF NOT EXISTS idx_media_shares_from_user ON media_shares(from_user_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user ON activity_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity ON activity_comments(activity_id);