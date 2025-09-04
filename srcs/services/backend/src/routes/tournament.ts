/**
 * Tournament Routes
 */

import { FastifyInstance } from 'fastify';
import jwt from '@fastify/jwt';
import { TournamentService } from '../services/tournamentService';

export async function tournamentRoutes(fastify: FastifyInstance) {
  const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  await fastify.register(jwt, { secret: jwtSecret });

  const requireAuth = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  };

  // Create tournament
  fastify.post('/api/tournaments', { preHandler: requireAuth }, async (request: any, reply) => {
    try {
      const { name, description, maxParticipants } = request.body || {};
      if (!name || !maxParticipants) {
        return reply.status(400).send({ error: 'name and maxParticipants are required' });
      }
      
      if (maxParticipants < 2 || maxParticipants > 64) {
        return reply.status(400).send({ error: 'maxParticipants must be between 2 and 64' });
      }

      const createdBy = request.user?.userId ? Number(request.user.userId) : undefined;
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

  // List all tournaments
  fastify.get('/api/tournaments', async (request: any, reply) => {
    try {
      const tournaments = await TournamentService.listTournaments();
      return reply.send(tournaments);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to list tournaments' });
    }
  });

  // Get tournament by ID
  fastify.get('/api/tournaments/:id', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const tournament = await TournamentService.getTournamentById(id);
      if (!tournament) {
        return reply.status(404).send({ error: 'Tournament not found' });
      }
      return reply.send(tournament);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get tournament' });
    }
  });

  // Get tournament participants
  fastify.get('/api/tournaments/:id/participants', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const participants = await TournamentService.getTournamentParticipants(id);
      return reply.send(participants);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get participants' });
    }
  });

  // Join tournament
  fastify.post('/api/tournaments/:id/join', { preHandler: requireAuth }, async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const userId = Number(request.user?.userId);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

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

  // Start tournament
  fastify.post('/api/tournaments/:id/start', { preHandler: requireAuth }, async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

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

  // Get tournament brackets
  fastify.get('/api/tournaments/:id/brackets', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const brackets = await TournamentService.getBrackets(id);
      return reply.send(brackets);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get brackets' });
    }
  });

  // Get tournament matches
  fastify.get('/api/tournaments/:id/matches', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const matches = await TournamentService.listMatches(id);
      return reply.send(matches);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get matches' });
    }
  });

  // Get current match
  fastify.get('/api/tournaments/:id/current-match', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const currentMatch = await TournamentService.getCurrentMatch(id);
      return reply.send(currentMatch);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get current match' });
    }
  });

  // Get next match
  fastify.get('/api/tournaments/:id/next-match', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const nextMatch = await TournamentService.getNextMatch(id);
      return reply.send(nextMatch);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get next match' });
    }
  });

  // Start match
  fastify.post('/api/tournaments/:id/matches/:matchId/start', { preHandler: requireAuth }, async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      const matchId = Number(request.params.matchId);
      
      if (isNaN(id) || isNaN(matchId)) {
        return reply.status(400).send({ error: 'Invalid tournament or match ID' });
      }

      await TournamentService.startMatch(id, matchId);
      return reply.status(200).send({ message: 'Match started successfully' });
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to start match' });
    }
  });

  // Report match result
  fastify.post('/api/tournaments/:id/matches/:matchId/result', { preHandler: requireAuth }, async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      const matchId = Number(request.params.matchId);
      const { winnerUserId, player1Score = 0, player2Score = 0 } = request.body || {};
      
      if (isNaN(id) || isNaN(matchId)) {
        return reply.status(400).send({ error: 'Invalid tournament or match ID' });
      }
      
      if (!winnerUserId) {
        return reply.status(400).send({ error: 'winnerUserId is required' });
      }

      await TournamentService.reportMatchResult(id, matchId, Number(winnerUserId), Number(player1Score), Number(player2Score));
      return reply.status(200).send({ message: 'Match result reported successfully' });
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to report match result' });
    }
  });

  // Get tournament statistics
  fastify.get('/api/tournaments/:id/stats', async (request: any, reply) => {
    try {
      const id = Number(request.params.id);
      if (isNaN(id)) {
        return reply.status(400).send({ error: 'Invalid tournament ID' });
      }

      const stats = await TournamentService.getTournamentStats(id);
      return reply.send(stats);
    } catch (error: any) {
      reply.status(500).send({ error: error.message || 'Failed to get tournament stats' });
    }
  });
}


