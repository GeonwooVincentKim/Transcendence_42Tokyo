/**
 * Authentication Service
 * 
 * Handles API calls to the backend authentication endpoints.
 * Provides methods for user registration, login, logout, and profile management.
 */

import { LoginRequest, RegisterRequest, AuthResponse, User, ErrorResponse } from '../types/auth';

/**
 * Get API base URL dynamically at runtime
 * Uses environment variable if set, otherwise derives from current hostname
 */
function getApiBaseUrl(): string {
  // Always derive from current hostname at runtime
  // This allows the app to work on any IP address without rebuilding
  // Ignore VITE_API_URL to ensure it works from any IP address
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  
  console.log('🔍 API URL determination:', {
    protocol,
    hostname,
    fullUrl: window.location.href,
    viteApiUrl: import.meta.env.VITE_API_URL || 'not set'
  });
  
  // If running on localhost, use localhost for backend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const apiUrl = 'http://localhost:8000';
    console.log('🔍 Using localhost API URL:', apiUrl);
    return apiUrl;
  }
  
  // Otherwise, use the same hostname with port 8000
  const apiUrl = `${protocol}//${hostname}:8000`;
  console.log('🔍 Using derived API URL:', apiUrl);
  return apiUrl;
}

// Don't cache API_BASE_URL - get it dynamically each time
// This ensures it uses the current window.location, not the location when the module was loaded

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
    const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
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
    const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
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
    const response = await fetch(`${getApiBaseUrl()}/api/auth/profile`, {
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
    const response = await fetch(`${getApiBaseUrl()}/api/auth/refresh`, {
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
    const response = await fetch(`${getApiBaseUrl()}/api/auth/users`, {
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
   * Logout user and clear authentication data
   */
  static async logout(): Promise<void> {
    try {
      const token = this.getToken();
      if (token) {
        await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      this.clearAuthData();
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
    const token = this.getToken();
    return !!token;
  }

  /**
   * Get stored JWT token
   * @returns string | null - Stored token or null if not found/expired
   */
  static getToken(): string | null {
    const token = localStorage.getItem('token');
    if (!token) {
      return null;
    }
    
    // Check if token is expired
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        // Token is expired - clear it silently
        // The caller should handle refresh or re-authentication
        this.clearAuthData();
        return null;
      }
    } catch (error) {
      // Invalid token format - clear it
      console.error('Error parsing JWT token:', error);
      this.clearAuthData();
      return null;
    }
    
    return token;
  }

  /**
   * Get token or attempt to refresh if expired
   * This is an async version that can handle token refresh
   * @returns Promise<string | null> - Valid token or null if refresh failed
   */
  static async getTokenOrRefresh(): Promise<string | null> {
    let token = this.getToken();
    
    // If token exists and is valid, return it
    if (token) {
      return token;
    }
    
    // Token is missing or expired, try to get stored token for refresh attempt
    const storedToken = localStorage.getItem('token');
    if (!storedToken) {
      return null;
    }
    
    // Try to refresh the expired token
    try {
      const authData = await this.refreshToken(storedToken);
      this.storeAuthData(authData);
      return authData.token;
    } catch (error) {
      // Refresh failed - clear auth data
      console.error('Token refresh failed:', error);
      this.clearAuthData();
      return null;
    }
  }

  /**
   * Make an authenticated API request with automatic token refresh
   * @param url - API endpoint URL
   * @param options - Fetch options
   * @returns Promise<Response> - Fetch response
   */
  static async authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    // Get valid token (will attempt refresh if expired)
    let token = await this.getTokenOrRefresh();
    
    if (!token) {
      throw new Error('Authentication required. Please login again.');
    }
    
    // Add Authorization header
    const headers = new Headers(options.headers);
    headers.set('Authorization', `Bearer ${token}`);
    
    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    // If token expired during request, try refresh and retry once
    if (response.status === 401) {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const authData = await this.refreshToken(storedToken);
          this.storeAuthData(authData);
          
          // Retry request with new token
          headers.set('Authorization', `Bearer ${authData.token}`);
          return fetch(url, {
            ...options,
            headers
          });
        } catch (error) {
          // Refresh failed - clear auth data
          console.error('Token refresh failed after 401:', error);
          this.clearAuthData();
        }
      }
    }
    
    return response;
  }

  /**
   * Find username by email
   * @param email - User's email address
   * @returns Promise<string> - Username if found
   */
  static async findUsernameByEmail(email: string): Promise<string> {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-username`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to find username');
    }

    const data = await response.json();
    return data.username;
  }

  /**
   * Request password reset token
   * @param email - User's email address
   * @returns Promise<{ resetToken: string; expiresIn: string }> - Reset token and expiration
   */
  static async requestPasswordReset(email: string): Promise<{ resetToken: string; expiresIn: string }> {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to request password reset');
    }

    return response.json();
  }

  /**
   * Reset password using reset token
   * @param resetToken - Password reset token
   * @param newPassword - New password
   * @returns Promise<User> - Updated user data
   */
  static async resetPassword(resetToken: string, newPassword: string): Promise<User> {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resetToken, newPassword }),
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to reset password');
    }

    const data = await response.json();
    return data.user;
  }

  /**
   * Delete user account
   * @param token - JWT authentication token
   * @returns Promise<boolean> - True if account was deleted successfully
   */
  static async deleteAccount(token: string): Promise<boolean> {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/account`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to delete account');
    }

    return true;
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

  /**
   * Get statistics for a user
   * @param userId - User's unique ID
   * @returns Promise<any> - User statistics object
   */
  static async getUserStatistics(userId: string): Promise<any> {
    const response = await fetch(`${getApiBaseUrl()}/api/auth/user/${userId}/statistics`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const error: ErrorResponse = await response.json();
      throw new Error(error.message || 'Failed to get user statistics');
    }
    return response.json();
  }
} 