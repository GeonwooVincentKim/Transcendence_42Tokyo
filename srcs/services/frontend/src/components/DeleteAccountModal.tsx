/**
 * Delete Account Modal Component
 * 
 * Provides a confirmation dialog for account deletion with password verification.
 * Includes safety measures to prevent accidental deletion.
 */

import React, { useState } from 'react';
import { AuthService } from '../services/authService';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: {
    username: string;
    email: string;
  };
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user
}) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  /**
   * Handle form submission
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = AuthService.getToken();
      if (!token) {
        throw new Error('Authentication token not found');
      }
      const response = await fetch('http://localhost:8000/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }), // send password if backend expects it
      });
      if (response.status === 204) {
        setSuccess(true);
        AuthService.clearAuthData();
        setTimeout(() => {
          onConfirm();
        }, 1200);
      } else {
        let data = null;
        try { data = await response.json(); } catch {}
        setError((data && data.message) || 'Failed to delete account');
      }
    } catch (err) {
      setError('Failed to fetch');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle input changes
   * @param e - Input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'password') {
      setPassword(value);
    } else if (name === 'confirmText') {
      setConfirmText(value);
    }

    if (error) setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-red-600 mb-2">
            Delete Account
          </h2>
          <p className="text-gray-600">
            This action cannot be undone. All your data will be permanently deleted.
          </p>
        </div>
        {success ? (
          <div className="flex flex-col items-center justify-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-center">
              Account deleted successfully
            </div>
            <button
              type="button"
              onClick={onConfirm}
              className="mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Account to be deleted:</h3>
              <p className="text-sm text-gray-600">
                <strong>Username:</strong> {user.username}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {user.email}
              </p>
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
                value={password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Enter your password to confirm"
                disabled={isLoading}
                required
              />
            </div>

            {/* Confirmation Text */}
            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-1">
                Type DELETE to confirm
              </label>
              <input
                type="text"
                id="confirmText"
                name="confirmText"
                value={confirmText}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Type DELETE"
                disabled={isLoading}
                required
              />
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="text-sm font-medium">⚠️ Warning</p>
              <p className="text-sm mt-1">
                This will permanently delete your account and all associated data. 
                This action cannot be undone.
              </p>
            </div>

            {/* Error Message */}
            {!success && error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading || success}
                className={`flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed${success ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || success}
                className={`flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed${success ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Deleting...' : 'Delete Account'}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!success}
                className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2${!success ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}; 