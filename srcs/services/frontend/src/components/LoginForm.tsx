/**
 * Login Form Component
 * 
 * Provides a form for user authentication with username and password fields.
 * Includes form validation, error handling, and success callbacks.
 */

import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import { LoginRequest, AuthResponse } from '../types/auth';
import i18n from 'i18next';

function updateContent() {
	const submitButton = document.getElementById('submitButton');
	if (submitButton) {
		if (submitButton.textContent == i18n.t('button.login'))
			submitButton.textContent = i18n.t('button.loggingin');
	}
}

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

    // Handle language change
  const handleLangChange = (e: React.MouseEvent<HTMLButtonElement>) => {
	e.preventDefault(); 
	i18n.changeLanguage(e.currentTarget.id);
	const titleLabel = document.getElementById("title");
	const subtitleLabel = document.getElementById("subtitle");
	const loginTitleLabel = document.getElementById("logintitle");
	const usernameLabel = document.getElementById("usernameLabel");
	const passwordLabel = document.getElementById("passwordLabel");
	const submitButton = document.getElementById("submitButton");
	const registerButton = document.getElementById("registerButton");
	const forgotusrnmButton = document.getElementById("forgotusrnmButton");
	const forgotpwButton = document.getElementById("forgotpwButton");
	if (titleLabel)
		titleLabel.innerHTML = i18n.t('label.title');
	if (subtitleLabel)
		subtitleLabel.innerHTML = i18n.t('label.signintoplay');
	if (loginTitleLabel)
		loginTitleLabel.innerHTML = i18n.t('label.logintitle');
	if (usernameLabel)
		usernameLabel.innerHTML = i18n.t('label.usrnm');
	if (passwordLabel)
		passwordLabel.innerHTML = i18n.t('label.pw');
	if (submitButton)
		submitButton.innerHTML = i18n.t('button.login');
	if (registerButton)
		registerButton.innerHTML = i18n.t('button.registeracct');
	if (forgotusrnmButton)
		forgotusrnmButton.innerHTML = i18n.t('button.forgotusrnm');
	if (forgotpwButton)
		forgotpwButton.innerHTML = i18n.t('button.forgotpw');
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
	updateContent();

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
      <h2 id="logintitle" className="text-2xl font-bold text-center text-gray-800 mb-6">
        {i18n.t('label.logintitle')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username Field */}
        <div>
          <label id="usernameLabel" htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.usrnm')}
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.username')}
            disabled={isLoading}
            required
          />
        </div>

        {/* Password Field */}
        <div>
          <label id="passwordLabel" htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            {i18n.t('label.pw')}
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={i18n.t('placeholder.password')}
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
		  id="submitButton"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {i18n.t('button.login')}
        </button>
      </form>

              {/* Switch to Register */}
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            <button
              type="button"
			  id="registerButton"
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {i18n.t('button.registeracct')}
            </button>
          </p>
        </div>

        {/* Forgot Username/Password Links */}
        <div className="mt-2 text-center space-y-1">
          <p className="text-sm text-gray-600">
            <button
              type="button"
			  id="forgotusrnmButton"
              onClick={onSwitchToForgotUsername}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
			{i18n.t('button.forgotusrnm')}
            </button>
            {' • '}
            <button
              type="button"
			  id="forgotpwButton"
              onClick={onSwitchToForgotPassword}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
			{i18n.t('button.forgotpw')}
            </button>
          </p>
        </div>
		{/* Language Selection */}
        <div className="mt-2 text-center space-y-1">
          <p className="text-sm text-gray-600">
            <button
              type="button"
			  id="en"
              onClick={handleLangChange}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
			English
            </button>
            <button
              type="button"
			  id="jp"
              onClick={handleLangChange}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
			日本語
            </button>
            <button
              type="button"
			  id="ko"
              onClick={handleLangChange}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
			한국어
            </button>
          </p>
        </div>
    </div>
  );
}; 