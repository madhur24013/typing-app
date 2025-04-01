# TypeShala Analytics and Experimentation System

This document provides a comprehensive overview of the analytics and experimentation system in TypeShala, designed to measure user engagement with the streak feature and optimize the reward structure through A/B testing.

## Overview

The analytics and experimentation system in TypeShala serves two primary purposes:

1. **Measurement**: Track key metrics related to user engagement, retention, and streak performance
2. **Optimization**: Test different reward structures to identify the most effective approach for maintaining user streaks

## Analytics System

### Key Components

- **Event Tracking**: Records user interactions with streak features
- **Metrics Collection**: Aggregates data to measure the impact of streaks on retention
- **Visualization**: Admin dashboard for monitoring streak effectiveness
- **Error Handling**: Robust error handling to ensure data integrity

### Event Types

The system tracks the following events:

| Event Type | Description |
|------------|-------------|
| `streak_viewed` | User views their streak status |
| `milestone_modal_opened` | User opens milestone details |
| `reward_claimed` | User claims a streak milestone reward |
| `streak_freeze_purchased` | User purchases a streak freeze |
| `streak_freeze_used` | System uses a streak freeze to maintain user's streak |
| `streak_reset` | User's streak is reset after missing practice |
| `navigate_to_progress` | User navigates to full progress view |

### Metrics Collected

- **Active Users**: Number of users with active streaks
- **Retention Impact**: Comparison of activity between users with and without streaks
- **Reward Effectiveness**: Which rewards lead to higher engagement
- **A/B Test Results**: Comparative performance of different reward structures

## Experimentation System

The experimentation system enables testing different reward structures to determine which is most effective at maintaining user engagement.

### Current Experiments

#### Streak Rewards Test

This experiment compares three different reward structures:

1. **Control**: Standard milestone rewards at conventional intervals
2. **Variant A (Variable Rewards)**: More frequent rewards with progressive value
3. **Variant B (Surprise Rewards)**: Standard rewards plus random surprise bonuses

### User Assignment

Users are randomly assigned to experiment variants when they first interact with the streak system. Assignment is persistent to ensure consistent user experience.

### Results Measurement

For each variant, the system measures:

- Average streak length
- Weekly retention rate (% of users who return within 7 days)
- Average sessions per week
- Distribution of streak lengths

## Implementation Details

### Database Structure

The system utilizes the following database tables:

- `analytics_events`: Stores all tracked events
- `experiments`: Defines available experiments and their variants
- `user_experiments`: Tracks which users are assigned to which experiments
- `streak_experiment_rewards`: Defines rewards for each experiment variant
- `api_errors`: Logs errors in analytics API calls

### API Endpoints

#### Analytics Endpoints

- `POST /api/analytics/track-event`: Records a user interaction event
- `GET /api/analytics/streak-metrics`: Retrieves aggregated metrics (admin only)
- `GET /api/analytics/experiment-variant`: Gets a user's assigned experiment variant

#### Experiment Endpoints

- `GET /api/experiments/all`: Lists all experiments (admin only)
- `POST /api/experiments/create`: Creates a new experiment (admin only)
- `PUT /api/experiments/:id`: Updates an experiment (admin only)
- `POST /api/experiments/:id/toggle`: Activates or deactivates an experiment (admin only)
- `GET /api/experiments/:id/results`: Gets experiment results (admin only)
- `GET /api/experiments/rewards/:experiment/:variant`: Gets rewards for a specific variant

### Error Handling

The system uses a centralized error handling approach:

1. **Graceful Degradation**: Analytics failures don't interrupt core functionality
2. **Error Logging**: All errors are logged to the database for later analysis
3. **Automatic Retries**: Critical operations use automatic retry mechanisms

## Admin Dashboard

The admin dashboard provides visualization tools for analyzing the effectiveness of the streak system:

- **Streak Metrics**: Overview of streak engagement metrics
- **A/B Test Results**: Comparison of different reward structures
- **Experiment Management**: Interface for creating and managing experiments

## Best Practices

When working with the analytics and experimentation system:

1. **Use Safe Analytics Calls**: Wrap analytics calls in the `safeAnalyticsCall` utility to prevent failures from affecting core functionality
2. **Validate Experiment Data**: Always check if experiment data exists before using it
3. **Provide Fallbacks**: Include fallback behavior for when analytics or experiment data is unavailable
4. **Monitor Performance**: Regularly check the admin dashboard to identify trends
5. **Document Experiments**: Keep detailed notes on experiment hypotheses and results

## Migration

When deploying these features to production, use the provided migration script:

```bash
node backend/src/database/migrations/streak_abtest_migration.js
```

This script creates all necessary database tables and initializes default experiment variants.

## Additional Resources

- For detailed API documentation, see `docs/api_reference.md`
- For frontend component documentation, see `docs/ui_components.md`
- For database schema details, see `docs/database_schema.md` 