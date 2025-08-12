/**
 * User Profile Component
 * 
 * Displays user information and provides logout functionality.
 * Shows username, email, account creation date, last activity, and game statistics.
 */

import React, { useEffect, useState } from 'react';
import { AuthService } from '../services/authService';
import { GameStatsService, UserStatistics } from '../services/gameStatsService';
import { User } from '../types/auth';

interface UserProfileProps {
  user: User;
  onLogout: () => void;
  onBackToGame: () => void;
  onDeleteAccount: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onLogout, onBackToGame, onDeleteAccount }) => {
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user statistics on component mount
   */
  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const stats = await GameStatsService.getUserStatistics();
        setStatistics(stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

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

  /**
   * Calculate win rate percentage
   * @param won - Number of games won
   * @param total - Total number of games
   * @returns string - Win rate percentage
   */
  const calculateWinRate = (won: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((won / total) * 100)}%`;
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

        {/* Game Statistics */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Game Statistics</h3>
          
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading statistics...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <p className="text-red-600">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-blue-600 hover:text-blue-800"
              >
                Retry
              </button>
            </div>
          ) : statistics ? (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total games:</span>
                <span className="font-medium">{statistics.totalGames}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Games won:</span>
                <span className="font-medium text-green-600">{statistics.gamesWon}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Games lost:</span>
                <span className="font-medium text-red-600">{statistics.gamesLost}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Win rate:</span>
                <span className="font-medium">
                  {calculateWinRate(statistics.gamesWon, statistics.totalGames)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Total score:</span>
                <span className="font-medium">{statistics.totalScore}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Highest score:</span>
                <span className="font-medium text-yellow-600">{statistics.highestScore}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Average score:</span>
                <span className="font-medium">{statistics.averageScore.toFixed(1)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600">No statistics available</p>
            </div>
          )}
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
    </div>
  );
};