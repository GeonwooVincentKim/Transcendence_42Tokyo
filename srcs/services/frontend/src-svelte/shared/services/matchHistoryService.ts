/**
 * Match History Service
 * 
 * Manages match history in localStorage since backend API is not working
 */

export interface LocalMatch {
  id: string;
  opponentName: string;
  userScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'draw';
  gameMode: string;
  duration: number; // in seconds
  playedAt: string;
  playerSide: 'left' | 'right';
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
   * Save a match to localStorage
   */
  static saveMatch(match: Omit<LocalMatch, 'id' | 'playedAt'>): void {
    try {
      const matches = this.getMatches();
      
      const newMatch: LocalMatch = {
        ...match,
        id: `match-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playedAt: new Date().toISOString()
      };
      
      matches.unshift(newMatch); // Add to beginning
      
      // Keep only the most recent matches
      const trimmedMatches = matches.slice(0, MAX_MATCHES);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedMatches));
      
      console.log('✅ Match saved to localStorage:', newMatch);
    } catch (error) {
      console.error('❌ Error saving match to localStorage:', error);
    }
  }
  
  /**
   * Get all matches from localStorage
   */
  static getMatches(): LocalMatch[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }
      
      const matches = JSON.parse(stored);
      return Array.isArray(matches) ? matches : [];
    } catch (error) {
      console.error('❌ Error reading matches from localStorage:', error);
      return [];
    }
  }
  
  /**
   * Calculate game statistics from matches
   */
  static getStats(): GameStats {
    const matches = this.getMatches();
    
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
   * Clear all matches
   */
  static clearMatches(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ Match history cleared');
    } catch (error) {
      console.error('❌ Error clearing matches:', error);
    }
  }
}

