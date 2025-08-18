-- Database schema for review interactions
-- This can be run in Supabase SQL editor to create the necessary tables

-- Table for review likes
CREATE TABLE IF NOT EXISTS review_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Table for review comments
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  likes_count INTEGER DEFAULT 0
);

-- Table for review shares
CREATE TABLE IF NOT EXISTS review_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_review_likes_review_id ON review_likes(review_id);
CREATE INDEX IF NOT EXISTS idx_review_likes_user_id ON review_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_review_id ON review_comments(review_id);
CREATE INDEX IF NOT EXISTS idx_review_comments_user_id ON review_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_review_shares_review_id ON review_shares(review_id);
CREATE INDEX IF NOT EXISTS idx_review_shares_user_id ON review_shares(user_id);

-- Row Level Security (RLS) policies
-- Enable RLS on all tables
ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_shares ENABLE ROW LEVEL SECURITY;

-- Policies for review_likes
CREATE POLICY "Users can view all review likes" ON review_likes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own likes" ON review_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their own likes" ON review_likes FOR DELETE USING (true);

-- Policies for review_comments  
CREATE POLICY "Users can view all review comments" ON review_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON review_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own comments" ON review_comments FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "Users can delete their own comments" ON review_comments FOR DELETE USING (user_id = auth.uid()::text);

-- Policies for review_shares
CREATE POLICY "Users can view all review shares" ON review_shares FOR SELECT USING (true);  
CREATE POLICY "Users can insert their own shares" ON review_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can delete their own shares" ON review_shares FOR DELETE USING (true);