import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyWebsocket from '@fastify/websocket';

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
 */
server.get('/ws', { websocket: true }, (connection, req) => {
  const clientId = Math.random().toString(36).substr(2, 9);

  server.log.info(`WebSocket client connected: ${clientId}`);

  // Send welcome message
  connection.socket.send(JSON.stringify({
    type: 'connection_established',
    clientId,
    message: 'Connected to Pong Game Server'
  }));

  // Handle incoming messages
  connection.socket.on('message', (message: Buffer) => {
    try {
      const data = JSON.parse(message.toString());

      server.log.info(`Received message from ${clientId}:`, data);

      // Echo back the message with additional metadata
      connection.socket.send(JSON.stringify({
        type: 'game_update',
        clientId,
        data: data,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      server.log.error(`Error processing message from ${clientId}:`, error);
      connection.socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // Handle client disconnect
  connection.socket.on('close', () => {
    server.log.info(`WebSocket client disconnected: ${clientId}`);
  });

  // Handle connection errors
  connection.socket.on('error', (error: Error) => {
    server.log.error(`WebSocket error for ${clientId}:`, error);
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
    await server.listen({ port, host });

    server.log.info(`Server listening on http://${host}:${port}`);
    server.log.info('Available endpoints:');
    server.log.info(`  - GET  / (health check)`);
    server.log.info(`  - GET  /api/ping (connectivity test)`);
    server.log.info(`  - GET  /api/game/state (game state)`);
    server.log.info(`  - WS   /ws (WebSocket for real-time game)`);
  } catch (err) {
    server.log.error('Failed to start server:', err);
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