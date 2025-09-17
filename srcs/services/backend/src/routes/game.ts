/**
 * Game Routes
 * 
 * Handles game sessions, results, and statistics endpoints.
 * Uses JWT tokens for authentication and integrates with user statistics.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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

              // Save game result - set session_id to NULL since we don't create game sessions for single player games
        const userIdInt = parseInt(decoded.userId, 10);
        const wonInt = won ? 1 : 0;

        // Debug logging
        console.log('Debug - Values being inserted:', {
          sessionId: 'NULL',
          userId: decoded.userId,
          userIdInt,
          playerSide,
          score,
          wonInt,
          types: {
            sessionId: 'NULL',
            userId: typeof decoded.userId,
            userIdInt: typeof userIdInt,
            playerSide: typeof playerSide,
            score: typeof score,
            wonInt: typeof wonInt
          }
        });

        await DatabaseService.run(
          `INSERT INTO game_results (session_id, player_id, player_side, score, won, created_at)
           VALUES (NULL, $1, $2, $3, $4, CURRENT_TIMESTAMP)`,
          [userIdInt, playerSide, score, wonInt]
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

  /**
   * GET /api/game/:tournamentId/:matchId/state
   * Get current game state for polling
   */
  fastify.get<{ Params: { tournamentId: string; matchId: string } }>('/api/game/:tournamentId/:matchId/state', async (request, reply) => {
    try {
      const { tournamentId, matchId } = request.params;
      const { userId } = request.query as { userId: string };
      
      console.log(`Game state request: tournamentId=${tournamentId}, matchId=${matchId}, userId=${userId}`);
      
      // Get or create game room state from global map
      const roomId = `${tournamentId}-${matchId}`;
      let gameRoom = (fastify as any).gameRooms?.get(roomId);
      
      if (!gameRoom) {
        // Create new game room if it doesn't exist
        gameRoom = {
          roomState: {
            roomId,
            players: [],
            player1Ready: false,
            player2Ready: false,
            player1Id: null,
            player2Id: null,
            gameStarted: false,
            gameState: null,
            lastUpdate: Date.now()
          },
          gameControl: {
            isPaused: false,
            isStarted: false,
            isReset: false
          }
        };
        
        // Initialize gameRooms map if it doesn't exist
        if (!(fastify as any).gameRooms) {
          (fastify as any).gameRooms = new Map();
        }
        
        (fastify as any).gameRooms.set(roomId, gameRoom);
        console.log(`Created new game room: ${roomId}`);
      }
      
      // Ensure player IDs are included in response
      const enhancedRoomState = {
        ...gameRoom.roomState,
        player1Id: gameRoom.players?.player1?.userId || null,
        player2Id: gameRoom.players?.player2?.userId || null
      };
      
      return reply.status(200).send({
        roomState: enhancedRoomState,
        gameControl: gameRoom.gameControl || { isPaused: false, isStarted: false, isReset: false }
      });
    } catch (error) {
      console.error('Game state error:', error);
      return reply.status(500).send({
        error: 'Failed to get game state',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * POST /api/game/:tournamentId/:matchId/ready
   * Set player ready status
   */
  fastify.post<{ Params: { tournamentId: string; matchId: string }; Body: { ready: boolean } }>('/api/game/:tournamentId/:matchId/ready', async (request, reply) => {
    try {
      const { tournamentId, matchId } = request.params;
      const { ready, userId } = request.body as { ready: boolean; userId: string };
      
      console.log(`Player ready: tournamentId=${tournamentId}, matchId=${matchId}, userId=${userId}, ready=${ready}`);
      
      // Get or create game room state
      const roomId = `${tournamentId}-${matchId}`;
      let gameRoom = (fastify as any).gameRooms?.get(roomId);
      
      console.log(`Game room exists: ${!!gameRoom}, roomId: ${roomId}`);
      if (gameRoom) {
        console.log(`Existing game room players:`, gameRoom.players);
      }
      
      if (!gameRoom) {
        // Create new game room if it doesn't exist
        gameRoom = {
          roomState: {
            roomId,
            players: [],
            player1Ready: false,
            player2Ready: false,
            player1Id: null,
            player2Id: null,
            gameStarted: false,
            gameState: null,
            lastUpdate: Date.now()
          },
          gameControl: {
            isPaused: false,
            isStarted: false,
            isReset: false
          },
          players: {
            player1: null,
            player2: null
          }
        };
        
        // Initialize gameRooms map if it doesn't exist
        if (!(fastify as any).gameRooms) {
          (fastify as any).gameRooms = new Map();
        }
        
        (fastify as any).gameRooms.set(roomId, gameRoom);
        console.log(`Created new game room for ready: ${roomId}`);
      }
      
      // Ensure players object exists
      if (!gameRoom.players) {
        gameRoom.players = {
          player1: null,
          player2: null
        };
        console.log(`Initialized players object for room: ${roomId}`);
      }
      
      // Initialize players if not set
      if (!gameRoom.players.player1) {
        gameRoom.players.player1 = { userId, ready: ready };
        console.log(`Initialized player1: ${userId}, ready: ${ready}`);
      } else if (!gameRoom.players.player2 && gameRoom.players.player1.userId !== userId) {
        gameRoom.players.player2 = { userId, ready: ready };
        console.log(`Initialized player2: ${userId}, ready: ${ready}`);
      } else {
        // Update existing player ready status
        if (gameRoom.players.player1?.userId === userId) {
          gameRoom.players.player1.ready = ready;
          console.log(`Updated player1 ready status: ${ready}`);
        } else if (gameRoom.players.player2?.userId === userId) {
          gameRoom.players.player2.ready = ready;
          console.log(`Updated player2 ready status: ${ready}`);
        }
      }
      
      // Update room state
      gameRoom.roomState = {
        ...gameRoom.roomState,
        player1Ready: gameRoom.players.player1?.ready || false,
        player2Ready: gameRoom.players.player2?.ready || false,
        player1Id: gameRoom.players.player1?.userId || null,
        player2Id: gameRoom.players.player2?.userId || null
      };
      
      return reply.status(200).send({
        message: 'Player ready status updated',
        roomState: gameRoom.roomState
      });
    } catch (error) {
      console.error('Player ready error:', error);
      return reply.status(500).send({
        error: 'Failed to update player ready status',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * POST /api/game/:tournamentId/:matchId/control
   * Send game control action (start, pause, reset)
   */
  fastify.post<{ Params: { tournamentId: string; matchId: string }; Body: { action: 'start' | 'pause' | 'reset' } }>('/api/game/:tournamentId/:matchId/control', async (request, reply) => {
    try {
      const { tournamentId, matchId } = request.params;
      const { action, userId } = request.body as { action: 'start' | 'pause' | 'reset'; userId: string };
      
      console.log(`Game control: tournamentId=${tournamentId}, matchId=${matchId}, userId=${userId}, action=${action}`);
      
      // Get or create game room control state
      const roomId = `${tournamentId}-${matchId}`;
      let gameRoom = (fastify as any).gameRooms?.get(roomId);
      
      if (!gameRoom) {
        // Create new game room if it doesn't exist
        gameRoom = {
          roomState: {
            roomId,
            players: [],
            player1Ready: false,
            player2Ready: false,
            player1Id: null,
            player2Id: null,
            gameStarted: false,
            gameState: null,
            lastUpdate: Date.now()
          },
          gameControl: {
            isPaused: false,
            isStarted: false,
            isReset: false
          }
        };
        
        // Initialize gameRooms map if it doesn't exist
        if (!(fastify as any).gameRooms) {
          (fastify as any).gameRooms = new Map();
        }
        
        (fastify as any).gameRooms.set(roomId, gameRoom);
        console.log(`Created new game room for control: ${roomId}`);
      }
      
      // Initialize game control if not exists
      if (!gameRoom.gameControl) {
        gameRoom.gameControl = { isPaused: false, isStarted: false, isReset: false };
      }
      
      // Update control state based on action
      switch (action) {
        case 'start':
          gameRoom.gameControl.isStarted = true;
          gameRoom.gameControl.isPaused = false;
          gameRoom.roomState = { ...gameRoom.roomState, gameStarted: true };
          break;
        case 'pause':
          gameRoom.gameControl.isPaused = true;
          break;
        case 'reset':
          gameRoom.gameControl.isReset = true;
          gameRoom.gameControl.isStarted = false;
          gameRoom.gameControl.isPaused = false;
          gameRoom.roomState = { ...gameRoom.roomState, gameStarted: false };
          break;
      }
      
      return reply.status(200).send({
        message: 'Game control action processed',
        gameControl: gameRoom.gameControl,
        roomState: gameRoom.roomState
      });
    } catch (error) {
      console.error('Game control error:', error);
      return reply.status(500).send({
        error: 'Failed to process game control action',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * POST /api/game/:tournamentId/:matchId/start-loop
   * Manually start game loop for debugging
   */
  fastify.post<{ Params: { tournamentId: string; matchId: string } }>('/api/game/:tournamentId/:matchId/start-loop', async (request, reply) => {
    try {
      const { tournamentId, matchId } = request.params;
      const roomId = `tournament-${tournamentId}-match-${matchId}`;
      
      const socketIOService = (fastify as any).socketIOService;
      if (socketIOService) {
        // Force start game loop
        (socketIOService as any).startGameLoop(roomId);
        console.log(`Manually started game loop for room ${roomId}`);
      }
      
      return reply.status(200).send({
        message: 'Game loop started manually',
        roomId: roomId
      });
    } catch (error) {
      console.error('Error starting game loop:', error);
      return reply.status(500).send({
        error: 'Failed to start game loop',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });

  /**
   * DELETE /api/game/rooms/clear
   * Clear all in-memory game rooms (admin function)
   */
  fastify.delete('/api/game/rooms/clear', {
    schema: {
      description: 'Clear all in-memory game rooms',
      tags: ['game'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            clearedRooms: { type: 'number' }
          }
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Clear Fastify game rooms
      const gameRooms = (fastify as any).gameRooms;
      let clearedCount = 0;
      
      if (gameRooms) {
        clearedCount = gameRooms.size;
        gameRooms.clear();
        console.log(`Cleared ${clearedCount} Fastify game rooms`);
      }

      // Clear Socket.IO game rooms if service is available
      const socketIOService = (fastify as any).socketIOService;
      if (socketIOService && typeof socketIOService.clearAllGameRooms === 'function') {
        socketIOService.clearAllGameRooms();
        console.log('Cleared Socket.IO game rooms');
      }

      reply.send({ 
        success: true, 
        message: 'All game rooms cleared successfully',
        clearedRooms: clearedCount
      });
    } catch (error) {
      console.error('Error clearing game rooms:', error);
      reply.code(500).send({ success: false, error: 'Failed to clear game rooms' });
    }
  });
} 