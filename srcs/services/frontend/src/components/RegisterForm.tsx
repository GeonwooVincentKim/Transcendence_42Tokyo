/**
 * Register Form Component
 * 
 * Provides a form for user registration with username, email, and password fields.
 * Includes form validation, password confirmation, error handling, and success callbacks.
 */

import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { RegisterRequest, AuthResponse } from '../types/auth';
import i18n from 'i18next';

interface RegisterFormProps {
  onRegisterSuccess: (authData: AuthResponse) => void;
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onRegisterSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState<RegisterRequest & { confirmPassword: string }>({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
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
   * Validate form data
   * @returns boolean - True if form is valid
   */
  const validateForm = (): boolean => {
    // Check if all fields are filled
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError(i18n.t('error.missingfield'));
      return false;
    }

    // Validate username length
    if (formData.username.length < 3 || formData.username.length > 20) {
      setError(i18n.t('error.usrnmlen'));
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(i18n.t('error.invalidemail'));
      return false;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError(i18n.t('error.invalidpw'));
      return false;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      setError(i18n.t('error.pwmismatch'));
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { confirmPassword, ...registerData } = formData;
      const authData = await AuthService.register(registerData);
      
      // Store authentication data
      AuthService.storeAuthData(authData);
      
      // Call success callback
      onRegisterSuccess(authData);
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n.t('error.regfailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        {i18n.t('label.registeracct')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.usrnm')}
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.newusername')}
            disabled={isLoading}
            required
          />
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.newemail')}
            disabled={isLoading}
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.pw')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.newpw')}
            disabled={isLoading}
            required
          />
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.confirmpw')}
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.newpwcnfm')}
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
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {i18n.t('button.registeracct')}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          {i18n.t('label.returntologin')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            {i18n.t('button.login')}
          </button>
        </p>
      </div>
    </div>
  );
}; 