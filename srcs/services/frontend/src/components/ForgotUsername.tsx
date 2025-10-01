/**
 * Forgot Username Component
 * 
 * Allows users to find their username by entering their email address.
 * Provides form validation and error handling.
 */

import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import i18n from 'i18next';

interface ForgotUsernameProps {
  onBackToLogin: () => void;
}

export const ForgotUsername: React.FC<ForgotUsernameProps> = ({ onBackToLogin }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /**
   * Handle form submission
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError(i18n.t('error.emailmissing'));
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(i18n.t('error.invalidemail'));
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const username = await AuthService.findUsernameByEmail(email);
      setSuccess(i18n.t('info.findusrnm', {who: username}));
    } catch (err) {
      setError(err instanceof Error ? err.message : i18n.t('findusrnmfailed'));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle input change
   * @param e - Input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
        {i18n.t('label.findusrnm')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.email')}
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.newemail')}
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

        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? i18n.t('button.findingusrnm') : i18n.t('button.findusrnm')}
        </button>
      </form>

      {/* Back to Login */}
      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={onBackToLogin}
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {i18n.t('button.backtologin')}
        </button>
      </div>
    </div>
  );
}; 