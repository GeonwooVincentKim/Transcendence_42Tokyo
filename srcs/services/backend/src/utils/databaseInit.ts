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
        avatar_url TEXT,
        bio TEXT,
        display_name TEXT,
        online_status TEXT DEFAULT 'offline',
        last_seen DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_active BOOLEAN DEFAULT 1
      )
    `);
    console.log('Users table created');

    // Add new columns to existing users table if they don't exist (migration)
    try {
      await DatabaseService.run('SELECT avatar_url FROM users LIMIT 1');
    } catch (error) {
      console.log('Adding avatar_url column to users table...');
      await DatabaseService.run('ALTER TABLE users ADD COLUMN avatar_url TEXT');
    }

    try {
      await DatabaseService.run('SELECT bio FROM users LIMIT 1');
    } catch (error) {
      console.log('Adding bio column to users table...');
      await DatabaseService.run('ALTER TABLE users ADD COLUMN bio TEXT');
    }

    try {
      await DatabaseService.run('SELECT display_name FROM users LIMIT 1');
    } catch (error) {
      console.log('Adding display_name column to users table...');
      await DatabaseService.run('ALTER TABLE users ADD COLUMN display_name TEXT');
    }

    try {
      await DatabaseService.run('SELECT online_status FROM users LIMIT 1');
    } catch (error) {
      console.log('Adding online_status column to users table...');
      await DatabaseService.run('ALTER TABLE users ADD COLUMN online_status TEXT DEFAULT "offline"');
    }

    try {
      await DatabaseService.run('SELECT last_seen FROM users LIMIT 1');
    } catch (error) {
      console.log('Adding last_seen column to users table...');
      await DatabaseService.run('ALTER TABLE users ADD COLUMN last_seen DATETIME');
    }
    
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
    
    // Create tournament system tables
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        max_participants INTEGER NOT NULL DEFAULT 8,
        status TEXT NOT NULL DEFAULT 'registration',
        tournament_type TEXT NOT NULL DEFAULT 'single_elimination',
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME,
        settings TEXT,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Tournaments table created');

    // Check if tournament_type column exists, if not add it (migration)
    try {
      await DatabaseService.run('SELECT tournament_type FROM tournaments LIMIT 1');
    } catch (error) {
      console.log('Adding tournament_type column to existing tournaments table...');
      await DatabaseService.run('ALTER TABLE tournaments ADD COLUMN tournament_type TEXT NOT NULL DEFAULT "single_elimination"');
      console.log('tournament_type column added');
    }

    // Check if settings column exists, if not add it (migration)
    try {
      await DatabaseService.run('SELECT settings FROM tournaments LIMIT 1');
    } catch (error) {
      console.log('Adding settings column to existing tournaments table...');
      await DatabaseService.run('ALTER TABLE tournaments ADD COLUMN settings TEXT');
      console.log('settings column added');
    }

    // Create tournament participants table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        user_id INTEGER,
        guest_alias TEXT,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        eliminated_at DATETIME,
        final_rank INTEGER,
        seed INTEGER,
        is_ready BOOLEAN DEFAULT 0,
        UNIQUE (tournament_id, user_id),
        UNIQUE (tournament_id, guest_alias),
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
        bracket_position INTEGER,
        player1_id INTEGER,
        player2_id INTEGER,
        winner_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        player1_score INTEGER DEFAULT 0,
        player2_score INTEGER DEFAULT 0,
        game_session_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        started_at DATETIME,
        finished_at DATETIME,
        match_data TEXT,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player1_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
        FOREIGN KEY (player2_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
        FOREIGN KEY (winner_id) REFERENCES tournament_participants(id) ON DELETE SET NULL
      )
    `);
    console.log('Tournament matches table created');

    // Create tournament brackets table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS tournament_brackets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tournament_id INTEGER NOT NULL,
        bracket_type TEXT NOT NULL,
        round INTEGER NOT NULL,
        match_id INTEGER NOT NULL,
        position_x INTEGER NOT NULL,
        position_y INTEGER NOT NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (match_id) REFERENCES tournament_matches(id) ON DELETE CASCADE
      )
    `);
    console.log('Tournament brackets table created');

    // Create tournament indexes
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON tournaments(created_by)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments(tournament_type)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_participants_tid ON tournament_participants(tournament_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_matches_tid ON tournament_matches(tournament_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(round)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_tournament_brackets_tid ON tournament_brackets(tournament_id)');
    console.log('Tournament indexes created');

    // Create friends table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        accepted_at DATETIME,
        UNIQUE (user_id, friend_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (user_id != friend_id)
      )
    `);
    console.log('Friends table created');

    // Create blocked users table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS blocked_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        blocked_user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reason TEXT,
        UNIQUE (user_id, blocked_user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE,
        CHECK (user_id != blocked_user_id)
      )
    `);
    console.log('Blocked users table created');

    // Create match history view-friendly structure
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS match_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        opponent_id INTEGER,
        opponent_name TEXT,
        user_score INTEGER NOT NULL,
        opponent_score INTEGER NOT NULL,
        result TEXT NOT NULL,
        game_mode TEXT,
        duration INTEGER,
        played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (opponent_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('Match history table created');

    // Create friends and match history indexes
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_blocked_users_user_id ON blocked_users(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_user_id ON blocked_users(blocked_user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_match_history_opponent_id ON match_history(opponent_id)');
    console.log('Friends and match history indexes created');

    // Create 2FA table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS user_2fa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        secret TEXT NOT NULL,
        enabled BOOLEAN DEFAULT 0,
        backup_codes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        enabled_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('2FA table created');

    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_user_2fa_user_id ON user_2fa(user_id)');
    console.log('2FA indexes created');

    // Create chat channels table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS chat_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'public',
        password_hash TEXT,
        owner_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Chat channels table created');

    // Create channel members table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS channel_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'member',
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        muted_until DATETIME,
        UNIQUE (channel_id, user_id),
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Channel members table created');

    // Create channel messages table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS channel_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        edited_at DATETIME,
        deleted BOOLEAN DEFAULT 0,
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Channel messages table created');

    // Create direct messages table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        deleted_by_sender BOOLEAN DEFAULT 0,
        deleted_by_receiver BOOLEAN DEFAULT 0,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Direct messages table created');

    // Create game invitations table
    await DatabaseService.run(`
      CREATE TABLE IF NOT EXISTS game_invitations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        game_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME,
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('Game invitations table created');

    // Create chat indexes
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_chat_channels_owner ON chat_channels(owner_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON chat_channels(type)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON channel_members(channel_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_channel_members_user ON channel_members(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON channel_messages(channel_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_channel_messages_user ON channel_messages(user_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_direct_messages_receiver ON direct_messages(receiver_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_game_invitations_sender ON game_invitations(sender_id)');
    await DatabaseService.run('CREATE INDEX IF NOT EXISTS idx_game_invitations_receiver ON game_invitations(receiver_id)');
    console.log('Chat indexes created');

    console.log('Database schema initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database schema:', error);
    throw error;
  }
}


