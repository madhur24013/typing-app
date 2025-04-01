/**
 * Database migration for streak A/B testing and analytics
 * This migration script adds all necessary tables for the streak system analytics and experimentation
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const runMigration = async () => {
  let connection;
  
  try {
    console.log('Starting streak system A/B testing migration...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'typeshala',
      multipleStatements: true
    });
    
    console.log('Connected to database');
    
    // Create analytics_events table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSON,
        timestamp DATETIME NOT NULL,
        INDEX idx_user_id (user_id),
        INDEX idx_event_type (event_type),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log('Created analytics_events table');
    
    // Create experiments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        feature VARCHAR(50) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        description TEXT,
        status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
        start_date DATETIME,
        end_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_experiment_variant (name, variant)
      )
    `);
    console.log('Created experiments table');
    
    // Create user_experiments table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_experiments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        experiment_id INT NOT NULL,
        variant VARCHAR(50) NOT NULL,
        assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY idx_user_experiment (user_id, experiment_id)
      )
    `);
    console.log('Created user_experiments table');
    
    // Create streak_experiment_rewards table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS streak_experiment_rewards (
        id INT AUTO_INCREMENT PRIMARY KEY,
        experiment_name VARCHAR(100) NOT NULL,
        variant VARCHAR(50) NOT NULL,
        milestone INT NOT NULL,
        reward_type VARCHAR(50) NOT NULL,
        reward_value VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE KEY variant_milestone (variant, milestone)
      )
    `);
    console.log('Created streak_experiment_rewards table');
    
    // Add an index to improve streak queries
    await connection.execute(`
      ALTER TABLE user_streaks 
      ADD INDEX idx_current_streak (currentStreak)
    `);
    console.log('Added index to user_streaks');
    
    // Create user_bonuses table for temporary bonuses
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS user_bonuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bonus_type VARCHAR(50) NOT NULL,
        bonus_value VARCHAR(50) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        is_used BOOLEAN DEFAULT FALSE,
        INDEX idx_user_id (user_id),
        INDEX idx_expires_at (expires_at)
      )
    `);
    console.log('Created user_bonuses table');
    
    // Insert initial experiment (streak rewards test)
    await connection.execute(`
      INSERT IGNORE INTO experiments (name, feature, variant, description, status)
      VALUES 
        ('streak_rewards', 'streaks', 'control', 'Standard streak rewards', 'draft'),
        ('streak_rewards', 'streaks', 'variant_a', 'Variable streak rewards with more milestones', 'draft'),
        ('streak_rewards', 'streaks', 'variant_b', 'Surprise streak rewards with random bonuses', 'draft')
    `);
    console.log('Inserted initial experiment variants');
    
    // Create new columns in user_streaks table to track experiment metrics
    await connection.execute(`
      ALTER TABLE user_streaks 
      ADD COLUMN IF NOT EXISTS streak_resets INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS max_consecutive_days INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS experiment_variant VARCHAR(50)
    `);
    console.log('Added tracking columns to user_streaks');
    
    // Create error handler table for analytics API calls
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS api_errors (
        id INT AUTO_INCREMENT PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        error_message TEXT,
        request_data JSON,
        user_id INT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_endpoint (endpoint),
        INDEX idx_timestamp (timestamp)
      )
    `);
    console.log('Created api_errors table');
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('Database connection closed');
    }
  }
};

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Streak A/B testing migration completed!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Migration failed with error:', err);
      process.exit(1);
    });
}

module.exports = { runMigration }; 