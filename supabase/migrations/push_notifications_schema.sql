-- Push Notifications Schema for Stackr
-- This schema handles push notification subscriptions and delivery

-- Table for storing push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    device_type TEXT, -- 'mobile', 'desktop', 'tablet'
    browser TEXT, -- 'chrome', 'firefox', 'safari', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one subscription per device per user
    UNIQUE(user_id, endpoint)
);

-- Table for notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Notification types
    friend_recommendations BOOLEAN DEFAULT true,
    friend_activities BOOLEAN DEFAULT true,
    trending_content BOOLEAN DEFAULT true,
    completion_reminders BOOLEAN DEFAULT true,
    new_features BOOLEAN DEFAULT true,
    
    -- Timing preferences
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'UTC',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking sent notifications (for analytics and preventing duplicates)
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES push_subscriptions(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type TEXT NOT NULL, -- 'friend_recommendation', 'friend_activity', etc.
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB, -- Additional data like media_id, friend_id, etc.
    
    -- Delivery tracking
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivery_status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'failed', 'clicked'
    error_message TEXT,
    
    -- Reference data
    related_user_id UUID REFERENCES auth.users(id), -- Friend who triggered the notification
    related_media_id TEXT, -- Media that triggered the notification
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- RLS (Row Level Security) Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Push subscriptions policies
CREATE POLICY "Users can manage their own push subscriptions" ON push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Notification preferences policies
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Notification logs policies (users can only see their own)
CREATE POLICY "Users can see their own notification logs" ON notification_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_notification_preferences_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notification preferences when a user signs up
CREATE OR REPLACE TRIGGER create_notification_preferences_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_notification_preferences_for_user();

-- Function to clean up old notification logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active subscriptions for a user
CREATE OR REPLACE FUNCTION get_user_push_subscriptions(target_user_id UUID)
RETURNS TABLE (
    subscription_id UUID,
    endpoint TEXT,
    p256dh TEXT,
    auth TEXT,
    device_type TEXT,
    browser TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.id,
        ps.endpoint,
        ps.p256dh,
        ps.auth,
        ps.device_type,
        ps.browser
    FROM push_subscriptions ps
    WHERE ps.user_id = target_user_id 
    AND ps.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user wants notifications of a specific type
CREATE OR REPLACE FUNCTION should_send_notification(
    target_user_id UUID,
    notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    should_send BOOLEAN := false;
    prefs RECORD;
BEGIN
    SELECT * INTO prefs FROM notification_preferences WHERE user_id = target_user_id;
    
    IF prefs IS NULL THEN
        RETURN true; -- Default to sending if no preferences set
    END IF;
    
    CASE notification_type
        WHEN 'friend_recommendation' THEN should_send := prefs.friend_recommendations;
        WHEN 'friend_activity' THEN should_send := prefs.friend_activities;
        WHEN 'trending_content' THEN should_send := prefs.trending_content;
        WHEN 'completion_reminder' THEN should_send := prefs.completion_reminders;
        WHEN 'new_feature' THEN should_send := prefs.new_features;
        ELSE should_send := true;
    END CASE;
    
    RETURN should_send;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;