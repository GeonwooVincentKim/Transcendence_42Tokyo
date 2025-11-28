/**
 * Match History Service
 * 
 * Manages match history from backend API
 */

import { AuthService } from './authService';

function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin.replace(':5173', ':3000').replace(':4173', ':3000');
  }
  return 'http://localhost:3000';
}

export interface LocalMatch {
  id: string;
  opponentName: string;
  userScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'draw';
  gameMode: string;
  duration: number; // in seconds
  playedAt: string;
  playerSide?: 'left' | 'right';
}

export interface GameStats {
  totalGames: number;
  gamesWon: number;
  gamesLost: number;
  winRate: number;
  totalScore: number;
  highestScore: number;
  averageScore: number;
}

const STORAGE_KEY = 'match_history';
const MAX_MATCHES = 50;

export class MatchHistoryService {
  /**
   * Get all matches from backend API
   */
  static async getMatches(): Promise<LocalMatch[]> {
    try {
      const token = AuthService.getToken();
      if (!token) {
        console.log('⚠️ No token found, returning empty matches');
        return [];
      }

      const response = await fetch(`${getApiBaseUrl()}/api/users/match-history`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('⚠️ Unauthorized, returning empty matches');
          return [];
        }
        const error = await response.json();
        throw new Error(error.message || 'Failed to get match history');
      }

      const matches = await response.json();
      return matches.map((match: any) => ({
        id: match.id,
        opponentName: match.opponentName,
        userScore: match.userScore,
        opponentScore: match.opponentScore,
        result: match.result,
        gameMode: match.gameMode,
        duration: match.duration || 0,
        playedAt: match.playedAt,
      }));
    } catch (error) {
      console.error('❌ Error fetching matches from backend:', error);
      return [];
    }
  }
  
  /**
   * Calculate game statistics from matches
   */
  static getStats(matches: LocalMatch[]): GameStats {
    if (matches.length === 0) {
      return {
        totalGames: 0,
        gamesWon: 0,
        gamesLost: 0,
        winRate: 0,
        totalScore: 0,
        highestScore: 0,
        averageScore: 0
      };
    }
    
    const gamesWon = matches.filter(m => m.result === 'win').length;
    const gamesLost = matches.filter(m => m.result === 'loss').length;
    const totalScore = matches.reduce((sum, m) => sum + m.userScore, 0);
    const highestScore = Math.max(...matches.map(m => m.userScore));
    const averageScore = totalScore / matches.length;
    const winRate = matches.length > 0 ? (gamesWon / matches.length) * 100 : 0;
    
    return {
      totalGames: matches.length,
      gamesWon,
      gamesLost,
      winRate,
      totalScore,
      highestScore,
      averageScore
    };
  }
  
  /**
   * Clear all matches (localStorage fallback - for backward compatibility)
   * Note: This only clears localStorage, not backend data
   */
  static clearMatches(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ Local match history cleared (localStorage only)');
    } catch (error) {
      console.error('❌ Error clearing matches:', error);
    }
  }
  
  /**
   * Save match to localStorage (for backward compatibility with single-player/AI games)
   * Note: Multiplayer games are saved to backend by the server
   */
  static saveMatch(match: Omit<LocalMatch, 'id' | 'playedAt'>): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const matches: LocalMatch[] = stored ? JSON.parse(stored) : [];
      
      const newMatch: LocalMatch = {
        ...match,
        id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playedAt: new Date().toISOString()
      };
      
      matches.unshift(newMatch);
      const trimmedMatches = matches.slice(0, MAX_MATCHES);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedMatches));
      
      console.log('✅ Match saved to localStorage (fallback):', newMatch);
    } catch (error) {
      console.error('❌ Error saving match to localStorage:', error);
    }
  }
}

