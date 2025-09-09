import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/game';
import { tournamentRoutes } from './routes/tournament';
import { websocketRoutes } from './routes/websocket';
import { DatabaseService } from './services/databaseService';
import { initializeDatabase } from './utils/databaseInit';

/**
 * Pong Game Backend Server
 *
 * This server provides:
 * - REST API endpoints for game state management
 * - WebSocket connections for real-time game updates
 * - CORS support for frontend integration
 * - SQLite database integration
 */

const isProduction = process.env.NODE_ENV === 'production';
const server = Fastify({
  logger: isProduction
    ? true
    : {
        level: 'info',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true }
        }
      }
});

/**
 * Register CORS plugin for frontend integration
 * Allows requests from any origin in development
 */
server.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000', 'http://localhost:80', 'http://frontend:80']
    : ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

/**
 * Register WebSocket plugin for real-time game communication
 */
server.register(fastifyWebsocket);

/**
 * Health check endpoint
 * Returns server status and database connectivity
 */
server.get('/', async (request, reply) => {
  try {
    const dbHealth = await DatabaseService.healthCheck();
    const dbStats = await DatabaseService.getStats();
    
    return {
      status: 'ok',
      message: 'Pong Game Backend Server',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbHealth,
        stats: dbStats
      }
    };
  } catch (error) {
    server.log.error('Health check failed:', error);
    return reply.status(200).send({
      status: 'ok',
      message: 'Pong Game Backend Server (Database connection failed)',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    });
  }
});

/**
 * Connectivity test endpoint
 */
server.get('/api/ping', async (request, reply) => {
  return {
    message: 'pong',
    timestamp: new Date().toISOString()
  };
});

/**
 * Game state endpoint
 * Returns current game state (placeholder for now)
 */
server.get('/api/game/state', async (request, reply) => {
  return {
    gameState: {
      leftScore: 0,
      rightScore: 0,
      ballPosition: { x: 400, y: 200 },
      leftPaddle: { y: 150 },
      rightPaddle: { y: 150 }
    },
    timestamp: new Date().toISOString()
  };
});

/**
 * Database statistics endpoint
 */
server.get('/api/stats', async (request, reply) => {
  try {
    const stats = await DatabaseService.getStats();
    return {
      stats,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    server.log.error('Failed to get database stats:', error);
    return reply.status(503).send({
      error: 'Database temporarily unavailable',
      message: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Global game room state for synchronization
const gameRooms = new Map<string, {
  players: Map<string, any>;
  player1Ready: boolean;
  player2Ready: boolean;
  gameStarted: boolean;
  gameState?: any;
  lastUpdate?: number;
  // Game control synchronization
  gameControl?: {
    isPaused: boolean;
    isStarted: boolean;
    isReset: boolean;
    lastControlUpdate?: number;
  };
}>();

/**
 * HTTP endpoint for game state polling (WebSocket alternative)
 * GET /api/game/:tournamentId/:matchId/state
 */
server.get('/api/game/:tournamentId/:matchId/state', async (request, reply) => {
  const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };
  const userId = (request.query as any)?.userId as string;
  const roomId = `${tournamentId}-${matchId}`;
  
  console.log(`Game state requested for tournament ${tournamentId}, match ${matchId}, user ${userId}`);
  
  if (!userId) {
    return reply.status(400).send({ error: 'User ID required' });
  }

  // Get or create game room
  let room = gameRooms.get(roomId);
  if (!room) {
    room = {
      players: new Map(),
      player1Ready: false,
      player2Ready: false,
      gameStarted: false,
      gameState: null,
      lastUpdate: Date.now()
    };
    gameRooms.set(roomId, room);
    console.log(`Created new game room: ${roomId}`);
  }

  // Add player to room if not already present
  if (!room.players.has(userId)) {
    room.players.set(userId, { 
      id: userId, 
      ready: false,
      joinedAt: new Date().toISOString()
    });
    console.log(`Player ${userId} joined room ${roomId}`);
  }

  // Return current room state
  return {
    roomId,
    players: Array.from(room.players.values()),
    player1Ready: room.player1Ready,
    player2Ready: room.player2Ready,
    gameStarted: room.gameStarted,
    gameState: room.gameState,
    gameControl: room.gameControl || {
      isPaused: false,
      isStarted: false,
      isReset: false,
      lastControlUpdate: Date.now()
    },
    lastUpdate: room.lastUpdate
  };
});

/**
 * HTTP endpoint for game control actions (integrated with state API)
 * POST /api/game/:tournamentId/:matchId/control
 */
server.post('/api/game/:tournamentId/:matchId/control', async (request, reply) => {
  const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };
  const { userId, action } = request.body as { userId: string; action: 'start' | 'pause' | 'reset' };
  
  console.log(`Game control action: tournament ${tournamentId}, match ${matchId}, user ${userId}, action: ${action}`);
  
  if (!userId) {
    return reply.status(400).send({ error: 'User ID required' });
  }

  const roomId = `${tournamentId}-${matchId}`;
  
  // Get or create game room
  let room = gameRooms.get(roomId);
  if (!room) {
    room = {
      players: new Map(),
      player1Ready: false,
      player2Ready: false,
      gameStarted: false,
      gameState: null,
      lastUpdate: Date.now()
    };
    gameRooms.set(roomId, room);
  }
  
  // Initialize game control if not exists
  if (!room.gameControl) {
    room.gameControl = {
      isPaused: false,
      isStarted: false,
      isReset: false,
      lastControlUpdate: Date.now()
    };
  }
  
  // Update game control based on action
  switch (action) {
    case 'start':
      room.gameControl.isStarted = true;
      room.gameControl.isPaused = false;
      room.gameControl.isReset = false;
      break;
    case 'pause':
      room.gameControl.isPaused = !room.gameControl.isPaused;
      break;
    case 'reset':
      room.gameControl.isReset = true;
      room.gameControl.isStarted = false;
      room.gameControl.isPaused = false;
      break;
  }
  
  room.gameControl.lastControlUpdate = Date.now();
  room.lastUpdate = Date.now();
  
  console.log(`Game control updated in room ${roomId}:`, room.gameControl);
  
  return { 
    success: true, 
    gameControl: room.gameControl 
  };
});

/**
 * HTTP endpoint for updating player ready status
 * POST /api/game/:tournamentId/:matchId/ready
 */
server.post('/api/game/:tournamentId/:matchId/ready', async (request, reply) => {
  const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };
  const { userId, ready } = request.body as { userId: string; ready: boolean };
  const roomId = `${tournamentId}-${matchId}`;
  
  console.log(`Player ready update: tournament ${tournamentId}, match ${matchId}, user ${userId}, ready: ${ready}`);
  
  if (!userId) {
    return reply.status(400).send({ error: 'User ID required' });
  }

  // Get or create game room
  let room = gameRooms.get(roomId);
  if (!room) {
    room = {
      players: new Map(),
      player1Ready: false,
      player2Ready: false,
      gameStarted: false,
      gameState: null,
      lastUpdate: Date.now()
    };
    gameRooms.set(roomId, room);
  }

  // Update player ready status
  if (room.players.has(userId)) {
    const player = room.players.get(userId);
    player.ready = ready;
    room.players.set(userId, player);
  } else {
    room.players.set(userId, { 
      id: userId, 
      ready,
      joinedAt: new Date().toISOString()
    });
  }

  // Update room ready status
  const players = Array.from(room.players.values());
  if (players.length >= 2) {
    room.player1Ready = players[0].ready;
    room.player2Ready = players[1].ready;
    
    // Start game if both players are ready
    if (room.player1Ready && room.player2Ready && !room.gameStarted) {
      room.gameStarted = true;
      room.gameState = {
        status: 'playing',
        player1: { score: 0, paddle: { x: 50, y: 250 } },
        player2: { score: 0, paddle: { x: 750, y: 250 } },
        ball: { x: 400, y: 300, vx: 5, vy: 3 },
        startTime: new Date().toISOString()
      };
      console.log(`Game started in room ${roomId}`);
    }
  }
  
  room.lastUpdate = Date.now();

  return {
    success: true,
    roomId,
    players: Array.from(room.players.values()),
    player1Ready: room.player1Ready,
    player2Ready: room.player2Ready,
    gameStarted: room.gameStarted,
    gameState: room.gameState
  };
});

/**
 * HTTP endpoint for game control synchronization
 * POST /api/game/:tournamentId/:matchId/control
 */
server.post('/api/game/:tournamentId/:matchId/control', async (request, reply) => {
  const { tournamentId, matchId } = request.params as { tournamentId: string; matchId: string };
  const { userId, action } = request.body as { userId: string; action: 'start' | 'pause' | 'reset' };
  
  console.log(`Game control action: tournament ${tournamentId}, match ${matchId}, user ${userId}, action: ${action}`);
  
  if (!userId) {
    return reply.status(400).send({ error: 'User ID required' });
  }

  const roomId = `${tournamentId}-${matchId}`;
  
  if (!gameRooms.has(roomId)) {
    return reply.status(404).send({ error: 'Game room not found' });
  }

  const room = gameRooms.get(roomId)!;
  
  // Initialize game control if not exists
  if (!room.gameControl) {
    room.gameControl = {
      isPaused: false,
      isStarted: false,
      isReset: false,
      lastControlUpdate: Date.now()
    };
  }
  
  // Update game control based on action
  switch (action) {
    case 'start':
      room.gameControl.isStarted = true;
      room.gameControl.isPaused = false;
      room.gameControl.isReset = false;
      break;
    case 'pause':
      room.gameControl.isPaused = !room.gameControl.isPaused;
      break;
    case 'reset':
      room.gameControl.isReset = true;
      room.gameControl.isStarted = false;
      room.gameControl.isPaused = false;
      break;
  }
  
  room.gameControl.lastControlUpdate = Date.now();
  room.lastUpdate = Date.now();
  
  console.log(`Game control updated in room ${roomId}:`, room.gameControl);
  
  return { 
    success: true, 
    gameControl: room.gameControl 
  };
});

/**
 * HTTP endpoint for tournament state polling (for Start Tournament synchronization)
 * GET /api/tournaments/:id/state
 */
server.get('/api/tournaments/:id/state', async (request, reply) => {
  const { id } = request.params as { id: string };
  const userId = (request.query as any)?.userId as string;
  
  console.log(`Tournament state requested for tournament ${id}, user ${userId}`);
  
  if (!userId) {
    return reply.status(400).send({ error: 'User ID required' });
  }

  try {
    // Get tournament details from database
    const tournament = await DatabaseService.query(`
      SELECT id, name, status, max_participants, created_at, started_at
      FROM tournaments 
      WHERE id = ?
    `, [id]);

    if (!tournament || tournament.length === 0) {
      return reply.status(404).send({ error: 'Tournament not found' });
    }

    // Get participants
    const participants = await DatabaseService.query(`
      SELECT tp.*, u.username, u.email
      FROM tournament_participants tp
      JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ?
      ORDER BY tp.joined_at
    `, [id]);

    // Get matches
    const matches = await DatabaseService.query(`
      SELECT * FROM tournament_matches
      WHERE tournament_id = ?
      ORDER BY round, match_number
    `, [id]);

    return {
      tournament: tournament[0],
      participants,
      matches,
      lastUpdate: Date.now()
    };
  } catch (error) {
    console.error('Error fetching tournament state:', error);
    return reply.status(500).send({ error: 'Failed to fetch tournament state' });
  }
});

/**
 * WebSocket endpoint for tournament game rooms (DISABLED - using HTTP polling instead)
 * Handles real-time game synchronization between players
 */
server.get('/ws/game/:tournamentId/:matchId', { websocket: true }, (connection, req) => {
  // Extract parameters from URL - use different methods to get URL
  const url = req.url || req.raw?.url || '';
  console.log('WebSocket URL:', url);
  console.log('req.raw.url:', req.raw?.url);
  console.log('req.routerPath:', (req as any).routerPath);
  console.log('req.params:', req.params);
  console.log('req.raw?.method:', req.raw?.method);
  console.log('req.raw?.headers:', req.raw?.headers);
  
  let tournamentId = '';
  let matchId = '';
  
  // Try multiple methods to extract URL
  let extractedUrl = url;
  
  // Method 1: Direct URL
  if (!extractedUrl) {
    extractedUrl = req.raw?.url || '';
  }
  
  // Method 2: From routerPath
  if (!extractedUrl && (req as any).routerPath) {
    extractedUrl = (req as any).routerPath;
  }
  
  // Method 3: From params if available
  if (!extractedUrl && req.params) {
  const params = req.params as any;
    if (params.tournamentId && params.matchId) {
      tournamentId = params.tournamentId;
      matchId = params.matchId;
      console.log('Extracted from params:', { tournamentId, matchId });
    }
  }
  
  // Method 4: Try to extract from URL pattern
  if (!tournamentId || !matchId) {
    const urlMatch = extractedUrl.match(/\/ws\/game\/(\d+)\/(\d+)/);
    if (urlMatch) {
      tournamentId = urlMatch[1];
      matchId = urlMatch[2];
      console.log('Extracted from URL:', { tournamentId, matchId });
    } else {
      console.log('Could not extract parameters from URL:', extractedUrl);
      
      // Method 5: Try to extract from headers (Fastify WebSocket workaround)
      const headers = req.raw?.headers;
      if (headers && headers['sec-websocket-protocol']) {
        const protocol = headers['sec-websocket-protocol'];
        console.log('WebSocket protocol:', protocol);
      }
      
      // Method 6: Try manual hardcoded extraction for testing
      console.log('Attempting hardcoded extraction for testing...');
      tournamentId = '2';
      matchId = '3';
      console.log('Using hardcoded values for testing:', { tournamentId, matchId });
    }
  }
  
  const userId = (req.query as any)?.userId as string;
  const roomId = `${tournamentId}-${matchId}`;
  
  console.log(`WebSocket connection attempt for tournament ${tournamentId}, match ${matchId}, user ${userId}`);
  
  if (!userId) {
    console.log('No userId provided, closing connection');
    return;
  }

  console.log(`WebSocket connection established for user ${userId}`);

  // Get or create game room
  let room = gameRooms.get(roomId);
  if (!room) {
    room = {
      players: new Map(),
      player1Ready: false,
      player2Ready: false,
      gameStarted: false
    };
    gameRooms.set(roomId, room);
  }

  // Add player to room
  room.players.set(userId, connection);

  // Broadcast to all players in room
  const broadcastToRoom = (message: any) => {
    room.players.forEach((playerConnection, playerId) => {
      if (playerConnection.readyState === 1) { // WebSocket.OPEN
        playerConnection.send(JSON.stringify(message));
      }
    });
  };

  // Handle incoming messages
  connection.socket.on('message', (message: any) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Received message from user ${userId}:`, data);

      switch (data.type) {
        case 'join_room':
          // Send room joined confirmation to all players
          broadcastToRoom({
            type: 'player_joined',
            userId,
            roomState: {
              status: 'waiting',
              player1Id: room.players.size >= 1 ? parseInt(Array.from(room.players.keys())[0]) : null,
              player2Id: room.players.size >= 2 ? parseInt(Array.from(room.players.keys())[1]) : null,
              player1Ready: room.player1Ready,
              player2Ready: room.player2Ready
            },
            message: `Player ${userId} joined the game room`
          });
          break;
          
        case 'player_ready':
          // Update ready status
          if (room.players.size >= 1 && Array.from(room.players.keys())[0] === userId) {
            room.player1Ready = data.ready;
          } else if (room.players.size >= 2 && Array.from(room.players.keys())[1] === userId) {
            room.player2Ready = data.ready;
          }

          console.log(`Player ${userId} ready: ${data.ready}, Room state:`, {
            player1Ready: room.player1Ready,
            player2Ready: room.player2Ready,
            totalPlayers: room.players.size
          });

          // Broadcast ready status to all players
          broadcastToRoom({
            type: 'player_ready',
            userId,
            ready: data.ready,
            roomState: {
              status: 'waiting',
              player1Id: room.players.size >= 1 ? parseInt(Array.from(room.players.keys())[0]) : null,
              player2Id: room.players.size >= 2 ? parseInt(Array.from(room.players.keys())[1]) : null,
              player1Ready: room.player1Ready,
              player2Ready: room.player2Ready
            }
          });
          
          // If both players are ready and game hasn't started, start game for ALL players
          if (room.player1Ready && room.player2Ready && !room.gameStarted && room.players.size >= 2) {
            room.gameStarted = true;
            console.log(`Starting game for room ${roomId} - both players ready!`);
            
            // Send game start to all players
            setTimeout(() => {
              broadcastToRoom({
                type: 'game_start',
                roomState: {
                  status: 'ready',
                  player1Id: parseInt(Array.from(room.players.keys())[0]),
                  player2Id: parseInt(Array.from(room.players.keys())[1]),
                  player1Ready: true,
                  player2Ready: true
                },
                message: 'Both players ready! Starting game...'
              });
              
              // Send game playing to all players after 2 seconds
              setTimeout(() => {
                broadcastToRoom({
                  type: 'game_playing',
                  roomState: {
                    status: 'playing',
                    player1Id: parseInt(Array.from(room.players.keys())[0]),
                    player2Id: parseInt(Array.from(room.players.keys())[1]),
                    player1Ready: true,
                    player2Ready: true
                  },
                  message: 'Game is now playing!'
                });
              }, 2000);
            }, 1000);
          }
          break;
          
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });

  // Handle connection close
  connection.socket.on('close', () => {
    console.log(`WebSocket connection closed for user ${userId}`);
    room.players.delete(userId);
    
    // Reset ready status for this player
    if (room.players.size >= 1 && Array.from(room.players.keys())[0] === userId) {
      room.player1Ready = false;
    } else if (room.players.size >= 2 && Array.from(room.players.keys())[1] === userId) {
      room.player2Ready = false;
    }
    
    // Clean up empty room
    if (room.players.size === 0) {
      gameRooms.delete(roomId);
    }
  });

  // Handle connection error
  connection.socket.on('error', (error: any) => {
    console.error(`WebSocket error for user ${userId}:`, error);
  });

  // Send welcome message
  connection.socket.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to game room',
    tournamentId: parseInt(tournamentId),
    matchId: parseInt(matchId)
  }));
});

/**
 * Start the server
 * Binds to all network interfaces on port 8000
 */
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8000');
    const host = process.env.HOST || '0.0.0.0';

    server.log.info('Starting Pong Game Backend Server...');
    
    // Initialize database connection
    server.log.info('Initializing database connection...');
    await DatabaseService.initialize();
    server.log.info('Database connection initialized successfully');
    
    // Force database initialization to ensure tables are created
    server.log.info('Initializing database schema...');
    await initializeDatabase();
    server.log.info('Database schema initialized successfully');
    
    // Register JWT plugin for authentication FIRST
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    await server.register(jwt, { 
      secret: jwtSecret,
      sign: {
        expiresIn: '24h'
      }
    });
    
    // Register authentication routes
    await server.register(authRoutes);
    
    // Register game routes
    await server.register(gameRoutes);
    
    // Register tournament routes
    await server.register(tournamentRoutes);
    
    // HTTP polling APIs are now defined outside start() function for proper registration
    
    // WebSocket routes are now handled directly in index.ts
    
    await server.listen({ port, host });

    server.log.info(`Server listening on http://${host}:${port}`);
    server.log.info('Available endpoints:');
    server.log.info(`  - GET  / (health check)`);
    server.log.info(`  - GET  /api/ping (connectivity test)`);
    server.log.info(`  - GET  /api/game/state (game state)`);
    server.log.info(`  - GET  /api/stats (database statistics)`);
    server.log.info(`  - POST /api/auth/register (user registration)`);
    server.log.info(`  - POST /api/auth/login (user login)`);
    server.log.info(`  - GET  /api/auth/profile (user profile)`);
    server.log.info(`  - POST /api/auth/refresh (token refresh)`);
    server.log.info(`  - GET  /api/auth/users (list all users)`);
    server.log.info(`  - POST /api/game/sessions (create game session)`);
    server.log.info(`  - PUT  /api/game/sessions/:id/end (end game session)`);
    server.log.info(`  - POST /api/game/results (save game result)`);
    server.log.info(`  - GET  /api/game/statistics (user statistics)`);
    server.log.info(`  - GET  /api/game/leaderboard (top players)`);
    server.log.info(`  - POST /api/tournaments (create tournament)`);
    server.log.info(`  - GET  /api/tournaments (list tournaments)`);
    server.log.info(`  - GET  /api/tournaments/:id (tournament details)`);
    server.log.info(`  - POST /api/tournaments/:id/join (join tournament)`);
    server.log.info(`  - POST /api/tournaments/:id/start (start tournament)`);
    server.log.info(`  - GET  /api/tournaments/:id/brackets (view brackets)`);
    server.log.info(`  - GET  /api/tournaments/:id/matches (list matches)`);
    server.log.info(`  - POST /api/tournaments/:id/matches/:matchId/result (report result)`);
    server.log.info(`  - GET  /api/game/:tournamentId/:matchId/state (game state polling)`);
    server.log.info(`  - POST /api/game/:tournamentId/:matchId/ready (player ready status)`);
    server.log.info(`  - POST /api/game/:tournamentId/:matchId/control (game control sync)`);
    server.log.info(`  - GET  /api/tournaments/:id/state (tournament state polling)`);
    server.log.info(`  - WS   /ws (WebSocket for real-time game)`);
  } catch (err) {
    server.log.error('Failed to start server:', err);
    console.error('Detailed error:', err);
    process.exit(1);
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (signal: string) => {
  server.log.info(`Received ${signal}. Starting graceful shutdown...`);
  
  try {
    // Close database connections
    await DatabaseService.close();
    server.log.info('Database connections closed');
    
    // Close server
    await server.close();
    server.log.info('Server closed');
    
    process.exit(0);
  } catch (error) {
    server.log.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
start();