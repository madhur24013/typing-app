# Streak System Documentation

## Overview

The streak system is a gamification feature designed to increase user engagement and retention by encouraging consistent daily practice. It implements various psychological mechanisms and social features to create an engaging user experience.

## Core Features

### 1. Streak Tracking
- Daily streak counting
- Streak milestones and achievements
- Streak recovery system
- Streak freeze functionality

### 2. Social Features
- Streak battles between users
- Team streaks
- Leaderboards
- Social sharing

### 3. Rewards System
- Milestone rewards
- Daily rewards
- Streak freeze rewards
- Battle rewards

## Technical Architecture

### Frontend Components

#### AnimatedStreakCounter
```jsx
<AnimatedStreakCounter
  streak={currentStreak}
  showLabel={true}
  size="medium"
  pulseOnMount={true}
  showRank={true}
  danger={isInDanger}
  hoursRemaining={hoursLeft}
/>
```

#### StreakBattles
```jsx
<StreakBattles
  className="custom-class"
  onBattleCreated={handleBattleCreated}
  onBattleEnded={handleBattleEnded}
/>
```

### Backend Models

#### User Streaks
```sql
CREATE TABLE user_streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Streak Battles
```sql
CREATE TABLE streak_battles (
  id SERIAL PRIMARY KEY,
  challenger_id INTEGER REFERENCES users(id),
  opponent_id INTEGER REFERENCES users(id),
  status VARCHAR(20),
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

### Streak Management
```
GET /api/streaks
- Get user's current streak information
- Response: { currentStreak, longestStreak, lastActivity }

POST /api/streaks/activity
- Record daily activity
- Response: { success: true, newStreak: number }

GET /api/streaks/danger
- Check if streak is in danger
- Response: { inDanger: boolean, hoursRemaining: number }
```

### Streak Battles
```
GET /api/streaks/battles
- Get active and pending battles
- Response: { activeBattles: [], pendingBattles: [] }

POST /api/streaks/battles
- Create new battle
- Request: { opponentId: number, duration: number }
- Response: { battleId: number }

PUT /api/streaks/battles/:id
- Respond to battle challenge
- Request: { accepted: boolean }
- Response: { success: true }
```

### Rewards
```
GET /api/streaks/rewards
- Get available rewards
- Response: { rewards: [] }

POST /api/streaks/rewards/:id/claim
- Claim a reward
- Response: { success: true, reward: object }
```

## Psychological Mechanisms

### 1. Loss Aversion
- Streak danger notifications
- Recovery challenges
- Streak freeze rewards

### 2. Social Proof
- Leaderboards
- Team streaks
- Battle statistics

### 3. Variable Rewards
- Random daily rewards
- Surprise milestones
- Battle rewards

### 4. Progress Tracking
- Visual progress indicators
- Milestone celebrations
- Achievement badges

## Error Handling

### Frontend Error Handling
```javascript
// Example of error boundary implementation
<ErrorBoundary
  onRetry={handleRetry}
  errorMessage="Failed to load streak data"
>
  <StreakComponent />
</ErrorBoundary>
```

### Backend Error Handling
```javascript
// Example of API error handling
const handleStreakError = (error) => {
  logError('Streak Error:', error);
  
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Duplicate streak activity'
    });
  }
  
  return res.status(500).json({
    error: 'Internal server error'
  });
};
```

## Performance Optimization

### Caching Strategy
```javascript
// Example of Redis caching
const getStreakData = async (userId) => {
  const cacheKey = `streak:${userId}`;
  const cachedData = await redis.get(cacheKey);
  
  if (cachedData) {
    return JSON.parse(cachedData);
  }
  
  const data = await fetchStreakFromDB(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(data));
  return data;
};
```

### Database Optimization
```sql
-- Example of optimized indexes
CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX idx_streak_battles_status ON streak_battles(status);
CREATE INDEX idx_streak_milestones_user_id ON streak_milestones(user_id);
```

## Testing

### Unit Tests
```javascript
// Example of streak counter test
describe('AnimatedStreakCounter', () => {
  it('renders streak count correctly', () => {
    render(<AnimatedStreakCounter streak={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });
  
  it('shows danger state when appropriate', () => {
    render(<AnimatedStreakCounter streak={5} danger={true} />);
    expect(screen.getByTestId('danger-indicator')).toBeInTheDocument();
  });
});
```

### Integration Tests
```javascript
// Example of streak battle test
describe('StreakBattles', () => {
  it('creates new battle successfully', async () => {
    const { result } = renderHook(() => useStreakBattles());
    
    await act(async () => {
      await result.current.createBattle(opponentId);
    });
    
    expect(result.current.activeBattles).toHaveLength(1);
  });
});
```

## Deployment

### Environment Variables
```env
# Required environment variables
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:password@localhost:5432/db
NODE_ENV=production
```

### Deployment Checklist
1. Run database migrations
2. Set up Redis caching
3. Configure error monitoring
4. Set up performance monitoring
5. Configure rate limiting
6. Enable SSL/TLS
7. Set up backup strategy

## Monitoring and Analytics

### Key Metrics
- Daily active users
- Average streak length
- Battle participation rate
- Reward claim rate
- Error rate
- API response time

### Monitoring Tools
- Frontend: React DevTools, Lighthouse
- Backend: New Relic, DataDog
- Database: pg_stat_statements
- Caching: Redis Commander

## Security Considerations

### Authentication
- JWT-based authentication
- Token refresh mechanism
- Rate limiting
- Input validation

### Data Protection
- Encrypted sensitive data
- Regular security audits
- GDPR compliance
- Data backup strategy

## Contributing

### Development Setup
1. Clone repository
2. Install dependencies
3. Set up environment variables
4. Run database migrations
5. Start development server

### Code Style
- Follow ESLint configuration
- Use Prettier for formatting
- Write unit tests for new features
- Update documentation

### Pull Request Process
1. Create feature branch
2. Write tests
3. Update documentation
4. Submit PR
5. Address review comments
6. Merge after approval

## License

This project is licensed under the MIT License - see the LICENSE file for details. 