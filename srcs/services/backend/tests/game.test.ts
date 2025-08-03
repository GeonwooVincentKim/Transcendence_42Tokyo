/**
 * Game Routes Tests
 * 
 * Tests for game session management, results, and statistics endpoints.
 * Uses table-driven test pattern and testify's assert package.
 */

import { test, describe, beforeEach, afterEach, afterAll, expect } from '@jest/globals';
import { FastifyInstance } from 'fastify';
import { DatabaseService } from '../src/services/databaseService';
import { UserService } from '../src/services/userService';

// Test data for table-driven tests
const gameSessionTestCases = [
  {
    name: 'should create single player game session',
    gameType: 'single' as const,
    roomId: undefined,
    expectedStatus: 201
  },
  {
    name: 'should create multiplayer game session',
    gameType: 'multiplayer' as const,
    roomId: 'test-room-123',
    expectedStatus: 201
  },
  {
    name: 'should create AI game session',
    gameType: 'ai' as const,
    roomId: 'ai-room-456',
    expectedStatus: 201
  }
];

const gameResultTestCases = [
  {
    name: 'should save winning game result',
    playerSide: 'left' as const,
    score: 11,
    won: true,
    gameType: 'ai' as const,
    expectedStatus: 201
  },
  {
    name: 'should save losing game result',
    playerSide: 'right' as const,
    score: 8,
    won: false,
    gameType: 'single' as const,
    expectedStatus: 201
  },
  {
    name: 'should save multiplayer game result',
    playerSide: 'left' as const,
    score: 15,
    won: true,
    gameType: 'multiplayer' as const,
    expectedStatus: 201
  }
];

describe('Game API', () => {
  let app: FastifyInstance;
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Initialize database connection
    await DatabaseService.initialize();
    
    // Create test user
    testUser = await UserService.registerUser(
      'testuser',
      'test@example.com',
      'password123'
    );
    
    // Generate auth token (simplified for testing)
    authToken = 'test-token';
    
    // Initialize Fastify app for testing
    app = require('fastify')();
    await app.register(require('../src/routes/game'));
  });

  afterEach(async () => {
    // Clean up test data
    if (testUser?.id) {
      await UserService.deleteUser(testUser.id);
    }
    
    // Close Fastify app
    if (app) {
      await app.close();
    }
    
    // Close database connection
    await DatabaseService.close();
  });

  afterAll(async () => {
    // Ensure database is closed
    await DatabaseService.close();
  });

  describe('Game Sessions', () => {
    test.each(gameSessionTestCases)('$name', async ({ gameType, roomId, expectedStatus }) => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/game/sessions',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          gameType,
          ...(roomId && { roomId })
        }
      });

      expect(response.statusCode).toBe(expectedStatus);
      
      if (expectedStatus === 201) {
        const data = JSON.parse(response.payload);
        expect(data).toHaveProperty('sessionId');
        expect(data).toHaveProperty('message');
        expect(data.message).toBe('Game session created successfully');
      }
    });

    test('should end game session successfully', async () => {
      // First create a session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/game/sessions',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          gameType: 'ai'
        }
      });

      const sessionData = JSON.parse(createResponse.payload);
      const sessionId = sessionData.sessionId;

      // Then end the session
      const endResponse = await app.inject({
        method: 'PUT',
        url: `/api/game/sessions/${sessionId}/end`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(endResponse.statusCode).toBe(200);
      
      const data = JSON.parse(endResponse.payload);
      expect(data).toHaveProperty('message');
      expect(data.message).toBe('Game session ended successfully');
    });

    test('should get session details', async () => {
      // First create a session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/game/sessions',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          gameType: 'ai',
          roomId: 'test-room'
        }
      });

      const sessionData = JSON.parse(createResponse.payload);
      const sessionId = sessionData.sessionId;

      // Then get session details
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/game/sessions/${sessionId}`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(getResponse.statusCode).toBe(200);
      
      const data = JSON.parse(getResponse.payload);
      expect(data).toHaveProperty('session');
      expect(data.session).toHaveProperty('id');
      expect(data.session).toHaveProperty('game_type');
      expect(data.session.game_type).toBe('ai');
      expect(data.session).toHaveProperty('room_id');
      expect(data.session.room_id).toBe('test-room');
    });
  });

  describe('Game Results', () => {
    test.each(gameResultTestCases)('$name', async ({ playerSide, score, won, gameType, expectedStatus }) => {
      // First create a session
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/game/sessions',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          gameType
        }
      });

      const sessionData = JSON.parse(createResponse.payload);
      const sessionId = sessionData.sessionId;

      // Then save game result
      const resultResponse = await app.inject({
        method: 'POST',
        url: '/api/game/results',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          sessionId,
          playerSide,
          score,
          won,
          gameType
        }
      });

      expect(resultResponse.statusCode).toBe(expectedStatus);
      
      if (expectedStatus === 201) {
        const data = JSON.parse(resultResponse.payload);
        expect(data).toHaveProperty('message');
        expect(data.message).toBe('Game result saved successfully');
      }
    });

    test('should validate required fields for game result', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/game/results',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          // Missing required fields
          score: 10
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('User Statistics', () => {
    test('should get user statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/game/statistics',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('statistics');
      
      if (data.statistics) {
        expect(data.statistics).toHaveProperty('totalGames');
        expect(data.statistics).toHaveProperty('gamesWon');
        expect(data.statistics).toHaveProperty('gamesLost');
        expect(data.statistics).toHaveProperty('totalScore');
        expect(data.statistics).toHaveProperty('highestScore');
        expect(data.statistics).toHaveProperty('averageScore');
      }
    });

    test('should require authentication for statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/game/statistics',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Leaderboard', () => {
    test('should get leaderboard', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/game/leaderboard',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('leaderboard');
      expect(Array.isArray(data.leaderboard)).toBe(true);
    });

    test('should get leaderboard with custom limit', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/game/leaderboard?limit=5',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(200);
      
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('leaderboard');
      expect(Array.isArray(data.leaderboard)).toBe(true);
      expect(data.leaderboard.length).toBeLessThanOrEqual(5);
    });

    test('should validate leaderboard limit parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/game/leaderboard?limit=0',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Authentication', () => {
    test('should require authentication for game sessions', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/game/sessions',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: {
          gameType: 'ai'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should require authentication for game results', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/game/results',
        headers: {
          'Content-Type': 'application/json'
        },
        payload: {
          sessionId: 'test-session',
          playerSide: 'left',
          score: 10,
          won: true,
          gameType: 'ai'
        }
      });

      expect(response.statusCode).toBe(401);
    });

    test('should require authentication for session management', async () => {
      const response = await app.inject({
        method: 'PUT',
        url: '/api/game/sessions/test-session/end',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid session ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/game/sessions/invalid-session-id',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(404);
      
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Session not found');
    });

    test('should handle invalid game type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/game/sessions',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          gameType: 'invalid-type'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle invalid player side', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/game/results',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          sessionId: 'test-session',
          playerSide: 'invalid-side',
          score: 10,
          won: true,
          gameType: 'ai'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
}); 