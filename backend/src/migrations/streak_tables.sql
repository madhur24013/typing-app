-- Create user streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily activity logs table
CREATE TABLE IF NOT EXISTS daily_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    activity_date DATE NOT NULL,
    activity_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, activity_date)
);

-- Create streak battles table
CREATE TABLE IF NOT EXISTS streak_battles (
    id SERIAL PRIMARY KEY,
    challenger_id INTEGER REFERENCES users(id),
    opponent_id INTEGER REFERENCES users(id),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    winner_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team streaks table
CREATE TABLE IF NOT EXISTS team_streaks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    leader_id INTEGER REFERENCES users(id),
    max_members INTEGER DEFAULT 5,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create team members table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES team_streaks(id),
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Create streak rewards table
CREATE TABLE IF NOT EXISTS streak_rewards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    required_streak INTEGER NOT NULL,
    reward_type VARCHAR(50) NOT NULL,
    reward_value INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user rewards table
CREATE TABLE IF NOT EXISTS user_rewards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    reward_id INTEGER REFERENCES streak_rewards(id),
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, reward_id)
);

-- Create streak freezes table
CREATE TABLE IF NOT EXISTS streak_freezes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    duration_days INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

-- Create streak milestones table
CREATE TABLE IF NOT EXISTS streak_milestones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    milestone_type VARCHAR(50) NOT NULL,
    achieved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_activity_logs_user_date ON daily_activity_logs(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_streak_battles_users ON streak_battles(challenger_id, opponent_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_streak_freezes_user ON streak_freezes(user_id);

-- Insert default streak rewards
INSERT INTO streak_rewards (name, description, required_streak, reward_type, reward_value)
VALUES 
    ('First Streak', 'Achieve your first 3-day streak', 3, 'badge', 1),
    ('Week Warrior', 'Maintain a 7-day streak', 7, 'badge', 2),
    ('Monthly Master', 'Achieve a 30-day streak', 30, 'badge', 3),
    ('Streak Freeze', 'Get a 1-day streak freeze', 5, 'streak_freeze', 1),
    ('Double Freeze', 'Get a 2-day streak freeze', 10, 'streak_freeze', 2),
    ('Weekly Freeze', 'Get a 7-day streak freeze', 30, 'streak_freeze', 7)
ON CONFLICT DO NOTHING; 