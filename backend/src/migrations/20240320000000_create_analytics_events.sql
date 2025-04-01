-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_action CHECK (action ~ '^[a-zA-Z0-9_]+$')
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_action ON analytics_events(action);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);

-- Create view for aggregated analytics
CREATE OR REPLACE VIEW user_analytics AS
SELECT 
    user_id,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE action = 'typing_session_complete') as completed_sessions,
    COUNT(*) FILTER (WHERE action = 'streak_achieved') as streak_achievements,
    COUNT(*) FILTER (WHERE action = 'milestone_reached') as milestones_reached,
    COUNT(*) FILTER (WHERE action = 'reward_claimed') as rewards_claimed,
    MAX(created_at) as last_activity
FROM analytics_events
GROUP BY user_id;

-- Create function to clean up old analytics data
CREATE OR REPLACE FUNCTION cleanup_old_analytics()
RETURNS void AS $$
BEGIN
    DELETE FROM analytics_events
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to clean up old analytics data
SELECT cron.schedule('0 0 * * *', $$SELECT cleanup_old_analytics()$$); 