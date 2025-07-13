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