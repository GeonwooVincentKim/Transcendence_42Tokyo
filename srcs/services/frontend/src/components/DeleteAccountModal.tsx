/**
 * Delete Account Modal Component
 * 
 * Provides a confirmation dialog for account deletion with password verification.
 * Includes safety measures to prevent accidental deletion.
 */

import React, { useState } from 'react';
import { AuthService } from '../services/authService';
import i18n from 'i18next';

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
      setError(i18n.t('error.pwmissing'));
      return;
    }

    if (confirmText !== 'DELETE') {
      setError(i18n.t('error.deletecnfm'));
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
      const response = await fetch(`http://${window.location.hostname}:8000/api/auth/account`, {
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
        setError((data && data.message) || i18n.t('error.deletefailed'));
      }
    } catch (err) {
      setError(i18n.t('error.fetchfailed'));
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
            {i18n.t('label.deleteacct')}
          </h2>
          <p className="text-gray-600">
            {i18n.t('msg.deletewarning')}
          </p>
        </div>
        {success ? (
          <div className="flex flex-col items-center justify-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-center">
              {i18n.t('msg.acctdeleted')}
            </div>
            <button
              type="button"
              onClick={onConfirm}
              className="mt-6 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {i18n.t('button.backtologin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">Account to be deleted:</h3>
              <p className="text-sm text-gray-600">
                <strong>{i18n.t('info.usrnm')}</strong> {user.username}
              </p>
              <p className="text-sm text-gray-600">
                <strong>{i18n.t('info.email')}</strong> {user.email}
              </p>
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
                value={password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={i18n.t('placeholder.newpwcnfm')}
                disabled={isLoading}
                required
              />
            </div>

            {/* Confirmation Text */}
            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-1">
                {i18n.t('label.deletecnfm')}
              </label>
              <input
                type="text"
                id="confirmText"
                name="confirmText"
                value={confirmText}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={i18n.t('placeholder.deletecnfm')}
                disabled={isLoading}
                required
              />
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="text-sm font-medium">{i18n.t('label.genericwarning')}</p>
              <p className="text-sm mt-1">
                {i18n.t('msg.deletewarning')}
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
                {i18n.t('button.cancel')}
              </button>
              <button
                type="submit"
                disabled={isLoading || success}
                className={`flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed${success ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? i18n.t('button.deleting') : i18n.t('button.deleteacct')}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={!success}
                className={`flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2${!success ? ' opacity-50 cursor-not-allowed' : ''}`}
              >
                {i18n.t('button.backtologin')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}; 