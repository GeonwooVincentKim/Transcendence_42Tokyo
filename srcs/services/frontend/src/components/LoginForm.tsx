/**
 * Login Form Component
 * 
 * Provides a form for user authentication with username and password fields.
 * Includes form validation, error handling, and success callbacks.
 */

import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { LoginRequest, AuthResponse } from '../types/auth';

interface LoginFormProps {
  onLoginSuccess: (authData: AuthResponse) => void;
  onSwitchToRegister: () => void;
  onSwitchToForgotUsername: () => void;
  onSwitchToForgotPassword: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ 
  onLoginSuccess, 
  onSwitchToRegister, 
  onSwitchToForgotUsername, 
  onSwitchToForgotPassword 
}) => {
  const [formData, setFormData] = useState<LoginRequest>({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle form input changes
   * @param e - Form input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  /**
   * Handle form submission
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.username.trim() || !formData.password.trim()) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const authData = await AuthService.login(formData);
      
      // Store authentication data
      AuthService.storeAuthData(authData);
      
      // Call success callback
      onLoginSuccess(authData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        Login to Pong Game
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your username"
            disabled={isLoading}
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
            disabled={isLoading}
            required
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>

              {/* Switch to Register */}
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Register here
            </button>
          </p>
        </div>

        {/* Forgot Username/Password Links */}
        <div className="mt-2 text-center space-y-1">
          <p className="text-sm text-gray-600">
            <button
              type="button"
              onClick={onSwitchToForgotUsername}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Forgot Username?
            </button>
            {' • '}
            <button
              type="button"
              onClick={onSwitchToForgotPassword}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Forgot Password?
            </button>
          </p>
        </div>
    </div>
  );
}; 