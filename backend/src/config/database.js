const sqlite3 = require('sqlite3').verbose();
const config = require('./config');
const path = require('path');

// Create a database connection
const db = new sqlite3.Database(path.resolve(config.databasePath), (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the SQLite database');
    createTables();
  }
});

// Create necessary tables if they don't exist
function createTables() {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
    if (err) {
      console.error('Error creating users table:', err.message);
    } else {
      console.log('Users table ready');
    }
  });

  // Typing sessions table
  db.run(`CREATE TABLE IF NOT EXISTS typing_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    wpm REAL,
    accuracy REAL,
    duration INTEGER,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating typing_sessions table:', err.message);
    } else {
      console.log('Typing sessions table ready');
    }
  });

  // Uploaded documents table
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    content TEXT,
    page_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating documents table:', err.message);
    } else {
      console.log('Documents table ready');
    }
  });

  // Error tracking table
  db.run(`CREATE TABLE IF NOT EXISTS typing_errors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    error_content TEXT NOT NULL,
    expected_content TEXT NOT NULL,
    position INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES typing_sessions (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating typing_errors table:', err.message);
    } else {
      console.log('Typing errors table ready');
    }
  });
  
  // User progress table for tracking user achievements, points, and badges
  db.run(`CREATE TABLE IF NOT EXISTS user_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    total_words_typed INTEGER DEFAULT 0,
    total_characters_typed INTEGER DEFAULT 0,
    total_time_practiced INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_practice_date TEXT,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`, (err) => {
    if (err) {
      console.error('Error creating user_progress table:', err.message);
    } else {
      console.log('User progress table ready');
    }
  });
  
  // Badges table for tracking achievements
  db.run(`CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    criteria TEXT NOT NULL,
    icon_path TEXT
  )`, (err) => {
    if (err) {
      console.error('Error creating badges table:', err.message);
    } else {
      console.log('Badges table ready');
      // Insert default badges
      insertDefaultBadges();
    }
  });
  
  // User badges table (many-to-many relationship between users and badges)
  db.run(`CREATE TABLE IF NOT EXISTS user_badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    badge_id INTEGER,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (badge_id) REFERENCES badges (id),
    UNIQUE(user_id, badge_id)
  )`, (err) => {
    if (err) {
      console.error('Error creating user_badges table:', err.message);
    } else {
      console.log('User badges table ready');
    }
  });
}

// Insert default badges into the badges table
function insertDefaultBadges() {
  const defaultBadges = [
    {
      name: 'First Steps',
      description: 'Complete your first typing session',
      criteria: 'sessions_completed >= 1'
    },
    {
      name: 'Speed Demon',
      description: 'Achieve 60+ WPM in a typing session',
      criteria: 'max_wpm >= 60'
    },
    {
      name: 'Accuracy Master',
      description: 'Complete a session with 98%+ accuracy',
      criteria: 'max_accuracy >= 0.98'
    },
    {
      name: 'Marathon Typer',
      description: 'Type for a total of 60+ minutes',
      criteria: 'total_time_practiced >= 3600'
    },
    {
      name: 'Wordsmith',
      description: 'Type a total of 10,000+ words',
      criteria: 'total_words_typed >= 10000'
    },
    {
      name: 'Persistence',
      description: 'Practice typing for 7 days in a row',
      criteria: 'streak_days >= 7'
    }
  ];
  
  // Check if badges already exist before inserting
  db.get('SELECT COUNT(*) as count FROM badges', [], (err, result) => {
    if (err) {
      console.error('Error checking badges count:', err.message);
      return;
    }
    
    if (result.count > 0) {
      console.log('Badges already exist, skipping insertion');
      return;
    }
    
    // Insert default badges
    const insertBadge = db.prepare('INSERT INTO badges (name, description, criteria) VALUES (?, ?, ?)');
    
    defaultBadges.forEach(badge => {
      insertBadge.run([badge.name, badge.description, badge.criteria], err => {
        if (err) {
          console.error(`Error inserting badge ${badge.name}:`, err.message);
        }
      });
    });
    
    insertBadge.finalize();
    console.log('Default badges inserted');
  });
}

module.exports = db; 