/**
 * Authentication Service
 * 
 * Handles API calls to the backend authentication endpoints.
 * Provides methods for user registration, login, logout, and profile management.
 */

import { LoginRequest, RegisterRequest, AuthResponse, User, ErrorResponse } from '../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Authentication Service Class
 * Provides methods for user authentication and management
 */
export class AuthService {
  /**
   * Register a new user account
   * @param userData - User registration data
   * @returns Promise<AuthResponse> - User data and JWT token
   */
  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    return response.json();
  }

  /**
   * Login with username and password
   * @param credentials - User login credentials
   * @returns Promise<AuthResponse> - User data and JWT token
   */
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  /**
   * Get current user's profile
   * @param token - JWT authentication token
   * @returns Promise<User> - User profile data
   */
  static async getProfile(token: string): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to get profile');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Refresh JWT token
   * @param token - Current JWT token
   * @returns Promise<AuthResponse> - New user data and JWT token
   */
  static async refreshToken(token: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Token refresh failed');
    }

    return response.json();
  }

  /**
   * Get all users (for admin purposes)
   * @returns Promise<User[]> - Array of all users
   */
  static async getAllUsers(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/api/auth/users`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to get users');
    }

    const data = await response.json();
    return data.users;
  }

  /**
   * Store authentication data in localStorage
   * @param authData - Authentication response data
   */
  static storeAuthData(authData: AuthResponse): void {
    localStorage.setItem('token', authData.token);
    localStorage.setItem('user', JSON.stringify(authData.user));
  }

  /**
   * Get stored authentication data from localStorage
   * @returns AuthResponse | null - Stored auth data or null if not found
   */
  static getStoredAuthData(): AuthResponse | null {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
      return null;
    }

    try {
      const user = JSON.parse(userStr);
      return { token, user };
    } catch (error) {
      console.error('Error parsing stored auth data:', error);
      return null;
    }
  }

  /**
   * Clear stored authentication data from localStorage
   */
  static clearAuthData(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  /**
   * Check if user is authenticated
   * @returns boolean - True if user has valid stored token
   */
  static isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * Get stored JWT token
   * @returns string | null - Stored token or null if not found
   */
  static getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get stored user data
   * @returns User | null - Stored user data or null if not found
   */
  static getUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing stored user data:', error);
      return null;
    }
  }
} 