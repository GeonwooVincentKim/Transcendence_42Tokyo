/**
 * Tournament Service Tests
 * 
 * Comprehensive test suite for tournament functionality
 */

import { TournamentService, CreateTournamentInput, JoinTournamentInput } from '../src/services/tournamentService';
import { DatabaseService } from '../src/services/databaseService';

// Mock database service
jest.mock('../src/services/databaseService');

describe('TournamentService', () => {
  let mockDatabaseService: jest.Mocked<typeof DatabaseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDatabaseService = DatabaseService as jest.Mocked<typeof DatabaseService>;
  });

  describe('createTournament', () => {
    it('should create a tournament with valid input', async () => {
      const input: CreateTournamentInput = {
        name: 'Test Tournament',
        description: 'A test tournament',
        max_participants: 8,
        tournament_type: 'single_elimination',
        created_by: 1
      };

      mockDatabaseService.get.mockResolvedValueOnce({ id: 1, username: 'testuser' });
      mockDatabaseService.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        description: 'A test tournament',
        max_participants: 8,
        status: 'registration',
        tournament_type: 'single_elimination',
        created_by: 1,
        created_at: '2024-01-01T00:00:00Z',
        started_at: null,
        finished_at: null,
        settings: null
      });

      const result = await TournamentService.createTournament(input);

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Tournament');
      expect(result.max_participants).toBe(8);
      expect(result.tournament_type).toBe('single_elimination');
    });

    it('should throw error for empty tournament name', async () => {
      const input: CreateTournamentInput = {
        name: '',
        max_participants: 8
      };

      await expect(TournamentService.createTournament(input)).rejects.toThrow('Tournament name is required');
    });

    it('should throw error for invalid max participants', async () => {
      const input: CreateTournamentInput = {
        name: 'Test Tournament',
        max_participants: 1
      };

      await expect(TournamentService.createTournament(input)).rejects.toThrow('Max participants must be between 2 and 64');
    });

    it('should throw error for invalid tournament type', async () => {
      const input: CreateTournamentInput = {
        name: 'Test Tournament',
        max_participants: 8,
        tournament_type: 'invalid_type' as any
      };

      await expect(TournamentService.createTournament(input)).rejects.toThrow('Invalid tournament type');
    });

    it('should throw error for non-existent user', async () => {
      const input: CreateTournamentInput = {
        name: 'Test Tournament',
        max_participants: 8,
        created_by: 999
      };

      mockDatabaseService.get.mockResolvedValueOnce(null);

      await expect(TournamentService.createTournament(input)).rejects.toThrow('User not found');
    });
  });

  describe('joinTournament', () => {
    beforeEach(() => {
      // Mock tournament exists and is in registration phase
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'registration',
        max_participants: 8
      });
    });

    it('should allow registered user to join tournament', async () => {
      const input: JoinTournamentInput = {
        tournament_id: 1,
        user_id: 1,
        display_name: 'Test User'
      };

      mockDatabaseService.get.mockResolvedValueOnce(null); // Not already in tournament
      mockDatabaseService.get.mockResolvedValueOnce({ username: 'testuser' }); // User exists
      mockDatabaseService.get.mockResolvedValueOnce({ count: 2 }); // Participant count
      mockDatabaseService.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        tournament_id: 1,
        user_id: 1,
        guest_alias: null,
        display_name: 'Test User',
        avatar_url: null,
        joined_at: '2024-01-01T00:00:00Z',
        eliminated_at: null,
        final_rank: null,
        seed: null,
        is_ready: false
      });

      const result = await TournamentService.joinTournament(input);

      expect(result).toBeDefined();
      expect(result.user_id).toBe(1);
      expect(result.display_name).toBe('Test User');
    });

    it('should allow guest user to join tournament', async () => {
      const input: JoinTournamentInput = {
        tournament_id: 1,
        guest_alias: 'guest123',
        display_name: 'Guest Player'
      };

      mockDatabaseService.get.mockResolvedValueOnce(null); // Guest alias not taken
      mockDatabaseService.get.mockResolvedValueOnce({ count: 2 }); // Participant count
      mockDatabaseService.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        tournament_id: 1,
        user_id: null,
        guest_alias: 'guest123',
        display_name: 'Guest Player',
        avatar_url: null,
        joined_at: '2024-01-01T00:00:00Z',
        eliminated_at: null,
        final_rank: null,
        seed: null,
        is_ready: false
      });

      const result = await TournamentService.joinTournament(input);

      expect(result).toBeDefined();
      expect(result.guest_alias).toBe('guest123');
      expect(result.display_name).toBe('Guest Player');
    });

    it('should throw error for empty display name', async () => {
      const input: JoinTournamentInput = {
        tournament_id: 1,
        user_id: 1,
        display_name: ''
      };

      await expect(TournamentService.joinTournament(input)).rejects.toThrow('Display name is required');
    });

    it('should throw error when tournament is full', async () => {
      const input: JoinTournamentInput = {
        tournament_id: 1,
        user_id: 1,
        display_name: 'Test User'
      };

      mockDatabaseService.get.mockResolvedValueOnce(null); // Not already in tournament
      mockDatabaseService.get.mockResolvedValueOnce({ username: 'testuser' }); // User exists
      mockDatabaseService.get.mockResolvedValueOnce({ count: 8 }); // Tournament is full

      await expect(TournamentService.joinTournament(input)).rejects.toThrow('Tournament is full');
    });

    it('should throw error when user is already in tournament', async () => {
      const input: JoinTournamentInput = {
        tournament_id: 1,
        user_id: 1,
        display_name: 'Test User'
      };

      mockDatabaseService.get.mockResolvedValueOnce({ id: 1 }); // Already in tournament

      await expect(TournamentService.joinTournament(input)).rejects.toThrow('User is already in this tournament');
    });
  });

  describe('startTournament', () => {
    it('should start tournament with enough participants', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'registration',
        tournament_type: 'single_elimination'
      });

      mockDatabaseService.query.mockResolvedValueOnce([
        { id: 1, user_id: 1, display_name: 'Player 1' },
        { id: 2, user_id: 2, display_name: 'Player 2' }
      ]);

      mockDatabaseService.run.mockResolvedValue({ lastID: 1, changes: 1 });

      await TournamentService.startTournament(1);

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        'UPDATE tournaments SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['active', 1]
      );
    });

    it('should throw error when not enough participants', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'registration',
        tournament_type: 'single_elimination'
      });

      mockDatabaseService.query.mockResolvedValueOnce([
        { id: 1, user_id: 1, display_name: 'Player 1' }
      ]);

      await expect(TournamentService.startTournament(1)).rejects.toThrow('Not enough participants to start tournament');
    });

    it('should throw error when tournament is not in registration phase', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'active',
        tournament_type: 'single_elimination'
      });

      await expect(TournamentService.startTournament(1)).rejects.toThrow('Tournament is not in registration phase');
    });
  });

  describe('updateMatchResult', () => {
    it('should update match result successfully', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        tournament_id: 1,
        player1_id: 1,
        player2_id: 2,
        status: 'active'
      });

      mockDatabaseService.run.mockResolvedValue({ lastID: 1, changes: 1 });
      mockDatabaseService.get.mockResolvedValueOnce({ count: 0 }); // No pending matches

      await TournamentService.updateMatchResult(1, 1, 5, 3, 'session123');

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE tournament_matches'),
        [1, 5, 3, 'completed', 'session123', 1]
      );
    });

    it('should throw error for invalid winner', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        tournament_id: 1,
        player1_id: 1,
        player2_id: 2,
        status: 'active'
      });

      await expect(TournamentService.updateMatchResult(1, 3, 5, 3)).rejects.toThrow('Invalid winner');
    });

    it('should throw error when match is not active', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        tournament_id: 1,
        player1_id: 1,
        player2_id: 2,
        status: 'completed'
      });

      await expect(TournamentService.updateMatchResult(1, 1, 5, 3)).rejects.toThrow('Match is not active');
    });
  });

  describe('getTournamentStats', () => {
    it('should return tournament statistics', async () => {
      mockDatabaseService.get
        .mockResolvedValueOnce({ count: 10 }) // total_tournaments
        .mockResolvedValueOnce({ count: 3 })  // active_tournaments
        .mockResolvedValueOnce({ count: 5 })  // completed_tournaments
        .mockResolvedValueOnce({ count: 25 }) // total_participants
        .mockResolvedValueOnce({ count: 15 }); // total_matches

      const stats = await TournamentService.getTournamentStats();

      expect(stats).toEqual({
        total_tournaments: 10,
        active_tournaments: 3,
        completed_tournaments: 5,
        total_participants: 25,
        total_matches: 15
      });
    });
  });

  describe('leaveTournament', () => {
    it('should allow user to leave tournament in registration phase', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'registration'
      });

      mockDatabaseService.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });

      await TournamentService.leaveTournament(1, 1);

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        'DELETE FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
        [1, 1]
      );
    });

    it('should throw error when trying to leave active tournament', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'active'
      });

      await expect(TournamentService.leaveTournament(1, 1)).rejects.toThrow('Cannot leave tournament after it has started');
    });
  });

  describe('cancelTournament', () => {
    it('should cancel tournament successfully', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'registration'
      });

      mockDatabaseService.run.mockResolvedValueOnce({ lastID: 1, changes: 1 });

      await TournamentService.cancelTournament(1);

      expect(mockDatabaseService.run).toHaveBeenCalledWith(
        'UPDATE tournaments SET status = ? WHERE id = ?',
        ['cancelled', 1]
      );
    });

    it('should throw error when trying to cancel completed tournament', async () => {
      mockDatabaseService.get.mockResolvedValueOnce({
        id: 1,
        name: 'Test Tournament',
        status: 'completed'
      });

      await expect(TournamentService.cancelTournament(1)).rejects.toThrow('Cannot cancel completed tournament');
    });
  });
});
