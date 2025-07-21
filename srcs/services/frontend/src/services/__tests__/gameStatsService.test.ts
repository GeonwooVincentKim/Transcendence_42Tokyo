/**
 * Game Stats Service Tests
 * 
 * Tests for the GameStatsService functionality including API calls,
 * error handling, and data validation.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { GameStatsService } from '../gameStatsService';
import { AuthService } from '../authService';

// Mock the AuthService
vi.mock('../authService');

// Mock fetch globally
global.fetch = vi.fn();

describe('GameStatsService', () => {
  const mockToken = 'test-jwt-token';
  const mockUser = { id: '1', username: 'testuser' };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock AuthService methods
    (AuthService.getToken as any).mockReturnValue(mockToken);
    (AuthService.getUser as any).mockReturnValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('saveGameResult', () => {
    const mockGameResult = {
      sessionId: 'session-123',
      playerSide: 'left' as const,
      score: 11,
      won: true,
      gameType: 'ai' as const
    };

    test('should save game result successfully', async () => {
      const mockResponse = { ok: true, json: vi.fn().mockResolvedValue({ success: true }) };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.saveGameResult(mockGameResult);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/results',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(mockGameResult),
        }
      );
    });

    test('should throw error when not authenticated', async () => {
      (AuthService.getToken as any).mockReturnValue(null);

      await expect(GameStatsService.saveGameResult(mockGameResult)).rejects.toThrow(
        'Authentication required'
      );
    });

    test('should throw error when API call fails', async () => {
      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Failed to save game result' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.saveGameResult(mockGameResult)).rejects.toThrow(
        'Failed to save game result'
      );
    });

    test('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(GameStatsService.saveGameResult(mockGameResult)).rejects.toThrow(
        'Network error'
      );
    });
  });

  describe('getUserStatistics', () => {
    const mockStatistics = {
      totalGames: 10,
      gamesWon: 7,
      gamesLost: 3,
      totalScore: 150,
      highestScore: 25,
      averageScore: 15.0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    test('should get user statistics successfully', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ statistics: mockStatistics }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.getUserStatistics();

      expect(result).toEqual(mockStatistics);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/statistics',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    test('should return null when no statistics found', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ statistics: null }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.getUserStatistics();

      expect(result).toBeNull();
    });

    test('should throw error when not authenticated', async () => {
      (AuthService.getToken as any).mockReturnValue(null);

      await expect(GameStatsService.getUserStatistics()).rejects.toThrow(
        'Authentication required'
      );
    });

    test('should throw error when API call fails', async () => {
      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Failed to get statistics' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.getUserStatistics()).rejects.toThrow(
        'Failed to get statistics'
      );
    });
  });

  describe('getLeaderboard', () => {
    const mockLeaderboard = [
      {
        username: 'player1',
        totalGames: 20,
        gamesWon: 15,
        gamesLost: 5,
        totalScore: 300,
        highestScore: 30,
        averageScore: 15.0
      },
      {
        username: 'player2',
        totalGames: 15,
        gamesWon: 10,
        gamesLost: 5,
        totalScore: 200,
        highestScore: 25,
        averageScore: 13.3
      }
    ];

    test('should get leaderboard successfully', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ leaderboard: mockLeaderboard }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.getLeaderboard();

      expect(result).toEqual(mockLeaderboard);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/leaderboard?limit=10',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    test('should get leaderboard with custom limit', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ leaderboard: mockLeaderboard }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.getLeaderboard(5);

      expect(result).toEqual(mockLeaderboard);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/leaderboard?limit=5',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    test('should throw error when API call fails', async () => {
      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Failed to get leaderboard' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.getLeaderboard()).rejects.toThrow(
        'Failed to get leaderboard'
      );
    });

    test('should handle empty leaderboard', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ leaderboard: [] }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.getLeaderboard();

      expect(result).toEqual([]);
    });
  });

  describe('createGameSession', () => {
    test('should create game session successfully', async () => {
      const mockSessionId = 'session-456';
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ sessionId: mockSessionId }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.createGameSession('ai', 'room-123');

      expect(result).toBe(mockSessionId);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/sessions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gameType: 'ai', roomId: 'room-123' }),
        }
      );
    });

    test('should create game session without roomId', async () => {
      const mockSessionId = 'session-789';
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ sessionId: mockSessionId }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.createGameSession('single');

      expect(result).toBe(mockSessionId);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/sessions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ gameType: 'single' }),
        }
      );
    });

    test('should throw error when not authenticated', async () => {
      (AuthService.getToken as any).mockReturnValue(null);

      await expect(GameStatsService.createGameSession('ai')).rejects.toThrow(
        'Authentication required'
      );
    });

    test('should throw error when API call fails', async () => {
      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Failed to create session' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.createGameSession('ai')).rejects.toThrow(
        'Failed to create session'
      );
    });
  });

  describe('endGameSession', () => {
    test('should end game session successfully', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockResolvedValue({ success: true }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await GameStatsService.endGameSession('session-123');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/game/sessions/session-123/end',
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${mockToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    });

    test('should throw error when not authenticated', async () => {
      (AuthService.getToken as any).mockReturnValue(null);

      await expect(GameStatsService.endGameSession('session-123')).rejects.toThrow(
        'Authentication required'
      );
    });

    test('should throw error when API call fails', async () => {
      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Failed to end session' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.endGameSession('session-123')).rejects.toThrow(
        'Failed to end session'
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JSON response', async () => {
      const mockResponse = { 
        ok: true, 
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.getUserStatistics()).rejects.toThrow(
        'Invalid JSON'
      );
    });

    test('should handle timeout errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Request timeout'));

      await expect(GameStatsService.getUserStatistics()).rejects.toThrow(
        'Request timeout'
      );
    });

    test('should handle server errors', async () => {
      const mockResponse = { 
        ok: false, 
        status: 500,
        json: vi.fn().mockResolvedValue({ message: 'Internal server error' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.getUserStatistics()).rejects.toThrow(
        'Internal server error'
      );
    });
  });

  describe('Data Validation', () => {
    test('should validate game result data structure', async () => {
      const invalidGameResult = {
        sessionId: 'session-123',
        playerSide: 'invalid-side', // Invalid value
        score: -5, // Invalid score
        won: 'yes', // Invalid boolean
        gameType: 'invalid-type' // Invalid game type
      };

      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Validation failed' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.saveGameResult(invalidGameResult as any)).rejects.toThrow(
        'Validation failed'
      );
    });

    test('should validate leaderboard limit parameter', async () => {
      const mockResponse = { 
        ok: false, 
        json: vi.fn().mockResolvedValue({ message: 'Invalid limit parameter' }) 
      };
      (global.fetch as any).mockResolvedValue(mockResponse);

      await expect(GameStatsService.getLeaderboard(0)).rejects.toThrow(
        'Invalid limit parameter'
      );
    });
  });
}); 