/**
 * Game Statistics Service
 * 
 * Handles API calls to the backend for game statistics and results.
 * Provides methods for saving game results and retrieving user statistics.
 */

import { AuthService } from './authService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Game result interface
 */
export interface GameResult {
  sessionId: string;
  playerSide: 'left' | 'right';
  score: number;
  won: boolean;
  gameType: 'single' | 'multiplayer' | 'ai';
}

/**
 * User statistics interface
 */
export interface UserStatistics {
  username: string;
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  totalScore: number;
  highestScore: number;
  averageScore: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Game Statistics Service Class
 * Provides methods for game statistics management
 */
export class GameStatsService {
  /**
   * Save game result to database
   * @param gameResult - Game result data
   * @returns Promise<boolean> - True if saved successfully
   */
  static async saveGameResult(gameResult: GameResult): Promise<boolean> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/game/results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(gameResult),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save game result');
    }

    return true;
  }

  /**
   * Save game result with simplified interface
   * @param winner - Winner of the game ('left' | 'right')
   * @param leftScore - Left player's final score
   * @param rightScore - Right player's final score
   * @param gameType - Type of game ('single', 'multiplayer', 'ai')
   * @param playerSide - Which side the current user was playing ('left' | 'right')
   * @returns Promise<boolean> - True if saved successfully
   */
  static async saveGameResultSimple(
    winner: 'left' | 'right',
    leftScore: number,
    rightScore: number,
    gameType: 'single' | 'multiplayer' | 'ai',
    playerSide: 'left' | 'right'
  ): Promise<boolean> {
    const gameResult: GameResult = {
      sessionId: `session-${Date.now()}`,
      playerSide,
      score: playerSide === 'left' ? leftScore : rightScore,
      won: (playerSide === 'left' && winner === 'left') || (playerSide === 'right' && winner === 'right'),
      gameType
    };

    return this.saveGameResult(gameResult);
  }

  /**
   * Get user statistics
   * @returns Promise<UserStatistics | null> - User statistics or null if not found
   */
  static async getUserStatistics(): Promise<UserStatistics | null> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Valid JWT token required');
    }

    const response = await fetch(`${API_BASE_URL}/api/game/statistics`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get user statistics');
    }

    const data = await response.json();
    return data.statistics;
  }

  /**
   * Get leaderboard
   * @param limit - Number of top players to return (default: 10)
   * @returns Promise<UserStatistics[]> - Array of top players
   */
  static async getLeaderboard(limit: number = 10): Promise<UserStatistics[]> {
    const response = await fetch(`${API_BASE_URL}/api/game/leaderboard?limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get leaderboard');
    }

    const data = await response.json();
    return data.leaderboard;
  }

  /**
   * Create game session
   * @param gameType - Type of game ('single', 'multiplayer', 'ai')
   * @param roomId - Room ID for multiplayer games
   * @returns Promise<string> - Session ID
   */
  static async createGameSession(gameType: 'single' | 'multiplayer' | 'ai', roomId?: string): Promise<string> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ gameType, roomId }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create game session');
    }

    const data = await response.json();
    return data.sessionId;
  }

  /**
   * End game session
   * @param sessionId - Session ID to end
   * @returns Promise<boolean> - True if ended successfully
   */
  static async endGameSession(sessionId: string): Promise<boolean> {
    const token = AuthService.getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_BASE_URL}/api/game/sessions/${sessionId}/end`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to end game session');
    }

    return true;
  }
} 