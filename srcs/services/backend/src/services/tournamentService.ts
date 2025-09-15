/**
 * Tournament Service
 *
 * Comprehensive tournament management service supporting both registered and guest users
 * with single elimination, double elimination, and round robin tournament types
 */

import { DatabaseService } from './databaseService';

// Tournament Types
export type TournamentStatus = 'registration' | 'active' | 'completed' | 'cancelled';
export type TournamentType = 'single_elimination' | 'double_elimination' | 'round_robin';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'forfeit';

// Interfaces
export interface Tournament {
  id: number;
  name: string;
  description?: string | null;
  max_participants: number;
  status: TournamentStatus;
  tournament_type: TournamentType;
  created_by?: number | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  settings?: string | null; // JSON string
}

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  user_id?: number | null;
  guest_alias?: string | null;
  display_name: string;
  avatar_url?: string | null;
  joined_at: string;
  eliminated_at?: string | null;
  final_rank?: number | null;
  seed?: number | null;
  is_ready: boolean;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  bracket_position?: number | null;
  player1_id?: number | null;
  player2_id?: number | null;
  winner_id?: number | null;
  status: MatchStatus;
  player1_score: number;
  player2_score: number;
  game_session_id?: string | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  match_data?: string | null; // JSON string
}

export interface TournamentBracket {
  id: number;
  tournament_id: number;
  bracket_type: string;
  round: number;
  match_id: number;
  position_x: number;
  position_y: number;
}

export interface CreateTournamentInput {
  name: string;
  description?: string;
  max_participants: number;
  tournament_type?: TournamentType;
  created_by?: number;
  settings?: Record<string, any>;
}

export interface JoinTournamentInput {
  tournament_id: number;
  user_id?: number;
  guest_alias?: string;
  display_name: string;
  avatar_url?: string;
}

export interface TournamentStats {
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_participants: number;
  total_matches: number;
}

export interface BracketNode {
  id: number;
  match_id?: number;
  player1?: TournamentParticipant;
  player2?: TournamentParticipant;
  winner?: TournamentParticipant;
  round: number;
  position: { x: number; y: number };
  children?: BracketNode[];
}

/**
 * Tournament Service Class
 * Handles all tournament-related operations
 */
export class TournamentService {
  /**
   * Create a new tournament
   */
  static async createTournament(input: CreateTournamentInput): Promise<Tournament> {
    const { name, description, max_participants, tournament_type = 'single_elimination', created_by, settings } = input;

    // Validate input
    if (!name || name.trim().length === 0) {
      throw new Error('Tournament name is required');
    }

    if (max_participants < 2 || max_participants > 64) {
      throw new Error('Max participants must be between 2 and 64');
    }

    // Validate tournament type
    const validTypes: TournamentType[] = ['single_elimination', 'double_elimination', 'round_robin'];
    if (!validTypes.includes(tournament_type)) {
      throw new Error('Invalid tournament type');
    }

    // Check if user exists (if provided and not 0)
    if (created_by && created_by > 0) {
      const user = await DatabaseService.get(
        'SELECT id FROM users WHERE id = ? AND is_active = 1',
        [created_by]
      );
      if (!user) {
        throw new Error('User not found');
      }
    }

    const settingsJson = settings ? JSON.stringify(settings) : null;
    // Convert created_by 0 to null for guest users
    const createdByValue = created_by && created_by > 0 ? created_by : null;

    const result = await DatabaseService.run(
      `INSERT INTO tournaments (name, description, max_participants, tournament_type, created_by, settings)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, max_participants, tournament_type, createdByValue, settingsJson]
    );

    console.log('Tournament creation result:', result);
    
    const tournamentId = result.lastInsertRowid || result.lastID;
    if (!tournamentId) {
      throw new Error('Failed to get tournament ID from creation result');
    }

    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Failed to create tournament');
    }
    
    return tournament;
  }

  /**
   * Get tournament by ID
   */
  static async getTournament(id: number): Promise<Tournament | null> {
    const row = await DatabaseService.get(
      'SELECT * FROM tournaments WHERE id = ?',
      [id]
    );
    return row as Tournament | null;
  }

  /**
   * List tournaments with optional filters
   */
  static async listTournaments(filters: {
    status?: TournamentStatus;
    tournament_type?: TournamentType;
    created_by?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<Tournament[]> {
    let query = 'SELECT * FROM tournaments WHERE 1=1';
    const params: any[] = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.tournament_type) {
      query += ' AND tournament_type = ?';
      params.push(filters.tournament_type);
    }

    if (filters.created_by) {
      query += ' AND created_by = ?';
      params.push(filters.created_by);
    }

    query += ' ORDER BY created_at DESC';

    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await DatabaseService.query(query, params);
    return rows as Tournament[];
  }

  /**
   * Join a tournament
   */
  static async joinTournament(input: JoinTournamentInput): Promise<TournamentParticipant> {
    const { tournament_id, user_id, guest_alias, display_name, avatar_url } = input;

    // Validate input
    if (!display_name || display_name.trim().length === 0) {
      throw new Error('Display name is required');
    }

    // For guest users, user_id can be null/undefined, but guest_alias must be provided
    // For registered users, user_id must be provided, guest_alias should be null/undefined
    if (!user_id && (!guest_alias || guest_alias.trim().length === 0)) {
      throw new Error('Either user_id or guest_alias is required');
    }

    if (user_id && guest_alias && guest_alias.trim().length > 0) {
      throw new Error('Cannot provide both user_id and guest_alias');
    }

    // Check if tournament exists and is in registration phase
    const tournament = await this.getTournament(tournament_id);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration') {
      throw new Error('Tournament is not accepting new participants');
    }

    // Check if user is already in tournament
    if (user_id) {
      const existingParticipant = await DatabaseService.get(
        'SELECT id FROM tournament_participants WHERE tournament_id = ? AND user_id = ?',
        [tournament_id, user_id]
      );
      if (existingParticipant) {
        throw new Error('User is already in this tournament');
      }

      // Verify user exists
      const user = await DatabaseService.get(
        'SELECT username FROM users WHERE id = ? AND is_active = 1',
        [user_id]
      );
      if (!user) {
        throw new Error('User not found');
      }
    }

    // Check if guest alias is already taken
    if (guest_alias) {
      const existingParticipant = await DatabaseService.get(
        'SELECT id FROM tournament_participants WHERE tournament_id = ? AND guest_alias = ?',
        [tournament_id, guest_alias]
      );
      if (existingParticipant) {
        throw new Error('Guest alias is already taken in this tournament');
      }
    }

    // Check if tournament is full
    const participantCount = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = ?',
      [tournament_id]
    ) as { count: number };

    if (participantCount.count >= tournament.max_participants) {
      throw new Error('Tournament is full');
    }

    // Add participant
    const result = await DatabaseService.run(
      `INSERT INTO tournament_participants (tournament_id, user_id, guest_alias, display_name, avatar_url)
       VALUES (?, ?, ?, ?, ?)`,
      [tournament_id, user_id, guest_alias, display_name, avatar_url]
    );

    const participantId = result.lastInsertRowid || result.lastID;
    if (!participantId) {
      throw new Error('Failed to get participant ID from creation result');
    }

    const participant = await this.getParticipant(participantId);
    if (!participant) {
      throw new Error('Failed to join tournament');
    }

    return participant;
  }

  /**
   * Leave a tournament
   */
  static async leaveTournament(tournamentId: number, userId?: number, guestAlias?: string): Promise<void> {
    if (!userId && (!guestAlias || guestAlias.trim().length === 0)) {
      throw new Error('Either user_id or guest_alias is required');
    }

    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration') {
      throw new Error('Cannot leave tournament after it has started');
    }

    let query = 'DELETE FROM tournament_participants WHERE tournament_id = ?';
    const params: any[] = [tournamentId];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    } else {
      query += ' AND guest_alias = ?';
      params.push(guestAlias);
    }

    const result = await DatabaseService.run(query, params);
    if (result.changes === 0) {
      throw new Error('Participant not found in tournament');
    }
  }

  /**
   * Get tournament participants
   */
  static async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    const rows = await DatabaseService.query(
      'SELECT * FROM tournament_participants WHERE tournament_id = ? ORDER BY joined_at ASC',
      [tournamentId]
    );
    return rows as TournamentParticipant[];
  }

  /**
   * Get participant by ID
   */
  static async getParticipant(participantId: number): Promise<TournamentParticipant | null> {
    const row = await DatabaseService.get(
      'SELECT * FROM tournament_participants WHERE id = ?',
      [participantId]
    );
    return row as TournamentParticipant | null;
  }

  /**
   * Start a tournament
   */
  static async startTournament(tournamentId: number): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status !== 'registration') {
      throw new Error('Tournament is not in registration phase');
    }

    const participants = await this.getTournamentParticipants(tournamentId);
    if (participants.length < 2) {
      throw new Error('Not enough participants to start tournament');
    }

    // Update tournament status
    await DatabaseService.run(
      'UPDATE tournaments SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['active', tournamentId]
    );

    // Generate matches based on tournament type
    await this.generateMatches(tournamentId, tournament.tournament_type, participants);
  }

  /**
   * Generate matches for tournament
   */
  private static async generateMatches(
    tournamentId: number,
    tournamentType: TournamentType,
    participants: TournamentParticipant[]
  ): Promise<void> {
    switch (tournamentType) {
      case 'single_elimination':
        await this.generateSingleEliminationMatches(tournamentId, participants);
        break;
      case 'double_elimination':
        await this.generateDoubleEliminationMatches(tournamentId, participants);
        break;
      case 'round_robin':
        await this.generateRoundRobinMatches(tournamentId, participants);
        break;
      default:
        throw new Error('Unsupported tournament type');
    }
  }

  /**
   * Generate single elimination matches
   */
  private static async generateSingleEliminationMatches(
    tournamentId: number,
    participants: TournamentParticipant[]
  ): Promise<void> {
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const totalRounds = Math.ceil(Math.log2(participants.length));
    
    // Generate first round matches
    let matchNumber = 1;
    const firstRoundMatches: { player1: TournamentParticipant; player2?: TournamentParticipant }[] = [];
    
    for (let i = 0; i < shuffled.length; i += 2) {
      const player1 = shuffled[i];
      const player2 = shuffled[i + 1];
      firstRoundMatches.push({ player1, player2 });
    }

    // Create first round matches
    for (const match of firstRoundMatches) {
      await DatabaseService.run(
        `INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id, status)
         VALUES (?, 1, ?, ?, ?, ?)`,
        [
          tournamentId,
          matchNumber++,
          match.player1.id,
          match.player2?.id || null,
          match.player2 ? 'pending' : 'completed'
        ]
      );

      // If bye, advance player1
      if (!match.player2) {
        const matchId = await DatabaseService.get(
          'SELECT id FROM tournament_matches WHERE tournament_id = ? AND round = 1 AND match_number = ?',
          [tournamentId, matchNumber - 1]
        ) as { id: number };

        await DatabaseService.run(
          'UPDATE tournament_matches SET winner_id = ? WHERE id = ?',
          [match.player1.id, matchId.id]
        );
      }
    }

    // Generate subsequent rounds
    for (let round = 2; round <= totalRounds; round++) {
      const previousRoundMatches = Math.ceil(firstRoundMatches.length / Math.pow(2, round - 1));
      
      for (let match = 1; match <= previousRoundMatches; match++) {
        await DatabaseService.run(
          `INSERT INTO tournament_matches (tournament_id, round, match_number, status)
           VALUES (?, ?, ?, ?)`,
          [tournamentId, round, match, 'pending']
        );
      }
    }
  }

  /**
   * Generate double elimination matches
   */
  private static async generateDoubleEliminationMatches(
    tournamentId: number,
    participants: TournamentParticipant[]
  ): Promise<void> {
    // For now, implement as single elimination
    // TODO: Implement proper double elimination bracket
    await this.generateSingleEliminationMatches(tournamentId, participants);
  }

  /**
   * Generate round robin matches
   */
  private static async generateRoundRobinMatches(
    tournamentId: number,
    participants: TournamentParticipant[]
  ): Promise<void> {
    let matchNumber = 1;

    for (let i = 0; i < participants.length; i++) {
      for (let j = i + 1; j < participants.length; j++) {
        await DatabaseService.run(
          `INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id, status)
           VALUES (?, 1, ?, ?, ?, ?)`,
          [tournamentId, matchNumber++, participants[i].id, participants[j].id, 'pending']
        );
      }
    }
  }

  /**
   * Get tournament matches
   */
  static async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    const rows = await DatabaseService.query(
      'SELECT * FROM tournament_matches WHERE tournament_id = ? ORDER BY round ASC, match_number ASC',
      [tournamentId]
    );
    return rows as TournamentMatch[];
  }

  /**
   * Get match by ID
   */
  static async getMatch(matchId: number): Promise<TournamentMatch | null> {
    const row = await DatabaseService.get(
      'SELECT * FROM tournament_matches WHERE id = ?',
      [matchId]
    );
    return row as TournamentMatch | null;
  }

  /**
   * Update match result
   */
  static async updateMatchResult(
    matchId: number,
    winnerId: number,
    player1Score: number,
    player2Score: number,
    gameSessionId?: string
  ): Promise<void> {
    const match = await this.getMatch(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'active') {
      throw new Error('Match is not active');
    }

    // Validate winner
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      throw new Error('Invalid winner');
    }

    // Update match
    await DatabaseService.run(
      `UPDATE tournament_matches
       SET winner_id = ?, player1_score = ?, player2_score = ?, status = ?, 
           finished_at = CURRENT_TIMESTAMP, game_session_id = ?
       WHERE id = ?`,
      [winnerId, player1Score, player2Score, 'completed', gameSessionId, matchId]
    );

    // Check if tournament is complete
    await this.checkTournamentCompletion(match.tournament_id);
  }

  /**
   * Check if tournament is complete and update status
   */
  private static async checkTournamentCompletion(tournamentId: number): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament || tournament.status !== 'active') {
      return;
    }

    const pendingMatches = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournament_matches WHERE tournament_id = ? AND status = ?',
      [tournamentId, 'pending']
    ) as { count: number };

    if (pendingMatches.count === 0) {
      // Tournament is complete
      await DatabaseService.run(
        'UPDATE tournaments SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', tournamentId]
      );

      // Update final rankings
      await this.updateFinalRankings(tournamentId);
    }
  }

  /**
   * Update final rankings for completed tournament
   */
  private static async updateFinalRankings(tournamentId: number): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return;

    if (tournament.tournament_type === 'single_elimination') {
      await this.updateSingleEliminationRankings(tournamentId);
    }
    // TODO: Implement rankings for other tournament types
  }

  /**
   * Update single elimination rankings
   */
  private static async updateSingleEliminationRankings(tournamentId: number): Promise<void> {
    const matches = await this.getTournamentMatches(tournamentId);
    const finalRound = Math.max(...matches.map(m => m.round));
    
    // Get final match
    const finalMatch = matches.find(m => m.round === finalRound && m.status === 'completed');
    if (!finalMatch) return;

    // Winner gets rank 1
    if (finalMatch.winner_id) {
      await DatabaseService.run(
        'UPDATE tournament_participants SET final_rank = 1 WHERE id = ?',
        [finalMatch.winner_id]
      );
    }

    // Loser gets rank 2
    const loserId = finalMatch.player1_id === finalMatch.winner_id ? finalMatch.player2_id : finalMatch.player1_id;
    if (loserId) {
      await DatabaseService.run(
        'UPDATE tournament_participants SET final_rank = 2 WHERE id = ?',
        [loserId]
      );
    }

    // TODO: Calculate ranks for eliminated players based on elimination round
  }

  /**
   * Get tournament bracket structure
   */
  static async getTournamentBracket(tournamentId: number): Promise<BracketNode[]> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    const matches = await this.getTournamentMatches(tournamentId);
    const participants = await this.getTournamentParticipants(tournamentId);

    if (tournament.tournament_type === 'single_elimination') {
      return this.buildSingleEliminationBracket(matches, participants);
    }

    // TODO: Implement other bracket types
    return [];
  }

  /**
   * Build single elimination bracket
   */
  private static buildSingleEliminationBracket(
    matches: TournamentMatch[],
    participants: TournamentParticipant[]
  ): BracketNode[] {
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const bracket: BracketNode[] = [];

    // Group matches by round
    const matchesByRound = new Map<number, TournamentMatch[]>();
    matches.forEach(match => {
      if (!matchesByRound.has(match.round)) {
        matchesByRound.set(match.round, []);
      }
      matchesByRound.get(match.round)!.push(match);
    });

    // Build bracket nodes
    matchesByRound.forEach((roundMatches, round) => {
      roundMatches.forEach(match => {
        const node: BracketNode = {
          id: match.id,
          match_id: match.id,
          player1: match.player1_id ? participantMap.get(match.player1_id) : undefined,
          player2: match.player2_id ? participantMap.get(match.player2_id) : undefined,
          winner: match.winner_id ? participantMap.get(match.winner_id) : undefined,
          round,
          position: { x: match.bracket_position || 0, y: round }
        };
        bracket.push(node);
      });
    });

    return bracket;
  }

  /**
   * Clear all tournament data (preserves user data)
   */
  static async clearAllTournamentData(): Promise<void> {
    try {
      // Delete in order to respect foreign key constraints
      await DatabaseService.run('DELETE FROM tournament_brackets');
      await DatabaseService.run('DELETE FROM tournament_matches');
      await DatabaseService.run('DELETE FROM tournament_participants');
      await DatabaseService.run('DELETE FROM tournaments');
      
      console.log('All tournament data cleared successfully');
    } catch (error) {
      console.error('Error clearing tournament data:', error);
      throw error;
    }
  }

  /**
   * Get tournament statistics
   */
  static async getTournamentStats(): Promise<TournamentStats> {
    const totalTournaments = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournaments'
    ) as { count: number };

    const activeTournaments = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournaments WHERE status = ?',
      ['active']
    ) as { count: number };

    const completedTournaments = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournaments WHERE status = ?',
      ['completed']
    ) as { count: number };

    const totalParticipants = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournament_participants'
    ) as { count: number };

    const totalMatches = await DatabaseService.get(
      'SELECT COUNT(*) as count FROM tournament_matches'
    ) as { count: number };

    return {
      total_tournaments: totalTournaments.count,
      active_tournaments: activeTournaments.count,
      completed_tournaments: completedTournaments.count,
      total_participants: totalParticipants.count,
      total_matches: totalMatches.count
    };
  }

  /**
   * Cancel a tournament
   */
  static async cancelTournament(tournamentId: number): Promise<void> {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    if (tournament.status === 'completed') {
      throw new Error('Cannot cancel completed tournament');
    }

    await DatabaseService.run(
      'UPDATE tournaments SET status = ? WHERE id = ?',
      ['cancelled', tournamentId]
    );
  }
}
