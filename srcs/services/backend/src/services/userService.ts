/**
 * User Service
 * 
 * Handles user data management, password hashing, and user validation.
 * In a real application, this would typically connect to a database.
 */

import bcrypt from 'bcryptjs';
import { User, UserWithoutPassword } from '../types/auth';

// In-memory user storage (replace with database in production)
const users: Map<string, User & { password: string }> = new Map();

// Password reset tokens (in production, use database with expiration)
const resetTokens: Map<string, { userId: string; expiresAt: Date }> = new Map();

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
    // Check if username already exists
    const existingUser = Array.from(users.values()).find(
      user => user.username === username || user.email === email
    );
    
    if (existingUser) {
      throw new Error('Username or email already exists');
    }

    // Hash the password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser: User & { password: string } = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store user
    users.set(newUser.id, newUser);

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Authenticate a user with username and password
   * @param username - User's username
   * @param password - User's password
   * @returns Promise<UserWithoutPassword> - User data without password
   */
  static async authenticateUser(username: string, password: string): Promise<UserWithoutPassword> {
    // Find user by username
    const user = Array.from(users.values()).find(u => u.username === username);
    
    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      throw new Error('Invalid username or password');
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Find username by email (for username recovery)
   * @param email - User's email address
   * @returns Promise<string | null> - Username if found, null otherwise
   */
  static async findUsernameByEmail(email: string): Promise<string | null> {
    const user = Array.from(users.values()).find(u => u.email === email);
    return user ? user.username : null;
  }

  /**
   * Generate password reset token
   * @param email - User's email address
   * @returns Promise<string> - Reset token
   */
  static async generatePasswordResetToken(email: string): Promise<string> {
    const user = Array.from(users.values()).find(u => u.email === email);
    
    if (!user) {
      throw new Error('User not found with this email');
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substr(2, 15);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // Store reset token
    resetTokens.set(resetToken, {
      userId: user.id,
      expiresAt
    });

    return resetToken;
  }

  /**
   * Reset password using reset token
   * @param resetToken - Password reset token
   * @param newPassword - New password
   * @returns Promise<UserWithoutPassword> - Updated user data
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<UserWithoutPassword> {
    const resetData = resetTokens.get(resetToken);
    
    if (!resetData) {
      throw new Error('Invalid reset token');
    }

    if (new Date() > resetData.expiresAt) {
      resetTokens.delete(resetToken);
      throw new Error('Reset token has expired');
    }

    const user = users.get(resetData.userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.password = hashedPassword;
    user.updatedAt = new Date();
    users.set(user.id, user);

    // Remove used reset token
    resetTokens.delete(resetToken);

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by ID
   * @param userId - User's unique ID
   * @returns Promise<UserWithoutPassword | null> - User data or null if not found
   */
  static async getUserById(userId: string): Promise<UserWithoutPassword | null> {
    const user = users.get(userId);
    
    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Get user by username
   * @param username - User's username
   * @returns Promise<UserWithoutPassword | null> - User data or null if not found
   */
  static async getUserByUsername(username: string): Promise<UserWithoutPassword | null> {
    const user = Array.from(users.values()).find(u => u.username === username);
    
    if (!user) {
      return null;
    }

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Update user's last activity
   * @param userId - User's unique ID
   */
  static async updateUserActivity(userId: string): Promise<void> {
    const user = users.get(userId);
    
    if (user) {
      user.updatedAt = new Date();
      users.set(userId, user);
    }
  }

  /**
   * Delete user account
   * @param userId - User's unique ID
   * @returns Promise<boolean> - True if user was deleted successfully
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const user = users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    // Remove user from storage
    users.delete(userId);
    
    // Remove any associated reset tokens
    for (const [token, data] of resetTokens.entries()) {
      if (data.userId === userId) {
        resetTokens.delete(token);
      }
    }

    return true;
  }

  /**
   * Get all users (for admin purposes)
   * @returns Promise<UserWithoutPassword[]> - Array of users without passwords
   */
  static async getAllUsers(): Promise<UserWithoutPassword[]> {
    return Array.from(users.values()).map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }
} 