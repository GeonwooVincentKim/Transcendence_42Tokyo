/**
 * Tournament Routes
 * 
 * API endpoints for tournament management
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TournamentService, CreateTournamentInput, JoinTournamentInput } from '../services/tournamentService';

// Request/Response interfaces - using Fastify's built-in types

/**
 * Register tournament routes
 */
export async function tournamentRoutes(fastify: FastifyInstance) {
  // Create tournament
  fastify.post('/api/tournaments', {
    schema: {
      description: 'Create a new tournament',
      tags: ['tournaments'],
      body: {
        type: 'object',
        required: ['name', 'max_participants'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          max_participants: { type: 'integer', minimum: 2, maximum: 64 },
          tournament_type: { 
            type: 'string', 
            enum: ['single_elimination', 'double_elimination', 'round_robin'],
            default: 'single_elimination'
          },
          created_by: { type: 'integer' },
          settings: { type: 'object' }
        }
      },
      response: {
        201: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                max_participants: { type: 'integer' },
                status: { type: 'string' },
                tournament_type: { type: 'string' },
                created_by: { type: 'integer' },
                created_at: { type: 'string' },
                started_at: { type: 'string' },
                finished_at: { type: 'string' },
                settings: { type: 'string' }
              }
            }
          }
        },
        400: {
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
      const tournament = await TournamentService.createTournament(request.body as CreateTournamentInput);
      reply.code(201).send({
        success: true,
        data: tournament
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create tournament'
      });
    }
  });

  // List tournaments
  fastify.get('/api/tournaments', {
    schema: {
      description: 'List tournaments with optional filters',
      tags: ['tournaments'],
      querystring: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          tournament_type: { type: 'string' },
          created_by: { type: 'string' },
          limit: { type: 'string' },
          offset: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  max_participants: { type: 'integer' },
                  status: { type: 'string' },
                  tournament_type: { type: 'string' },
                  created_by: { type: 'integer' },
                  created_at: { type: 'string' },
                  started_at: { type: 'string' },
                  finished_at: { type: 'string' },
                  settings: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const filters: any = {};
      
      const query = request.query as any;
      if (query.status) filters.status = query.status;
      if (query.tournament_type) filters.tournament_type = query.tournament_type;
      if (query.created_by) filters.created_by = parseInt(query.created_by);
      if (query.limit) filters.limit = parseInt(query.limit);
      if (query.offset) filters.offset = parseInt(query.offset);

      const tournaments = await TournamentService.listTournaments(filters);
      reply.send({
        success: true,
        data: tournaments
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list tournaments'
      });
    }
  });

  // Get tournament by ID
  fastify.get('/api/tournaments/:id', {
    schema: {
      description: 'Get tournament by ID',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
                description: { type: 'string' },
                max_participants: { type: 'integer' },
                status: { type: 'string' },
                tournament_type: { type: 'string' },
                created_by: { type: 'integer' },
                created_at: { type: 'string' },
                started_at: { type: 'string' },
                finished_at: { type: 'string' },
                settings: { type: 'string' }
              }
            }
          }
        },
        404: {
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
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      const tournament = await TournamentService.getTournament(tournamentId);
      if (!tournament) {
        return reply.code(404).send({
          success: false,
          error: 'Tournament not found'
        });
      }

      reply.send({
        success: true,
        data: tournament
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tournament'
      });
    }
  });

  // Join tournament
  fastify.post('/api/tournaments/:id/join', {
    schema: {
      description: 'Join a tournament',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        required: ['display_name'],
        properties: {
          user_id: { type: 'integer' },
          guest_alias: { type: 'string' },
          display_name: { type: 'string', minLength: 1, maxLength: 50 },
          avatar_url: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                tournament_id: { type: 'integer' },
                user_id: { type: 'integer' },
                guest_alias: { type: 'string' },
                display_name: { type: 'string' },
                avatar_url: { type: 'string' },
                joined_at: { type: 'string' },
                eliminated_at: { type: 'string' },
                final_rank: { type: 'integer' },
                seed: { type: 'integer' },
                is_ready: { type: 'boolean' }
              }
            }
          }
        },
        400: {
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
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      const body = request.body as any;
      const joinInput: JoinTournamentInput = {
        tournament_id: tournamentId,
        user_id: body.user_id,
        guest_alias: body.guest_alias,
        display_name: body.display_name,
        avatar_url: body.avatar_url
      };

      const participant = await TournamentService.joinTournament(joinInput);
      reply.send({
        success: true,
        data: participant
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to join tournament'
      });
    }
  });

  // Leave tournament
  fastify.post('/api/tournaments/:id/leave', {
    schema: {
      description: 'Leave a tournament',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {
          user_id: { type: 'integer' },
          guest_alias: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
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
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      const body = request.body as any;
      await TournamentService.leaveTournament(
        tournamentId,
        body.user_id,
        body.guest_alias
      );

      reply.send({
        success: true,
        message: 'Successfully left tournament'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to leave tournament'
      });
    }
  });

  // Get tournament participants
  fastify.get('/api/tournaments/:id/participants', {
    schema: {
      description: 'Get tournament participants',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  tournament_id: { type: 'integer' },
                  user_id: { type: 'integer' },
                  guest_alias: { type: 'string' },
                  display_name: { type: 'string' },
                  avatar_url: { type: 'string' },
                  joined_at: { type: 'string' },
                  eliminated_at: { type: 'string' },
                  final_rank: { type: 'integer' },
                  seed: { type: 'integer' },
                  is_ready: { type: 'boolean' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      const participants = await TournamentService.getTournamentParticipants(tournamentId);
      reply.send({
        success: true,
        data: participants
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get participants'
      });
    }
  });

  // Get tournament matches
  fastify.get('/api/tournaments/:id/matches', {
    schema: {
      description: 'Get tournament matches',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  tournament_id: { type: 'integer' },
                  round: { type: 'integer' },
                  match_number: { type: 'integer' },
                  bracket_position: { type: 'integer' },
                  player1_id: { type: 'integer' },
                  player2_id: { type: 'integer' },
                  winner_id: { type: 'integer' },
                  status: { type: 'string' },
                  player1_score: { type: 'integer' },
                  player2_score: { type: 'integer' },
                  game_session_id: { type: 'string' },
                  created_at: { type: 'string' },
                  started_at: { type: 'string' },
                  finished_at: { type: 'string' },
                  match_data: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      const matches = await TournamentService.getTournamentMatches(tournamentId);
      reply.send({
        success: true,
        data: matches
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get matches'
      });
    }
  });

  // Get tournament bracket
  fastify.get('/api/tournaments/:id/bracket', {
    schema: {
      description: 'Get tournament bracket',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  match_id: { type: 'integer' },
                  player1: { type: 'object' },
                  player2: { type: 'object' },
                  winner: { type: 'object' },
                  round: { type: 'integer' },
                  position: {
                    type: 'object',
                    properties: {
                      x: { type: 'integer' },
                      y: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      const bracket = await TournamentService.getTournamentBracket(tournamentId);
      reply.send({
        success: true,
        data: bracket
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get bracket'
      });
    }
  });

  // Start tournament
  fastify.post('/api/tournaments/:id/start', {
    schema: {
      description: 'Start a tournament',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      body: {
        type: 'object',
        properties: {},
        additionalProperties: false
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
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
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      await TournamentService.startTournament(tournamentId);
      reply.send({
        success: true,
        message: 'Tournament started successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start tournament'
      });
    }
  });

  // Update match result
  fastify.post('/api/tournaments/:id/matches/:matchId/result', {
    schema: {
      description: 'Update match result',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          matchId: { type: 'string' }
        },
        required: ['id', 'matchId']
      },
      body: {
        type: 'object',
        required: ['winner_id', 'player1_score', 'player2_score'],
        properties: {
          winner_id: { type: 'integer' },
          player1_score: { type: 'integer', minimum: 0 },
          player2_score: { type: 'integer', minimum: 0 },
          game_session_id: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
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
      const tournamentId = parseInt((request.params as any).id);
      const matchId = parseInt((request.params as any).matchId);
      
      if (isNaN(tournamentId) || isNaN(matchId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament or match ID'
        });
      }

      const body = request.body as any;
      await TournamentService.updateMatchResult(
        matchId,
        body.winner_id,
        body.player1_score,
        body.player2_score,
        body.game_session_id
      );

      reply.send({
        success: true,
        message: 'Match result updated successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update match result'
      });
    }
  });

  // Get tournament statistics
  fastify.get('/api/tournaments/stats', {
    schema: {
      description: 'Get tournament statistics',
      tags: ['tournaments'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                total_tournaments: { type: 'integer' },
                active_tournaments: { type: 'integer' },
                completed_tournaments: { type: 'integer' },
                total_participants: { type: 'integer' },
                total_matches: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const stats = await TournamentService.getTournamentStats();
      reply.send({
        success: true,
        data: stats
      });
    } catch (error) {
      reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get tournament stats'
      });
    }
  });

  // Cancel tournament
  fastify.post('/api/tournaments/:id/cancel', {
    schema: {
      description: 'Cancel a tournament',
      tags: ['tournaments'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        },
        400: {
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
      const tournamentId = parseInt((request.params as any).id);
      if (isNaN(tournamentId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid tournament ID'
        });
      }

      await TournamentService.cancelTournament(tournamentId);
      reply.send({ 
        success: true,
        message: 'Tournament cancelled successfully'
      });
    } catch (error) {
      reply.code(400).send({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel tournament'
      });
    }
  });

  // Clear all tournament data (admin function)
  fastify.delete('/api/tournaments/clear', {
    schema: {
      description: 'Clear all tournament data (preserves user data)',
      tags: ['tournaments'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
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
      await TournamentService.clearAllTournamentData();
      reply.send({ success: true, message: 'All tournament data cleared successfully' });
    } catch (error) {
      console.error('Error clearing tournament data:', error);
      reply.code(500).send({ success: false, error: 'Failed to clear tournament data' });
    }
  });
}
