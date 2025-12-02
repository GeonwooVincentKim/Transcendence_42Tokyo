import request from 'supertest';
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';

/**
 * Test suite for Pong Game Backend Server
 */
describe('Pong Game Backend Server', () => {
  let server: FastifyInstance;

  /**
   * Setup test server before each test
   */
  beforeEach(async () => {
    server = Fastify({
      logger: false // Disable logging for tests
    });

    // Register plugins
    await server.register(cors, {
      origin: '*',
      credentials: true
    });

    // Register routes
    server.get('/', async (request: any, reply: any) => {
      return { 
        status: 'ok', 
        message: 'Pong Game Backend Server',
        timestamp: new Date().toISOString()
      };
    });

    server.get('/api/ping', async (request: any, reply: any) => {
      return { 
        message: 'pong',
        timestamp: new Date().toISOString()
      };
    });

    server.get('/api/game/state', async (request: any, reply: any) => {
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

    await server.ready();
  });

  /**
   * Cleanup after each test
   */
  afterEach(async () => {
    await server.close();
  });

  describe('Health Check Endpoint', () => {
    it('should return server status', async () => {
      const response = await request(server.server)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('message', 'Pong Game Backend Server');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('API Ping Endpoint', () => {
    it('should return pong message', async () => {
      const response = await request(server.server)
        .get('/api/ping')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'pong');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Game State Endpoint', () => {
    it('should return game state', async () => {
      const response = await request(server.server)
        .get('/api/game/state')
        .expect(200);

      expect(response.body).toHaveProperty('gameState');
      expect(response.body.gameState).toHaveProperty('leftScore');
      expect(response.body.gameState).toHaveProperty('rightScore');
      expect(response.body.gameState).toHaveProperty('ballPosition');
      expect(response.body.gameState).toHaveProperty('leftPaddle');
      expect(response.body.gameState).toHaveProperty('rightPaddle');
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should return correct game state structure', async () => {
      const response = await request(server.server)
        .get('/api/game/state')
        .expect(200);

      const { gameState } = response.body;

      expect(gameState.leftScore).toBe(0);
      expect(gameState.rightScore).toBe(0);
      expect(gameState.ballPosition).toEqual({ x: 400, y: 200 });
      expect(gameState.leftPaddle).toEqual({ y: 150 });
      expect(gameState.rightPaddle).toEqual({ y: 150 });
    });
  });

  describe('CORS Configuration', () => {
    it('should allow CORS requests', async () => {
      const response = await request(server.server)
        .get('/api/ping')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe('*');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      await request(server.server)
        .get('/unknown-route')
        .expect(404);
    });
  });
}); 