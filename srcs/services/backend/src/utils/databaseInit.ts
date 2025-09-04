/**
 * Database Initialization Utility
 * 
 * Handles the initialization of the SQLite database with the schema
 */

import { DatabaseService } from '../services/databaseService';

/**
 * Initialize the database with the schema
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('Creating database tables...');
    console.log('Starting database initialization...');
    
    // Create users table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )
    `);
    console.log('Users table created');
    
    // Create password reset tokens table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Password reset tokens table created');
    
    // Create game sessions table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS game_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT UNIQUE NOT NULL,
        game_type TEXT NOT NULL DEFAULT 'single',
        status TEXT NOT NULL DEFAULT 'waiting',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME
      )
    `);
    console.log('Game sessions table created');
    
    // Create game results table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS game_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        player_id INTEGER,
        player_side TEXT NOT NULL,
        score INTEGER NOT NULL DEFAULT 0,
        won BOOLEAN,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Game results table created');
    
    // Create user statistics table
    await DatabaseService.run(`
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
      )
    `);
    console.log('User statistics table created');
    
    // Create indexes
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_game_sessions_room_id ON game_sessions(room_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_game_results_session_id ON game_results(session_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_game_results_player_id ON game_results(player_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_user_statistics_user_id ON user_statistics(user_id)');
    console.log('Indexes created');
    
    // Create tournaments table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        max_participants INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'registration',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Tournaments table created');

    // Create tournament participants table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        eliminated_at DATETIME,
        final_rank INTEGER,
        UNIQUE (tournament_id, user_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Tournament participants table created');

    // Create tournament matches table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS tournament_matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        round INTEGER NOT NULL,
        match_number INTEGER NOT NULL,
        player1_id INTEGER,
        player2_id INTEGER,
        winner_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (winner_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Tournament matches table created');

    // Create tournament indexes
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_participants_tid ON tournament_participants(tournament_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_matches_tid ON tournament_matches(tournament_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(round)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status)');
    console.log('Tournament indexes created');

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}


