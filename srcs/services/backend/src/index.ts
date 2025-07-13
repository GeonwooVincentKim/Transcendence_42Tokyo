import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';
import { authRoutes } from './routes/auth';

/**
 * Pong Game Backend Server
 *
 * This server provides:
 * - REST API endpoints for game state management
 * - WebSocket connections for real-time game updates
 * - CORS support for frontend integration
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
    ? ['http://localhost:3000', 'http://localhost:80']
    : '*',
  credentials: true
});

/**
 * Register WebSocket plugin for real-time game communication
 */
server.register(fastifyWebsocket);

/**
 * Health check endpoint
 * Used to verify server is running
 */
server.get('/', async (request, reply) => {
  return {
    status: 'ok',
    message: 'Pong Game Backend Server',
    timestamp: new Date().toISOString()
  };
});

/**
 * API ping endpoint for testing connectivity
 */
server.get('/api/ping', async (request, reply) => {
  return {
    message: 'pong',
    timestamp: new Date().toISOString()
  };
});

/**
 * Game state endpoint
 * Returns current game state (placeholder for future implementation)
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

  // Set up message handlers
  const handleMessage = (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'ping') {
        // Respond to keepalive ping
        connection.socket.write(JSON.stringify({ type: 'pong' }));
        return;
      }
      server.log.info(`Received message from ${clientId} in room ${roomId}:`, data);
      
      const response = JSON.stringify({
        type: 'game_update',
        clientId,
        roomId,
        data: data,
        timestamp: new Date().toISOString()
      });

      connection.socket.write(response);
    } catch (error) {
      server.log.error(`Error processing message from ${clientId} in room ${roomId}:`, error);
      
      const errorResponse = JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      });

      connection.socket.write(errorResponse);
    }
  };

  // Set up event handlers
  connection.socket.on('message', handleMessage);
  connection.socket.on('close', () => {
    server.log.info(`WebSocket client disconnected: ${clientId} from room: ${roomId}`);
  });
  connection.socket.on('error', (error: Error) => {
    server.log.error(`WebSocket error for ${clientId} in room ${roomId}:`, error);
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
    
    // Register authentication routes
    await server.register(authRoutes);
    
    await server.listen({ port, host });

    server.log.info(`Server listening on http://${host}:${port}`);
    server.log.info('Available endpoints:');
    server.log.info(`  - GET  / (health check)`);
    server.log.info(`  - GET  /api/ping (connectivity test)`);
    server.log.info(`  - GET  /api/game/state (game state)`);
    server.log.info(`  - POST /api/auth/register (user registration)`);
    server.log.info(`  - POST /api/auth/login (user login)`);
    server.log.info(`  - GET  /api/auth/profile (user profile)`);
    server.log.info(`  - POST /api/auth/refresh (token refresh)`);
    server.log.info(`  - GET  /api/auth/users (list all users)`);
    server.log.info(`  - WS   /ws (WebSocket for real-time game)`);
  } catch (err) {
    server.log.error('Failed to start server:', err);
    console.error('Detailed error:', err);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  server.log.info('Received SIGINT, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  server.log.info('Received SIGTERM, shutting down gracefully...');
  await server.close();
  process.exit(0);
});

// Start the server
start();