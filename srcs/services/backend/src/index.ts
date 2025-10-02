import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { createServer } from 'http';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/game';
import { tournamentRoutes } from './routes/tournament';
import { DatabaseService } from './services/databaseService';
import { initializeDatabase } from './utils/databaseInit';
import SocketIOService from './services/socketIOService';

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

// Socket.IO will be attached to Fastify's underlying HTTP server

/**
 * Register CORS plugin for frontend integration
 * Allows requests from any origin in development
 */
server.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['http://localhost:3000', 'http://localhost:80', 'http://frontend:80']
    : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001', 'http://127.0.0.1:3002', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});

// Socket.IO will be initialized after server setup

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

// Socket.IO service instance
let socketIOService: SocketIOService;

// Game state polling endpoint moved to game.ts routes

// Game control endpoint moved to game.ts routes

// Player ready endpoint moved to game.ts routes

// Duplicate game control endpoint removed - using game.ts routes instead

// Tournament state endpoint moved to tournament.ts routes

// Socket.IO endpoints are handled by SocketIOService

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
    
    // Start HTTP server with Fastify
    await server.listen({ port, host });
    
    // Initialize Socket.IO service with Fastify's underlying HTTP server
    socketIOService = new SocketIOService(server.server);
    
    // Make Socket.IO service available to routes for cleanup
    (server as any).socketIOService = socketIOService;
    server.log.info('Socket.IO service initialized');

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
    server.log.info(`  - Socket.IO server on port ${port} (real-time game communication)`);
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