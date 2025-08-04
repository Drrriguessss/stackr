-- Fix friend request functions to handle proper data types

-- Drop existing functions first
DROP FUNCTION IF EXISTS send_friend_request(text);
DROP FUNCTION IF EXISTS send_friend_request_by_email(text);

-- Create send_friend_request function
CREATE OR REPLACE FUNCTION send_friend_request(friend_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friend_user_id uuid;
    current_user_id uuid;
    request_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Find friend by username
    SELECT id INTO friend_user_id
    FROM user_profiles
    WHERE username = friend_username;
    
    IF friend_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF friend_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as friend';
    END IF;
    
    -- Check if friendship already exists
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE (user_id = current_user_id AND friend_id = friend_user_id)
           OR (user_id = friend_user_id AND friend_id = current_user_id)
    ) THEN
        RAISE EXCEPTION 'Friendship already exists';
    END IF;
    
    -- Create friend request
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (current_user_id, friend_user_id, 'pending')
    RETURNING id INTO request_id;
    
    -- Create notification for the recipient
    INSERT INTO notifications (
        user_id, 
        type, 
        from_user_id, 
        related_id, 
        message, 
        read
    ) VALUES (
        friend_user_id,
        'friend_request',
        current_user_id,
        request_id,
        'sent you a friend request',
        false
    );
    
    RETURN request_id::text;
END;
$$;

-- Create send_friend_request_by_email function
CREATE OR REPLACE FUNCTION send_friend_request_by_email(friend_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    friend_user_id uuid;
    current_user_id uuid;
    request_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Find friend by email
    SELECT id INTO friend_user_id
    FROM auth.users
    WHERE email = friend_email;
    
    IF friend_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    IF friend_user_id = current_user_id THEN
        RAISE EXCEPTION 'Cannot add yourself as friend';
    END IF;
    
    -- Check if friendship already exists
    IF EXISTS (
        SELECT 1 FROM friendships 
        WHERE (user_id = current_user_id AND friend_id = friend_user_id)
           OR (user_id = friend_user_id AND friend_id = current_user_id)
    ) THEN
        RAISE EXCEPTION 'Friendship already exists';
    END IF;
    
    -- Create friend request
    INSERT INTO friendships (user_id, friend_id, status)
    VALUES (current_user_id, friend_user_id, 'pending')
    RETURNING id INTO request_id;
    
    -- Create notification for the recipient
    INSERT INTO notifications (
        user_id, 
        type, 
        from_user_id, 
        related_id, 
        message, 
        read
    ) VALUES (
        friend_user_id,
        'friend_request',
        current_user_id,
        request_id,
        'sent you a friend request',
        false
    );
    
    RETURN request_id::text;
END;
$$;