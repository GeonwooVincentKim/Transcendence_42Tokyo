import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { authRoutes } from './routes/auth';
import { gameRoutes } from './routes/game';
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

/**
 * WebSocket endpoint for real-time game communication
 * Handles game updates, player movements, and score updates
 * Supports room-based multiplayer connections
 */
server.get('/ws/game/:roomId', { websocket: true }, (connection, req) => {
  // Extract roomId from req.params if available, otherwise parse from req.url as fallback
  let roomId = 'unknown';
  // Use 'as any' to avoid TypeScript errors, since fastify-websocket may not type params
  const params = req.params as any;
  if (params && params.roomId) {
    roomId = params.roomId;
  } else if (req.url) {
    // Example: /ws/game/1
    const match = req.url.match(/\/ws\/game\/(\w+)/);
    if (match) {
      roomId = match[1];
    }
  }
  const clientId = Math.random().toString(36).substr(2, 9);

  server.log.info(`WebSocket client connected to room: ${roomId}, clientId: ${clientId}`);

  // Send initial connection message
  try {
    connection.socket.write(JSON.stringify({
      type: 'connection_established',
      clientId,
      roomId,
      message: 'Connected to Pong Game Server'
    }));
    server.log.info('Sent connection_established message to client');
  } catch (error) {
    server.log.error('Error sending initial message:', error);
    return;
  }

  // Handle incoming messages
  connection.socket.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      server.log.info(`Received message from client ${clientId}:`, data);

      // Echo the message back for now
      connection.socket.write(JSON.stringify({
        type: 'echo',
        clientId,
        roomId,
        data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      server.log.error('Error processing message:', error);
      connection.socket.write(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  connection.socket.on('close', () => {
    server.log.info(`WebSocket client ${clientId} disconnected from room: ${roomId}`);
  });

  // Handle connection errors
  connection.socket.on('error', (error: Error) => {
    server.log.error(`WebSocket error for client ${clientId}:`, error);
  });
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
    
    // Register authentication routes
    await server.register(authRoutes);
    
    // Register game routes
    await server.register(gameRoutes);
    
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