/**
 * Tournament API Tests
 * 
 * Tests for tournament creation, listing, joining, starting, and match management
 */

import { FastifyInstance } from 'fastify';
import { DatabaseService } from '../src/services/databaseService';
import { initializeDatabase } from '../src/utils/databaseInit';
import { UserService } from '../src/services/userService';

describe('Tournament API', () => {
  let app: FastifyInstance;
  let testUserId: number;
  let testToken: string;
  let testCounter = 0;

  beforeEach(async () => {
    testCounter++;
    
    // Initialize Fastify app for testing
    app = require('fastify')();
    
    // Initialize database and schema
    await DatabaseService.initialize();
    await initializeDatabase();
    
    // Create a unique test user for each test first
    const uniqueUsername = `tournamentuser${testCounter}`;
    const uniqueEmail = `tournament${testCounter}@test.com`;
    const user = await UserService.registerUser(uniqueUsername, uniqueEmail, 'password123');
    testUserId = Number(user.id);
    
    // Register tournament routes without JWT middleware
    await app.register(async (fastify: FastifyInstance) => {
      // Tournament routes with mocked authentication
      fastify.post('/api/tournaments', async (request: any, reply: any) => {
        // Check if user is authenticated
        if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Authentication required' });
        }

        // Mock user data for testing
        request.user = { userId: testUserId.toString(), username: `tournamentuser${testCounter}` };

        const { name, description, maxParticipants } = request.body || {};
        if (!name || !maxParticipants) {
          return reply.status(400).send({ error: 'name and maxParticipants are required' });
        }
        
        if (maxParticipants < 2 || maxParticipants > 64) {
          return reply.status(400).send({ error: 'maxParticipants must be between 2 and 64' });
        }

        const createdBy = request.user?.userId ? Number(request.user.userId) : undefined;
        
        try {
          const { TournamentService } = require('../src/services/tournamentService');
          const tournament = await TournamentService.createTournament({
            name,
            description,
            maxParticipants: Number(maxParticipants),
            createdBy,
          });
          return reply.status(201).send(tournament);
        } catch (error: any) {
          reply.status(500).send({ error: error.message || 'Failed to create tournament' });
        }
      });

      fastify.get('/api/tournaments', async (request: any, reply: any) => {
        try {
          const { TournamentService } = require('../src/services/tournamentService');
          const tournaments = await TournamentService.listTournaments();
          return tournaments;
        } catch (error: any) {
          reply.status(500).send({ error: error.message || 'Failed to list tournaments' });
        }
      });

      fastify.get('/api/tournaments/:id', async (request: any, reply: any) => {
        try {
          const id = Number(request.params.id);
          if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid tournament ID' });
          }

          const { TournamentService } = require('../src/services/tournamentService');
          const tournament = await TournamentService.getTournamentById(id);
          if (!tournament) {
            return reply.status(404).send({ error: 'Tournament not found' });
          }
          return tournament;
        } catch (error: any) {
          reply.status(500).send({ error: error.message || 'Failed to get tournament' });
        }
      });

      fastify.post('/api/tournaments/:id/join', async (request: any, reply: any) => {
        // Check if user is authenticated
        if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Authentication required' });
        }

        // Mock user data for testing
        request.user = { userId: testUserId.toString(), username: `tournamentuser${testCounter}` };

        try {
          const id = Number(request.params.id);
          if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid tournament ID' });
          }

          const userId = Number(request.user?.userId);
          if (!userId) {
            return reply.status(401).send({ error: 'Unauthorized' });
          }

          const { TournamentService } = require('../src/services/tournamentService');
          await TournamentService.joinTournament(id, userId);
          return reply.status(200).send({ message: 'Successfully joined tournament' });
        } catch (error: any) {
          if (error.message.includes('not accepting participants')) {
            reply.status(400).send({ error: error.message });
          } else if (error.message.includes('already a participant')) {
            reply.status(400).send({ error: error.message });
          } else if (error.message.includes('is full')) {
            reply.status(400).send({ error: error.message });
          } else {
            reply.status(500).send({ error: error.message || 'Failed to join tournament' });
          }
        }
      });

      fastify.post('/api/tournaments/:id/start', async (request: any, reply: any) => {
        // Check if user is authenticated
        if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
          return reply.status(401).send({ error: 'Authentication required' });
        }

        // Mock user data for testing
        request.user = { userId: testUserId.toString(), username: `tournamentuser${testCounter}` };

        try {
          const id = Number(request.params.id);
          if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid tournament ID' });
          }

          const { TournamentService } = require('../src/services/tournamentService');
          await TournamentService.startTournament(id);
          return reply.status(200).send({ message: 'Tournament started successfully' });
        } catch (error: any) {
          if (error.message.includes('Not enough participants')) {
            reply.status(400).send({ error: error.message });
          } else {
            reply.status(500).send({ error: error.message || 'Failed to start tournament' });
          }
        }
      });

      fastify.get('/api/tournaments/:id/brackets', async (request: any, reply: any) => {
        try {
          const id = Number(request.params.id);
          if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid tournament ID' });
          }

          const { TournamentService } = require('../src/services/tournamentService');
          const brackets = await TournamentService.getBrackets(id);
          return brackets;
        } catch (error: any) {
          reply.status(500).send({ error: error.message || 'Failed to get brackets' });
        }
      });

      fastify.get('/api/tournaments/:id/matches', async (request: any, reply: any) => {
        try {
          const id = Number(request.params.id);
          if (isNaN(id)) {
            return reply.status(400).send({ error: 'Invalid tournament ID' });
          }

          const { TournamentService } = require('../src/services/tournamentService');
          const matches = await TournamentService.listMatches(id);
          return matches;
        } catch (error: any) {
          reply.status(500).send({ error: error.message || 'Failed to get matches' });
        }
      });
    });
    
    // Mock JWT token for testing
    testToken = 'mock-jwt-token';
  });

  afterEach(async () => {
    // Clean up database tables
    try {
      await DatabaseService.run('DELETE FROM tournament_matches');
      await DatabaseService.run('DELETE FROM tournament_participants');
      await DatabaseService.run('DELETE FROM tournaments');
      await DatabaseService.run('DELETE FROM user_statistics');
      await DatabaseService.run('DELETE FROM game_results');
      await DatabaseService.run('DELETE FROM game_sessions');
      await DatabaseService.run('DELETE FROM password_reset_tokens');
      await DatabaseService.run('DELETE FROM users');
    } catch (error) {
      // Ignore cleanup errors
    }
    
    await DatabaseService.close();
    await app.close();
  });

  describe('Tournament Creation', () => {
    it('should create a new tournament', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'Test Tournament',
          description: 'A test tournament',
          maxParticipants: 8
        }
      });

      expect(response.statusCode).toBe(201);
      const tournament = JSON.parse(response.payload);
      expect(tournament.name).toBe('Test Tournament');
      expect(tournament.max_participants).toBe(8);
      expect(tournament.status).toBe('registration');
    });

    it('should require authentication for tournament creation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        payload: {
          name: 'Test Tournament',
          maxParticipants: 8
        }
      });

      expect(response.statusCode).toBe(401);
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: '',
          maxParticipants: 0
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Tournament Listing', () => {
    it('should list tournaments', async () => {
      // Create a tournament first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'List Test Tournament',
          maxParticipants: 4
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const createdTournament = JSON.parse(createResponse.payload);

      // List tournaments
      const response = await app.inject({
        method: 'GET',
        url: '/api/tournaments'
      });

      expect(response.statusCode).toBe(200);
      const tournaments = JSON.parse(response.payload);
      expect(Array.isArray(tournaments)).toBe(true);
      expect(tournaments.length).toBeGreaterThan(0);
      expect(tournaments[0].name).toBe('List Test Tournament');
    });
  });

  describe('Tournament Details', () => {
    it('should get tournament by ID', async () => {
      // Create a tournament first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'Detail Test Tournament',
          maxParticipants: 4
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const tournament = JSON.parse(createResponse.payload);

      // Get tournament details
      const response = await app.inject({
        method: 'GET',
        url: `/api/tournaments/${tournament.id}`
      });

      expect(response.statusCode).toBe(200);
      const details = JSON.parse(response.payload);
      expect(details.id).toBe(tournament.id);
      expect(details.name).toBe('Detail Test Tournament');
    });

    it('should return 404 for non-existent tournament', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/tournaments/999999'
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Tournament Joining', () => {
    it('should allow user to join tournament', async () => {
      // Create a tournament first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'Join Test Tournament',
          maxParticipants: 4
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const tournament = JSON.parse(createResponse.payload);

      // Join the tournament
      const response = await app.inject({
        method: 'POST',
        url: `/api/tournaments/${tournament.id}/join`,
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should require authentication for joining', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments/1/join'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Tournament Starting', () => {
    it('should start tournament with participants', async () => {
      // Create a tournament first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'Start Test Tournament',
          maxParticipants: 4
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const tournament = JSON.parse(createResponse.payload);

      // Join the tournament with two participants
      await app.inject({
        method: 'POST',
        url: `/api/tournaments/${tournament.id}/join`,
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });

      // Create another user and join tournament
      const user2 = await UserService.registerUser(`tournamentuser2_${testCounter}`, `tournament2_${testCounter}@test.com`, 'password123');
      await DatabaseService.run(
        'INSERT INTO tournament_participants (tournament_id, user_id) VALUES (?, ?)',
        [tournament.id, user2.id]
      );

      // Start the tournament
      const response = await app.inject({
        method: 'POST',
        url: `/api/tournaments/${tournament.id}/start`,
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(200);
    });

    it('should require authentication for starting', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments/1/start'
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Tournament Matches', () => {
    it('should list tournament matches', async () => {
      // Create and start a tournament first
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'Matches Test Tournament',
          maxParticipants: 4
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const tournament = JSON.parse(createResponse.payload);

      const response = await app.inject({
        method: 'GET',
        url: `/api/tournaments/${tournament.id}/matches`
      });

      expect(response.statusCode).toBe(200);
      const matches = JSON.parse(response.payload);
      expect(Array.isArray(matches)).toBe(true);
    });

    it('should get tournament brackets', async () => {
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        },
        payload: {
          name: 'Brackets Test Tournament',
          maxParticipants: 8
        }
      });

      expect(createResponse.statusCode).toBe(201);
      const tournament = JSON.parse(createResponse.payload);

      const response = await app.inject({
        method: 'GET',
        url: `/api/tournaments/${tournament.id}/brackets`
      });

      expect(response.statusCode).toBe(200);
      const brackets = JSON.parse(response.payload);
      expect(typeof brackets).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid tournament ID', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments/invalid/join',
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('should handle missing request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/tournaments',
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
