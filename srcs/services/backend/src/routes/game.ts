/**
 * Game Routes
 * 
 * Handles game sessions, results, and statistics endpoints.
 * Uses JWT tokens for authentication and integrates with user statistics.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { UserService } from '../services/userService';
import { DatabaseService } from '../services/databaseService';

/**
 * JWT Payload interface for token verification
 */
interface JWTPayload {
  userId: string;
  username: string;
}

/**
 * Game result request interface
 */
interface GameResultRequest {
  sessionId: string;
  playerSide: 'left' | 'right';
  score: number;
  won: boolean;
  gameType: 'single' | 'multiplayer' | 'ai';
}

/**
 * Game session request interface
 */
interface GameSessionRequest {
  gameType: 'single' | 'multiplayer' | 'ai';
  roomId?: string;
}

/**
 * Register game routes with the Fastify instance
 * @param fastify - Fastify instance
 */
export async function gameRoutes(fastify: FastifyInstance) {
  // Register JWT plugin for game routes
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  await fastify.register(jwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: '24h' // Token expires in 24 hours
    }
  });
  /**
   * POST /api/game/sessions
   * Create a new game session
   */
  fastify.post<{ Body: GameSessionRequest }>('/api/game/sessions', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['gameType'],
        properties: {
          gameType: { type: 'string', enum: ['single', 'multiplayer', 'ai'] },
          roomId: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const decoded = request.user as JWTPayload;
      const { gameType, roomId } = request.body;

      // Create game session
      await DatabaseService.run(
        `INSERT INTO game_sessions (room_id, game_type, status, created_at)
         VALUES ($1, $2, 'active', CURRENT_TIMESTAMP)`,
        [roomId || `session-${Date.now()}`, gameType]
      );

      // Get the newly created session ID
      const result = await DatabaseService.query(
        `SELECT id FROM game_sessions 
         WHERE room_id = $1 AND game_type = $2 AND status = 'active'
         ORDER BY created_at DESC LIMIT 1`,
        [roomId || `session-${Date.now()}`, gameType]
      );

      const sessionId = result[0].id.toString();

      return reply.status(201).send({
        sessionId,
        message: 'Game session created successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to create game session',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * PUT /api/game/sessions/:sessionId/end
   * End a game session
   */
  fastify.put<{ Params: { sessionId: string } }>('/api/game/sessions/:sessionId/end', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const { sessionId } = request.params;

      // End game session
      await DatabaseService.run(
        `UPDATE game_sessions 
         SET status = 'finished', finished_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [sessionId]
      );

      return reply.status(200).send({
        message: 'Game session ended successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to end game session',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * POST /api/game/results
   * Save game result and update user statistics
   */
  fastify.post<{ Body: GameResultRequest }>('/api/game/results', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    },
    schema: {
      body: {
        type: 'object',
        required: ['sessionId', 'playerSide', 'score', 'won', 'gameType'],
        properties: {
          sessionId: { type: 'string' },
          playerSide: { type: 'string', enum: ['left', 'right'] },
          score: { type: 'number', minimum: 0 },
          won: { type: 'boolean' },
          gameType: { type: 'string', enum: ['single', 'multiplayer', 'ai'] }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const decoded = request.user as JWTPayload;
      const { sessionId, playerSide, score, won, gameType } = request.body;

      // Save game result
      await DatabaseService.run(
        `INSERT INTO game_results (session_id, player_id, player_side, score, won, created_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [sessionId, decoded.userId, playerSide, score, won]
      );

      // Update user statistics
      await UserService.updateUserStatistics(decoded.userId, score, won);

      return reply.status(201).send({
        message: 'Game result saved successfully'
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to save game result',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * GET /api/game/statistics
   * Get current user's game statistics
   */
  fastify.get('/api/game/statistics', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const decoded = request.user as JWTPayload;
      const statistics = await UserService.getUserStatistics(decoded.userId);

      return reply.status(200).send({
        statistics
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get user statistics',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * GET /api/game/leaderboard
   * Get top players leaderboard
   */
  fastify.get('/api/game/leaderboard', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', minimum: 1, maximum: 100, default: 10 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { limit = 10 } = request.query as { limit?: number };

      const result = await DatabaseService.query(
        `SELECT 
          u.username,
          us.total_games,
          us.games_won,
          us.games_lost,
          us.total_score,
          us.highest_score,
          us.average_score
         FROM user_statistics us
         JOIN users u ON us.user_id = u.id
         WHERE u.is_active = true
         ORDER BY us.games_won DESC, us.total_score DESC
         LIMIT $1`,
        [limit]
      );

      const leaderboard = result.map((row: any) => ({
        username: row.username,
        totalGames: parseInt(row.total_games),
        gamesWon: parseInt(row.games_won),
        gamesLost: parseInt(row.games_lost),
        totalScore: parseInt(row.total_score),
        highestScore: parseInt(row.highest_score),
        averageScore: parseFloat(row.average_score)
      }));

      return reply.status(200).send({
        leaderboard
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get leaderboard',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * GET /api/game/sessions/:sessionId
   * Get game session details
   */
  fastify.get<{ Params: { sessionId: string } }>('/api/game/sessions/:sessionId', {
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.status(401).send({
          error: 'Unauthorized',
          message: 'Valid JWT token required'
        });
      }
    }
  }, async (request, reply) => {
    try {
      const { sessionId } = request.params;

      const result = await DatabaseService.query(
        `SELECT id, room_id, game_type, status, created_at, started_at, finished_at
         FROM game_sessions
         WHERE id = $1`,
        [sessionId]
      );

      if (result.length === 0) {
        return reply.status(404).send({
          error: 'Session not found',
          message: 'Game session does not exist'
        });
      }

      return reply.status(200).send({
        session: result[0]
      });
    } catch (error) {
      return reply.status(500).send({
        error: 'Failed to get session details',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
} 