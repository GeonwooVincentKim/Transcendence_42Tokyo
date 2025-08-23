-- Pong Game Database Initialization Script for SQLite
-- Creates tables for user management and game data

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

-- Create unique constraints only for active users
-- SQLite doesn't support partial indexes like PostgreSQL, so we'll use triggers
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_active ON users(username) WHERE is_active = 1;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_active ON users(email) WHERE is_active = 1;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create game sessions table
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT UNIQUE NOT NULL,
    game_type TEXT NOT NULL DEFAULT 'single', -- 'single', 'multiplayer', 'ai'
    status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'active', 'finished'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME,
    finished_at DATETIME
);

-- Create game results table
CREATE TABLE IF NOT EXISTS game_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER,
    player_id INTEGER,
    player_side TEXT NOT NULL, -- 'left', 'right'
    score INTEGER NOT NULL DEFAULT 0,
    won BOOLEAN,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create user statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    total_games INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    highest_score INTEGER DEFAULT 0,
    average_score REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_game_results_session_id ON game_results(session_id);
CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id);

-- Create trigger to update updated_at timestamp for users table
CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to update updated_at timestamp for user_statistics table
CREATE TRIGGER IF NOT EXISTS update_user_statistics_updated_at 
    AFTER UPDATE ON user_statistics
    FOR EACH ROW
BEGIN
    UPDATE user_statistics SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create trigger to enforce unique username for active users
CREATE TRIGGER IF NOT EXISTS enforce_unique_username_active
    BEFORE INSERT ON users
    FOR EACH ROW
    WHEN NEW.is_active = 1
BEGIN
    SELECT CASE 
        WHEN EXISTS(SELECT 1 FROM users WHERE username = NEW.username AND is_active = 1)
        THEN RAISE(ABORT, 'Username already exists for active user')
    END;
END;

-- Create trigger to enforce unique email for active users
CREATE TRIGGER IF NOT EXISTS enforce_unique_email_active
    BEFORE INSERT ON users
    FOR EACH ROW
    WHEN NEW.is_active = 1
BEGIN
    SELECT CASE 
        WHEN EXISTS(SELECT 1 FROM users WHERE email = NEW.email AND is_active = 1)
        THEN RAISE(ABORT, 'Email already exists for active user')
    END;
END;

-- Create function to calculate user statistics (SQLite doesn't have stored procedures like PostgreSQL)
-- This will be handled in the application code instead 