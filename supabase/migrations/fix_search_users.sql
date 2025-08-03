-- Améliorer la fonction de recherche pour inclure la recherche par email
-- et permettre de trouver les utilisateurs même s'ils n'ont pas de profil

CREATE OR REPLACE FUNCTION public.search_users(search_query TEXT)
RETURNS TABLE (
  id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  is_friend BOOLEAN,
  has_pending_request BOOLEAN,
  has_profile BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(up.id, au.id) as id,
    COALESCE(up.username, SPLIT_PART(au.email, '@', 1)) as username,
    COALESCE(up.display_name, SPLIT_PART(au.email, '@', 1)) as display_name,
    up.avatar_url,
    au.email,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'accepted'
      AND ((f.user_id = auth.uid() AND f.friend_id = COALESCE(up.id, au.id))
      OR (f.friend_id = auth.uid() AND f.user_id = COALESCE(up.id, au.id)))
    ) as is_friend,
    EXISTS (
      SELECT 1 FROM public.friendships f
      WHERE f.status = 'pending'
      AND ((f.user_id = auth.uid() AND f.friend_id = COALESCE(up.id, au.id))
      OR (f.friend_id = auth.uid() AND f.user_id = COALESCE(up.id, au.id)))
    ) as has_pending_request,
    (up.id IS NOT NULL) as has_profile
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON au.id = up.id
  WHERE au.id != auth.uid()
  AND (up.is_public = true OR up.id IS NULL)
  AND (
    au.email ILIKE '%' || search_query || '%'
    OR up.username ILIKE '%' || search_query || '%'
    OR up.display_name ILIKE '%' || search_query || '%'
    OR SPLIT_PART(au.email, '@', 1) ILIKE '%' || search_query || '%'
  )
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mettre à jour la fonction send_friend_request pour supporter la recherche par email
CREATE OR REPLACE FUNCTION public.send_friend_request_by_email(friend_email TEXT)
RETURNS UUID AS $$
DECLARE
  friend_uuid UUID;
  request_id UUID;
BEGIN
  -- Get friend's UUID from email
  SELECT id INTO friend_uuid FROM auth.users WHERE email = friend_email;
  
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