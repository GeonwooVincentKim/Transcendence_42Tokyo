/**
 * User Profile Component
 * 
 * Displays user information and provides logout functionality.
 * Shows username, email, account creation date, and last activity.
 */

import React from 'react';
import { AuthService } from '../services/authService';
import { User } from '../types/auth';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onBackToGame: () => void; // Added prop
  onDeleteAccount: () => void; // Add this prop
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onBackToGame, onDeleteAccount }) => {
  // const [showDeleteModal, setShowDeleteModal] = useState(false); // Removed state

  /**
   * Handle logout action
   * Clears stored authentication data and calls logout callback
   */
  const handleLogout = () => {
    AuthService.clearAuthData();
    onLogout();
  };

  /**
   * Format date for display
   * @param dateString - ISO date string
   * @returns string - Formatted date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="text-center mb-6">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-blue-600">
            {user.username.charAt(0).toUpperCase()}
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
        <p className="text-gray-600">{user.email}</p>
      </div>

      <div className="space-y-4 mb-6">
        {/* Account Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Account Information</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Username:</span>
              <span className="font-medium">{user.username}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{user.email}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Member since:</span>
              <span className="font-medium">{formatDate(user.createdAt)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Last updated:</span>
              <span className="font-medium">{formatDate(user.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Game Statistics (Placeholder for future implementation) */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Game Statistics</h3>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Games played:</span>
              <span className="font-medium">0</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Wins:</span>
              <span className="font-medium">0</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Win rate:</span>
              <span className="font-medium">0%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Logout
        </button>
        
        <button
          onClick={onBackToGame}
          className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to Game
        </button>

        <button
          onClick={onDeleteAccount}
          className="w-full bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Account Modal */}
      {/* Removed DeleteAccountModal component */}
    </div>
  );
}; 