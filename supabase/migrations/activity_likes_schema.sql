-- Add activity_likes table that seems to be missing
CREATE TABLE IF NOT EXISTS activity_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one like per user per activity
    UNIQUE(activity_id, user_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activity_likes_activity_id ON activity_likes(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_likes_user_id ON activity_likes(user_id);

-- Enable RLS
ALTER TABLE activity_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_likes
CREATE POLICY "Users can view all activity likes" ON activity_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" ON activity_likes
    FOR ALL USING (auth.uid() = user_id);

-- Add activity_comments table if missing as well
CREATE TABLE IF NOT EXISTS activity_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES activities(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for comments
CREATE INDEX IF NOT EXISTS idx_activity_comments_activity_id ON activity_comments(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_user_id ON activity_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_comments_created_at ON activity_comments(created_at DESC);

-- Enable RLS for comments
ALTER TABLE activity_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_comments
CREATE POLICY "Users can view comments on visible activities" ON activity_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM activities sa
            WHERE sa.id = activity_comments.activity_id
            AND (
                sa.visibility = 'public' OR
                (sa.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM friendships f
                    WHERE (f.user_id = sa.user_id AND f.friend_id = auth.uid())
                    OR (f.friend_id = sa.user_id AND f.user_id = auth.uid())
                    AND f.status = 'accepted'
                )) OR
                sa.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create comments on visible activities" ON activity_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM activities sa
            WHERE sa.id = activity_comments.activity_id
            AND (
                sa.visibility = 'public' OR
                (sa.visibility = 'friends' AND EXISTS (
                    SELECT 1 FROM friendships f
                    WHERE (f.user_id = sa.user_id AND f.friend_id = auth.uid())
                    OR (f.friend_id = sa.user_id AND f.user_id = auth.uid())
                    AND f.status = 'accepted'
                )) OR
                sa.user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own comments" ON activity_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON activity_comments
    FOR DELETE USING (auth.uid() = user_id);