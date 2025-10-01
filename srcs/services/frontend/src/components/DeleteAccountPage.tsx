import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/authService';
import i18n from 'i18next';

interface DeleteAccountPageProps {
  user: { username: string; email: string };
  onBackToProfile: () => void;
  onAccountDeleted: () => void;
}

export const DeleteAccountPage: React.FC<DeleteAccountPageProps> = ({ user, onBackToProfile, onAccountDeleted }) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Render debug log
  console.log('[DeleteAccountPage] render, success:', success, 'user:', user);

  // 상태 변화 추적
  useEffect(() => {
    console.log('[DeleteAccountPage] useEffect success:', success);
    console.log('[DeleteAccountPage] useEffect user:', user);
  }, [success, user]);

  // Auto redirect after 5 seconds when success is true
  useEffect(() => {
    console.log('[DeleteAccountPage] Auto redirect useEffect triggered, success:', success);
    if (success) {
      console.log('[DeleteAccountPage] Setting 5 second timer for auto redirect');
      const timer = setTimeout(() => {
        console.log('[DeleteAccountPage] 5 second timer fired, calling onAccountDeleted');
        onAccountDeleted();
      }, 5000);
      return () => {
        console.log('[DeleteAccountPage] Clearing timer');
        clearTimeout(timer);
      };
    }
  }, [success, onAccountDeleted]);

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
      if (!token) throw new Error('Authentication token not found');
      const response = await fetch('http://localhost:8000/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });
      console.log('[DeleteAccountPage] Response status:', response.status);
      if (response.status === 200 || response.status === 204) {
        console.log('[DeleteAccountPage] Account deletion successful, status:', response.status);
        setSuccess(true);
        AuthService.clearAuthData();
        // Do NOT call onAccountDeleted here; only call when user clicks the button
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'password') setPassword(value);
    else if (name === 'confirmText') setConfirmText(value);
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-red-600 mb-2">{i18n.t('label.deleteacct')}</h2>
          <p className="text-gray-600">{i18n.t('msg.deletewarning')}</p>
        </div>
        {success ? (
          <div className="flex flex-col items-center justify-center">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded text-center mb-6">
              {i18n.t('msg.acctdeleted')}
            </div>
            <button
              type="button"
              onClick={onAccountDeleted}
              className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {i18n.t('button.backtologin')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-800 mb-2">{i18n.t('info.accttodelete')}</h3>
              <p className="text-sm text-gray-600"><strong>{i18n.t('info.usrnm')}</strong> {user.username}</p>
              <p className="text-sm text-gray-600"><strong>{i18n.t('info.email')}</strong> {user.email}</p>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder={i18n.t('placeholder.pwcnfm')}
                disabled={isLoading}
                required
              />
            </div>
            <div>
              <label htmlFor="confirmText" className="block text-sm font-medium text-gray-700 mb-1">Type DELETE to confirm</label>
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="text-sm font-medium">{i18n.t('label.genericwarning')}</p>
              <p className="text-sm mt-1">{i18n.t('msg.deletewarning')}</p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
            )}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onBackToProfile}
                disabled={isLoading}
                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {i18n.t('button.backtoprofile')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? i18n.t('button.deleting') : i18n.t('button.deleteacct')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}; 