-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for username search
CREATE INDEX idx_user_profiles_username ON public.user_profiles(username);
CREATE INDEX idx_user_profiles_display_name ON public.user_profiles(display_name);

-- Create friendships table (bidirectional relationships)
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Create indexes for friendships
CREATE INDEX idx_friendships_user_id ON public.friendships(user_id);
CREATE INDEX idx_friendships_friend_id ON public.friendships(friend_id);
CREATE INDEX idx_friendships_status ON public.friendships(status);

-- Create friend_requests view for easier querying
CREATE VIEW public.friend_requests AS
SELECT 
  f.id,
  f.user_id as requester_id,
  f.friend_id as recipient_id,
  f.status,
  f.created_at,
  up_requester.username as requester_username,
  up_requester.display_name as requester_display_name,
  up_requester.avatar_url as requester_avatar,
  up_recipient.username as recipient_username,
  up_recipient.display_name as recipient_display_name,
  up_recipient.avatar_url as recipient_avatar
FROM public.friendships f
JOIN public.user_profiles up_requester ON f.user_id = up_requester.id
JOIN public.user_profiles up_recipient ON f.friend_id = up_recipient.id
WHERE f.status = 'pending';

-- Create activities table for social feed
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('library_add', 'status_update', 'review', 'rating', 'achievement')),
  item_id TEXT NOT NULL, -- Can be library_item id or media id
  item_type TEXT NOT NULL CHECK (item_type IN ('games', 'movies', 'music', 'books')),
  item_title TEXT NOT NULL,
  item_image TEXT,
  metadata JSONB DEFAULT '{}', -- Store additional data like status, rating, review text
  visibility TEXT DEFAULT 'friends' CHECK (visibility IN ('public', 'friends', 'private')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for activities
CREATE INDEX idx_activities_user_id ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);
CREATE INDEX idx_activities_visibility ON public.activities(visibility);

-- Create activity_likes table
CREATE TABLE IF NOT EXISTS public.activity_likes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(activity_id, user_id)
);

-- Create activity_comments table
CREATE TABLE IF NOT EXISTS public.activity_comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'friend_accepted', 'activity_like', 'activity_comment', 'media_shared')),
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  related_id TEXT, -- Can be activity_id, friendship_id, etc.
  message TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Create media_shares table (for sharing media with friends)
CREATE TABLE IF NOT EXISTS public.media_shares (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('games', 'movies', 'music', 'books')),
  item_title TEXT NOT NULL,
  item_image TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_shares ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view private profiles of friends" ON public.user_profiles
  FOR SELECT USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = user_profiles.id)
      OR (friend_id = auth.uid() AND user_id = user_profiles.id))
    )
  );

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Friendships policies
CREATE POLICY "Users can view their friendships" ON public.friendships
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON public.friendships
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of" ON public.friendships
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their friendships" ON public.friendships
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Activities policies
CREATE POLICY "Public activities are viewable by everyone" ON public.activities
  FOR SELECT USING (visibility = 'public');

CREATE POLICY "Friends can view friends-only activities" ON public.activities
  FOR SELECT USING (
    auth.uid() = user_id OR
    (visibility = 'friends' AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
      AND ((user_id = auth.uid() AND friend_id = activities.user_id)
      OR (friend_id = auth.uid() AND user_id = activities.user_id))
    ))
  );

CREATE POLICY "Users can create their own activities" ON public.activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activities" ON public.activities
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activities" ON public.activities
  FOR DELETE USING (auth.uid() = user_id);

-- Activity likes policies
CREATE POLICY "Users can view all likes" ON public.activity_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like activities" ON public.activity_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike activities" ON public.activity_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Activity comments policies
CREATE POLICY "Users can view comments on visible activities" ON public.activity_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.activities a
      WHERE a.id = activity_comments.activity_id
      AND (
        a.visibility = 'public' OR
        a.user_id = auth.uid() OR
        (a.visibility = 'friends' AND EXISTS (
          SELECT 1 FROM public.friendships
          WHERE status = 'accepted'
          AND ((user_id = auth.uid() AND friend_id = a.user_id)
          OR (friend_id = auth.uid() AND user_id = a.user_id))
        ))
      )
    )
  );

CREATE POLICY "Users can comment on visible activities" ON public.activity_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.activity_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Media shares policies
CREATE POLICY "Users can view shares sent to or by them" ON public.media_shares
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can create shares" ON public.media_shares
  FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Functions for easier friend management

-- Function to send friend request
CREATE OR REPLACE FUNCTION public.send_friend_request(friend_username TEXT)
RETURNS UUID AS $$
DECLARE
  friend_uuid UUID;
  request_id UUID;
BEGIN
  -- Get friend's UUID from username
  SELECT id INTO friend_uuid FROM public.user_profiles WHERE username = friend_username;
  
  IF friend_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  IF friend_uuid = auth.uid() THEN
    RAISE EXCEPTION 'Cannot send friend request to yourself';
  END IF;
  
  -- Check if friendship already exists
  IF EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE (user_id = auth.uid() AND friend_id = friend_uuid)
    OR (user_id = friend_uuid AND friend_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Friendship already exists or pending';
  END IF;
  
  -- Create friend request
  INSERT INTO public.friendships (user_id, friend_id, status)
  VALUES (auth.uid(), friend_uuid, 'pending')
  RETURNING id INTO request_id;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, type, from_user_id, related_id, message)
  VALUES (
    friend_uuid, 
    'friend_request', 
    auth.uid(), 
    request_id::TEXT,
    'sent you a friend request'
  );
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept friend request
CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  requester_id UUID;
BEGIN
  -- Update friendship status
  UPDATE public.friendships
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id AND friend_id = auth.uid() AND status = 'pending'
  RETURNING user_id INTO requester_id;
  
  IF requester_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or already processed';
  END IF;
  
  -- Create notification for requester
  INSERT INTO public.notifications (user_id, type, from_user_id, related_id, message)
  VALUES (
    requester_id,
    'friend_accepted',
    auth.uid(),
    request_id::TEXT,
    'accepted your friend request'
  );
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get friends list
CREATE OR REPLACE FUNCTION public.get_friends()
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  friendship_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN f.user_id = auth.uid() THEN f.friend_id
      ELSE f.user_id
    END as friend_id,
    up.username,
    up.display_name,
    up.avatar_url,
    up.bio,
    f.updated_at as friendship_date
  FROM public.friendships f
  JOIN public.user_profiles up ON up.id = CASE 
    WHEN f.user_id = auth.uid() THEN f.friend_id
    ELSE f.user_id
  END
  WHERE (f.user_id = auth.uid() OR f.friend_id = auth.uid())
  AND f.status = 'accepted'
  ORDER BY up.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to search users
CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  is_friend BOOLEAN,
  has_pending_request BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.id,
    up.username,
    up.display_name,
    up.avatar_url,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = up.id)
      OR (f.friend_id = auth.uid() AND f.user_id = up.id))
    ) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'pending'
      AND ((f.user_id = auth.uid() AND f.friend_id = up.id)
      OR (f.friend_id = auth.uid() AND f.user_id = up.id))
    ) as has_pending_request
  FROM public.user_profiles up
  WHERE up.id != auth.uid()
  AND up.is_public = true
  AND (
    up.username ILIKE '%' || search_query || '%'
    OR up.display_name ILIKE '%' || search_query || '%'
  )
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;