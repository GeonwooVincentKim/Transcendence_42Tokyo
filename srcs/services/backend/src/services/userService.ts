/**
 * User Service
 * 
 * Handles user data management, password hashing, and user validation.
 * Uses PostgreSQL database for persistent storage.
 */

import bcrypt from 'bcryptjs';
import { DatabaseService } from './databaseService';
import { User, UserWithoutPassword } from '../types/auth';

/**
 * User Service Class
 * Provides methods for user management and authentication
 */
export class UserService {
  /**
   * Register a new user
   * @param username - User's chosen username
   * @param email - User's email address
   * @param password - User's password (will be hashed)
   * @returns Promise<UserWithoutPassword> - User data without password
   */
  static async registerUser(username: string, email: string, password: string): Promise<UserWithoutPassword> {
    // Check if username or email already exists (only active users)
    const existingUser = await DatabaseService.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND is_active = true',
      [username, email]
    );
    
    if (existingUser.length > 0) {
      throw new Error('Username or email already exists');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    await DatabaseService.run(
      `INSERT INTO users (username, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [username, email, hashedPassword]
    );

    // Get the newly created user
    const result = await DatabaseService.query(
      `SELECT id, username, email, created_at, updated_at 
       FROM users 
       WHERE username = $1 AND email = $2`,
      [username, email]
    );

    const newUser = result[0];
    
    // Create initial user statistics
    await DatabaseService.run(
      'INSERT INTO user_statistics (user_id) VALUES ($1)',
      [newUser.id]
    );

    return {
      id: newUser.id.toString(),
      username: newUser.username,
      email: newUser.email,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at
    };
  }

  /**
   * Authenticate a user with username and password
   * @param username - User's username
   * @param password - User's password
   * @returns Promise<UserWithoutPassword> - User data without password
   */
  static async authenticateUser(username: string, password: string): Promise<UserWithoutPassword> {
    // Find user by username
    const result = await DatabaseService.query(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1 AND is_active = true',
      [username]
    );
    
    if (result.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = result[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login
    await DatabaseService.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Get user by ID
   * @param userId - User's unique ID
   * @returns Promise<UserWithoutPassword | null> - User data without password
   */
  static async getUserById(userId: string): Promise<UserWithoutPassword | null> {
    const result = await DatabaseService.query(
      'SELECT id, username, email, created_at, updated_at, last_login FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (result.length === 0) {
      return null;
    }

    const user = result[0];
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Find username by email (for username recovery)
   * @param email - User's email address
   * @returns Promise<string | null> - Username if found, null otherwise
   */
  static async findUsernameByEmail(email: string): Promise<string | null> {
    const result = await DatabaseService.query(
      'SELECT username FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    return result.length > 0 ? result[0].username : null;
  }

  /**
   * Generate password reset token
   * @param email - User's email address
   * @returns Promise<string> - Reset token
   */
  static async generatePasswordResetToken(email: string): Promise<string> {
    // Find user by email
    const userResult = await DatabaseService.query(
      'SELECT id FROM users WHERE email = $1 AND is_active = true',
      [email]
    );

    if (userResult.length === 0) {
      throw new Error('User not found');
    }

    const userId = userResult[0].id;
    const resetToken = Math.random().toString(36).substr(2, 15);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

    // Store reset token
    await DatabaseService.run(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, resetToken, expiresAt.toISOString()]
    );

    return resetToken;
  }

  /**
   * Reset password using reset token
   * @param resetToken - Password reset token
   * @param newPassword - New password
   * @returns Promise<UserWithoutPassword> - Updated user data
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<UserWithoutPassword> {
    // Find reset token
    const tokenResult = await DatabaseService.query(
      'SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1 AND used_at IS NULL',
      [resetToken]
    );

    if (tokenResult.length === 0) {
      throw new Error('Invalid reset token');
    }

    const tokenData = tokenResult[0];

    if (new Date() > tokenData.expires_at) {
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password and mark token as used
    await DatabaseService.transaction([
      {
        sql: 'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        params: [hashedPassword, tokenData.user_id]
      },
      {
        sql: 'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
        params: [resetToken]
      }
    ]);

    // Get updated user data
    const userResult = await DatabaseService.query(
      'SELECT id, username, email, created_at, updated_at FROM users WHERE id = $1',
      [tokenData.user_id]
    );

    const user = userResult[0];
    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    };
  }

  /**
   * Update user activity (last login)
   * @param userId - User's unique ID
   */
  static async updateUserActivity(userId: string): Promise<void> {
    await DatabaseService.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [userId]
    );
  }

  /**
   * Get all users (for admin purposes)
   * @returns Promise<UserWithoutPassword[]> - Array of users without passwords
   */
  static async getAllUsers(): Promise<UserWithoutPassword[]> {
    const result = await DatabaseService.query(
      'SELECT id, username, email, created_at, updated_at, last_login FROM users WHERE is_active = true ORDER BY created_at DESC'
    );

    return result.map((user: any) => ({
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }));
  }

  /**
   * Delete user account
   * @param userId - User's unique ID
   * @returns Promise<boolean> - True if user was deleted successfully
   */
  static async deleteUser(userId: string): Promise<boolean> {
    await DatabaseService.run(
      'UPDATE users SET is_active = false WHERE id = $1',
      [userId]
    );

    // Check if user was actually updated
    const result = await DatabaseService.query(
      'SELECT id FROM users WHERE id = $1 AND is_active = false',
      [userId]
    );

    return result.length > 0;
  }

  /**
   * Get user statistics
   * @param userId - User's unique ID
   * @returns Promise<object | null> - User statistics
   */
  static async getUserStatistics(userId: string): Promise<object | null> {
    const result = await DatabaseService.query(
      `SELECT 
        us.total_games, us.games_won, us.games_lost, 
        us.total_score, us.highest_score, us.average_score,
        us.created_at, us.updated_at,
        u.username
       FROM user_statistics us
       JOIN users u ON us.user_id = u.id
       WHERE us.user_id = $1`,
      [userId]
    );

    if (result.length === 0) {
      return null;
    }

    const stats = result[0];
    return {
      username: stats.username,
      totalGames: parseInt(stats.total_games),
      gamesWon: parseInt(stats.games_won),
      gamesLost: parseInt(stats.games_lost),
      totalScore: parseInt(stats.total_score),
      highestScore: parseInt(stats.highest_score),
      averageScore: parseFloat(stats.average_score),
      createdAt: stats.created_at,
      updatedAt: stats.updated_at
    };
  }

  /**
   * Update user statistics after game completion
   * @param userId - User's unique ID
   * @param score - Game score
   * @param won - Whether the user won the game
   */
  static async updateUserStatistics(userId: string, score: number, won: boolean): Promise<void> {
    try {
      // Get current statistics
      const currentStats = await this.getUserStatistics(userId);
      
      if (!currentStats) {
        // Create initial statistics if they don't exist
        await DatabaseService.run(
          'INSERT INTO user_statistics (user_id, total_games, games_won, games_lost, total_score, highest_score, average_score) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [userId, 1, won ? 1 : 0, won ? 0 : 1, score, score, score]
        );
      } else {
        // Update existing statistics
        const stats = currentStats as any;
        const newTotalGames = stats.totalGames + 1;
        const newGamesWon = stats.gamesWon + (won ? 1 : 0);
        const newGamesLost = stats.gamesLost + (won ? 0 : 1);
        const newTotalScore = stats.totalScore + score;
        const newHighestScore = Math.max(stats.highestScore, score);
        const newAverageScore = newTotalScore / newTotalGames;

        await DatabaseService.run(
          'UPDATE user_statistics SET total_games = $1, games_won = $2, games_lost = $3, total_score = $4, highest_score = $5, average_score = $6, updated_at = CURRENT_TIMESTAMP WHERE user_id = $7',
          [newTotalGames, newGamesWon, newGamesLost, newTotalScore, newHighestScore, newAverageScore, userId]
        );
      }
    } catch (error) {
      console.error('Failed to update user statistics:', error);
      throw error;
    }
  }
} 