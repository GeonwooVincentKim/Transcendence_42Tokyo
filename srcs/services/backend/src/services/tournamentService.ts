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

    if (max_participants < 2 || max_participants > 8) {
      throw new Error('Max participants must be between 2 and 8');
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
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    const participantCount = participants.length;
    
    // Calculate bracket structure
    const mainBracketRounds = Math.ceil(Math.log2(participantCount));
    const losersBracketRounds = (mainBracketRounds - 1) * 2;
    
    console.log(`Double Elimination: ${participantCount} participants`);
    console.log(`Main bracket rounds: ${mainBracketRounds}`);
    console.log(`Losers bracket rounds: ${losersBracketRounds}`);
    
    // Generate main bracket (winners bracket)
    await this.generateMainBracket(tournamentId, shuffled, mainBracketRounds);
    
    // Generate losers bracket
    await this.generateLosersBracket(tournamentId, losersBracketRounds, mainBracketRounds);
    
    // Generate grand final match
    await this.generateGrandFinal(tournamentId, mainBracketRounds, losersBracketRounds);
  }

  /**
   * Generate main bracket (winners bracket) for double elimination
   */
  private static async generateMainBracket(
    tournamentId: number,
    participants: TournamentParticipant[],
    rounds: number
  ): Promise<void> {
    let matchNumber = 1;
    
    // First round - all participants
    const firstRoundMatches: { player1: TournamentParticipant; player2?: TournamentParticipant }[] = [];
    
    for (let i = 0; i < participants.length; i += 2) {
      const player1 = participants[i];
      const player2 = participants[i + 1];
      firstRoundMatches.push({ player1, player2 });
    }

    // Create first round matches
    for (const match of firstRoundMatches) {
      await DatabaseService.run(
        `INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id, status, bracket_position)
         VALUES (?, 1, ?, ?, ?, ?, ?)`,
        [
          tournamentId,
          matchNumber++,
          match.player1.id,
          match.player2?.id || null,
          match.player2 ? 'pending' : 'completed',
          1 // Main bracket
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

    // Generate subsequent rounds for main bracket
    for (let round = 2; round <= rounds; round++) {
      const previousRoundMatches = Math.ceil(firstRoundMatches.length / Math.pow(2, round - 1));
      
      for (let match = 1; match <= previousRoundMatches; match++) {
        await DatabaseService.run(
          `INSERT INTO tournament_matches (tournament_id, round, match_number, status, bracket_position)
           VALUES (?, ?, ?, ?, ?)`,
          [tournamentId, round, match, 'pending', 1] // Main bracket
        );
      }
    }
  }

  /**
   * Generate losers bracket for double elimination
   */
  private static async generateLosersBracket(
    tournamentId: number,
    losersRounds: number,
    mainRounds: number
  ): Promise<void> {
    let matchNumber = 1;
    
    // Losers bracket has a specific structure
    // Round 1: First round losers vs each other
    // Round 2: Second round losers vs Round 1 winners
    // And so on...
    
    for (let round = 1; round <= losersRounds; round++) {
      // Calculate number of matches for this round
      let matchesInRound: number;
      
      if (round === 1) {
        // First losers round: all first round losers
        matchesInRound = Math.floor(Math.pow(2, mainRounds - 1));
      } else if (round % 2 === 0) {
        // Even rounds: losers from main bracket join
        matchesInRound = Math.floor(Math.pow(2, mainRounds - 1 - (round / 2)));
      } else {
        // Odd rounds: previous losers round winners
        matchesInRound = Math.floor(Math.pow(2, mainRounds - 1 - ((round - 1) / 2)));
      }
      
      for (let match = 1; match <= matchesInRound; match++) {
        await DatabaseService.run(
          `INSERT INTO tournament_matches (tournament_id, round, match_number, status, bracket_position)
           VALUES (?, ?, ?, ?, ?)`,
          [tournamentId, round + mainRounds, match, 'pending', 2] // Losers bracket
        );
      }
    }
  }

  /**
   * Generate grand final match for double elimination
   */
  private static async generateGrandFinal(
    tournamentId: number,
    mainRounds: number,
    losersRounds: number
  ): Promise<void> {
    const grandFinalRound = mainRounds + losersRounds + 1;
    
    await DatabaseService.run(
      `INSERT INTO tournament_matches (tournament_id, round, match_number, status, bracket_position)
       VALUES (?, ?, ?, ?, ?)`,
      [tournamentId, grandFinalRound, 1, 'pending', 3] // Grand final
    );
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
   * Start a match
   */
  static async startMatch(matchId: number): Promise<void> {
    await DatabaseService.run(
      'UPDATE tournament_matches SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['active', matchId]
    );
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

    // Get tournament to determine type
    const tournament = await this.getTournament(match.tournament_id);
    if (!tournament) {
      throw new Error('Tournament not found');
    }

    // Handle match progression based on tournament type
    if (tournament.tournament_type === 'double_elimination') {
      await this.handleDoubleEliminationMatchProgression(match.tournament_id, match, winnerId);
    } else {
      // Handle other tournament types
    await this.checkTournamentCompletion(match.tournament_id);
    }
  }

  /**
   * Handle match progression for double elimination tournaments
   */
  private static async handleDoubleEliminationMatchProgression(
    tournamentId: number,
    completedMatch: TournamentMatch,
    winnerId: number
  ): Promise<void> {
    const loserId = completedMatch.player1_id === winnerId ? completedMatch.player2_id : completedMatch.player1_id;
    
    // Determine bracket position (1 = main bracket, 2 = losers bracket, 3 = grand final)
    const bracketPosition = completedMatch.bracket_position || 1;
    
    if (bracketPosition === 1) {
      // Main bracket match completed
      await this.handleMainBracketMatchCompletion(tournamentId, completedMatch, winnerId, loserId || null);
    } else if (bracketPosition === 2) {
      // Losers bracket match completed
      await this.handleLosersBracketMatchCompletion(tournamentId, completedMatch, winnerId, loserId || null);
    } else if (bracketPosition === 3) {
      // Grand final match completed
      await this.handleGrandFinalCompletion(tournamentId, completedMatch, winnerId);
    }
  }

  /**
   * Handle main bracket match completion
   */
  private static async handleMainBracketMatchCompletion(
    tournamentId: number,
    completedMatch: TournamentMatch,
    winnerId: number,
    loserId: number | null
  ): Promise<void> {
    // Winner advances to next round in main bracket
    await this.advancePlayerToNextRound(tournamentId, winnerId, completedMatch.round + 1, 1);
    
    // Loser goes to losers bracket
    if (loserId) {
      await this.sendPlayerToLosersBracket(tournamentId, loserId, completedMatch.round);
    }
    
    // Check if we can start the next round
    await this.checkAndStartNextRound(tournamentId, completedMatch.round + 1, 1);
  }

  /**
   * Handle losers bracket match completion
   */
  private static async handleLosersBracketMatchCompletion(
    tournamentId: number,
    completedMatch: TournamentMatch,
    winnerId: number,
    loserId: number | null
  ): Promise<void> {
    // Winner advances to next round in losers bracket
    await this.advancePlayerToNextRound(tournamentId, winnerId, completedMatch.round + 1, 2);
    
    // Check if this was the final losers bracket match
    const isFinalLosersMatch = await this.isFinalLosersBracketMatch(tournamentId, completedMatch.round);
    
    if (isFinalLosersMatch) {
      // Winner goes to grand final
      await this.sendPlayerToGrandFinal(tournamentId, winnerId);
    } else {
      // Check if we can start the next round
      await this.checkAndStartNextRound(tournamentId, completedMatch.round + 1, 2);
    }
  }

  /**
   * Handle grand final match completion
   */
  private static async handleGrandFinalCompletion(
    tournamentId: number,
    completedMatch: TournamentMatch,
    winnerId: number
  ): Promise<void> {
    // Tournament is complete
    await DatabaseService.run(
      'UPDATE tournaments SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['completed', tournamentId]
    );

    // Update final rankings
    await this.updateDoubleEliminationRankings(tournamentId, winnerId);
  }

  /**
   * Advance player to next round
   */
  private static async advancePlayerToNextRound(
    tournamentId: number,
    playerId: number,
    nextRound: number,
    bracketPosition: number
  ): Promise<void> {
    // Find the next match for this player
    const nextMatch = await DatabaseService.get(
      `SELECT id FROM tournament_matches 
       WHERE tournament_id = ? AND round = ? AND bracket_position = ? 
       AND (player1_id IS NULL OR player2_id IS NULL)
       ORDER BY match_number ASC LIMIT 1`,
      [tournamentId, nextRound, bracketPosition]
    ) as { id: number } | null;

    if (nextMatch) {
      // Check if player1 or player2 slot is available
      const match = await DatabaseService.get(
        'SELECT player1_id, player2_id FROM tournament_matches WHERE id = ?',
        [nextMatch.id]
      ) as { player1_id: number | null; player2_id: number | null };

      if (match.player1_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player1_id = ? WHERE id = ?',
          [playerId, nextMatch.id]
        );
      } else if (match.player2_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player2_id = ? WHERE id = ?',
          [playerId, nextMatch.id]
        );
      }
    }
  }

  /**
   * Send player to losers bracket
   */
  private static async sendPlayerToLosersBracket(
    tournamentId: number,
    playerId: number,
    eliminatedRound: number
  ): Promise<void> {
    // Find appropriate losers bracket match
    const losersMatch = await DatabaseService.get(
      `SELECT id FROM tournament_matches 
       WHERE tournament_id = ? AND bracket_position = 2 
       AND (player1_id IS NULL OR player2_id IS NULL)
       ORDER BY round ASC, match_number ASC LIMIT 1`,
      [tournamentId]
    ) as { id: number } | null;

    if (losersMatch) {
      const match = await DatabaseService.get(
        'SELECT player1_id, player2_id FROM tournament_matches WHERE id = ?',
        [losersMatch.id]
      ) as { player1_id: number | null; player2_id: number | null };

      if (match.player1_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player1_id = ? WHERE id = ?',
          [playerId, losersMatch.id]
        );
      } else if (match.player2_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player2_id = ? WHERE id = ?',
          [playerId, losersMatch.id]
        );
      }
    }
  }

  /**
   * Send player to grand final
   */
  private static async sendPlayerToGrandFinal(tournamentId: number, playerId: number): Promise<void> {
    const grandFinalMatch = await DatabaseService.get(
      `SELECT id FROM tournament_matches 
       WHERE tournament_id = ? AND bracket_position = 3
       ORDER BY round ASC LIMIT 1`,
      [tournamentId]
    ) as { id: number } | null;

    if (grandFinalMatch) {
      const match = await DatabaseService.get(
        'SELECT player1_id, player2_id FROM tournament_matches WHERE id = ?',
        [grandFinalMatch.id]
      ) as { player1_id: number | null; player2_id: number | null };

      if (match.player1_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player1_id = ? WHERE id = ?',
          [playerId, grandFinalMatch.id]
        );
      } else if (match.player2_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player2_id = ? WHERE id = ?',
          [playerId, grandFinalMatch.id]
        );
      }
    }
  }

  /**
   * Check if this is the final losers bracket match
   */
  private static async isFinalLosersBracketMatch(tournamentId: number, round: number): Promise<boolean> {
    const nextLosersMatches = await DatabaseService.get(
      `SELECT COUNT(*) as count FROM tournament_matches 
       WHERE tournament_id = ? AND round = ? AND bracket_position = 2`,
      [tournamentId, round + 1]
    ) as { count: number };

    return nextLosersMatches.count === 0;
  }

  /**
   * Check and start next round if ready
   */
  private static async checkAndStartNextRound(
    tournamentId: number,
    round: number,
    bracketPosition: number
  ): Promise<void> {
    // Check if all matches in current round are completed
    const pendingMatches = await DatabaseService.get(
      `SELECT COUNT(*) as count FROM tournament_matches 
       WHERE tournament_id = ? AND round = ? AND bracket_position = ? AND status != 'completed'`,
      [tournamentId, round - 1, bracketPosition]
    ) as { count: number };

    if (pendingMatches.count === 0) {
      // All matches in previous round completed, activate next round
      await DatabaseService.run(
        `UPDATE tournament_matches SET status = 'pending' 
         WHERE tournament_id = ? AND round = ? AND bracket_position = ?`,
        [tournamentId, round, bracketPosition]
      );
    }
  }

  /**
   * Update final rankings for double elimination
   */
  private static async updateDoubleEliminationRankings(tournamentId: number, winnerId: number): Promise<void> {
    // Winner gets rank 1
    await DatabaseService.run(
      'UPDATE tournament_participants SET final_rank = 1 WHERE id = ?',
      [winnerId]
    );

    // Get grand final match to find runner-up
    const grandFinalMatch = await DatabaseService.get(
      `SELECT player1_id, player2_id FROM tournament_matches 
       WHERE tournament_id = ? AND bracket_position = 3 AND status = 'completed'`,
      [tournamentId]
    ) as { player1_id: number; player2_id: number } | null;

    if (grandFinalMatch) {
      const runnerUpId = grandFinalMatch.player1_id === winnerId ? grandFinalMatch.player2_id : grandFinalMatch.player1_id;
      if (runnerUpId) {
        await DatabaseService.run(
          'UPDATE tournament_participants SET final_rank = 2 WHERE id = ?',
          [runnerUpId]
        );
      }
    }

    // TODO: Calculate ranks for other eliminated players
    // This would require more complex logic to determine elimination order
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
    } else if (tournament.tournament_type === 'round_robin') {
      await this.updateRoundRobinRankings(tournamentId);
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
   * Update round robin rankings
   */
  private static async updateRoundRobinRankings(tournamentId: number): Promise<void> {
    const participants = await this.getTournamentParticipants(tournamentId);
    const matches = await this.getTournamentMatches(tournamentId);

    // Calculate statistics for each participant
    const stats = new Map<number, {
      wins: number;
      losses: number;
      totalGames: number;
      winRate: number;
      pointsFor: number;
      pointsAgainst: number;
      pointDifference: number;
    }>();

    // Initialize stats
    participants.forEach((p: TournamentParticipant) => {
      stats.set(p.id, {
        wins: 0,
        losses: 0,
        totalGames: 0,
        winRate: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifference: 0
      });
    });

    // Calculate stats from completed matches
    matches.forEach((match: TournamentMatch) => {
      if (match.status === 'completed') {
        const player1Stats = stats.get(match.player1_id || 0)!;
        const player2Stats = stats.get(match.player2_id || 0)!;

        // Update total games
        player1Stats.totalGames++;
        player2Stats.totalGames++;

        // Update points
        player1Stats.pointsFor += match.player1_score || 0;
        player1Stats.pointsAgainst += match.player2_score || 0;
        player2Stats.pointsFor += match.player2_score || 0;
        player2Stats.pointsAgainst += match.player1_score || 0;

        // Update wins/losses
        if (match.winner_id === match.player1_id) {
          player1Stats.wins++;
          player2Stats.losses++;
        } else if (match.winner_id === match.player2_id) {
          player2Stats.wins++;
          player1Stats.losses++;
        }
      }
    });

    // Calculate win rates and point differences
    stats.forEach((stat, participantId) => {
      stat.winRate = stat.totalGames > 0 ? stat.wins / stat.totalGames : 0;
      stat.pointDifference = stat.pointsFor - stat.pointsAgainst;
    });

    // Sort participants by ranking criteria:
    // 1. Win rate (descending)
    // 2. Total wins (descending)
    // 3. Point difference (descending)
    // 4. Points for (descending)
    const sortedParticipants = participants.sort((a, b) => {
      const statsA = stats.get(a.id)!;
      const statsB = stats.get(b.id)!;

      // Compare win rates
      if (statsA.winRate !== statsB.winRate) {
        return statsB.winRate - statsA.winRate;
      }

      // Compare total wins
      if (statsA.wins !== statsB.wins) {
        return statsB.wins - statsA.wins;
      }

      // Compare point difference
      if (statsA.pointDifference !== statsB.pointDifference) {
        return statsB.pointDifference - statsA.pointDifference;
      }

      // Compare points for
      return statsB.pointsFor - statsA.pointsFor;
    });

    // Update final rankings
    for (let i = 0; i < sortedParticipants.length; i++) {
      await DatabaseService.run(
        'UPDATE tournament_participants SET final_rank = ? WHERE id = ?',
        [i + 1, sortedParticipants[i].id]
      );
    }
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
    } else if (tournament.tournament_type === 'double_elimination') {
      return this.buildDoubleEliminationBracket(matches, participants);
    } else if (tournament.tournament_type === 'round_robin') {
      return this.buildRoundRobinTable(matches, participants);
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
   * Build double elimination bracket
   */
  private static buildDoubleEliminationBracket(
    matches: TournamentMatch[],
    participants: TournamentParticipant[]
  ): BracketNode[] {
    const participantMap = new Map(participants.map(p => [p.id, p]));
    const bracket: BracketNode[] = [];

    // Group matches by bracket position and round
    const mainBracketMatches = matches.filter(m => m.bracket_position === 1);
    const losersBracketMatches = matches.filter(m => m.bracket_position === 2);
    const grandFinalMatches = matches.filter(m => m.bracket_position === 3);

    // Build main bracket (winners bracket)
    const mainBracketNodes = this.buildBracketSection(mainBracketMatches, participantMap, 'Main Bracket');
    bracket.push(...mainBracketNodes);

    // Build losers bracket
    const losersBracketNodes = this.buildBracketSection(losersBracketMatches, participantMap, 'Losers Bracket');
    bracket.push(...losersBracketNodes);

    // Build grand final
    const grandFinalNodes = this.buildBracketSection(grandFinalMatches, participantMap, 'Grand Final');
    bracket.push(...grandFinalNodes);

    return bracket;
  }

  /**
   * Build a bracket section (main, losers, or grand final)
   */
  private static buildBracketSection(
    matches: TournamentMatch[],
    participantMap: Map<number, TournamentParticipant>,
    sectionName: string
  ): BracketNode[] {
    const nodes: BracketNode[] = [];

    // Group matches by round
    const matchesByRound = new Map<number, TournamentMatch[]>();
    matches.forEach(match => {
      if (!matchesByRound.has(match.round)) {
        matchesByRound.set(match.round, []);
      }
      matchesByRound.get(match.round)!.push(match);
    });

    // Build nodes for each round
    matchesByRound.forEach((roundMatches, round) => {
      roundMatches.forEach(match => {
        const node: BracketNode = {
          id: match.id,
          match_id: match.id,
          player1: match.player1_id ? participantMap.get(match.player1_id) : undefined,
          player2: match.player2_id ? participantMap.get(match.player2_id) : undefined,
          winner: match.winner_id ? participantMap.get(match.winner_id) : undefined,
          round,
          position: { 
            x: match.bracket_position || 1, 
            y: round 
          }
        };
        nodes.push(node);
      });
    });

    return nodes;
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

  /**
   * Build round robin table structure
   */
  private static buildRoundRobinTable(matches: TournamentMatch[], participants: TournamentParticipant[]): BracketNode[] {
    const nodes: BracketNode[] = [];
    
    // Calculate statistics for each participant
    const stats = new Map<number, {
      wins: number;
      losses: number;
      totalGames: number;
      winRate: number;
      pointsFor: number;
      pointsAgainst: number;
      pointDifference: number;
    }>();

    // Initialize stats
    participants.forEach(p => {
      stats.set(p.id, {
        wins: 0,
        losses: 0,
        totalGames: 0,
        winRate: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        pointDifference: 0
      });
    });

    // Calculate stats from completed matches
    matches.forEach(match => {
      if (match.status === 'completed') {
        const player1Stats = stats.get(match.player1_id || 0)!;
        const player2Stats = stats.get(match.player2_id || 0)!;

        // Update total games
        player1Stats.totalGames++;
        player2Stats.totalGames++;

        // Update points
        player1Stats.pointsFor += match.player1_score || 0;
        player1Stats.pointsAgainst += match.player2_score || 0;
        player2Stats.pointsFor += match.player2_score || 0;
        player2Stats.pointsAgainst += match.player1_score || 0;

        // Update wins/losses
        if (match.winner_id === match.player1_id) {
          player1Stats.wins++;
          player2Stats.losses++;
        } else if (match.winner_id === match.player2_id) {
          player2Stats.wins++;
          player1Stats.losses++;
        }
      }
    });

    // Calculate win rates and point differences
    stats.forEach((stat, participantId) => {
      stat.winRate = stat.totalGames > 0 ? stat.wins / stat.totalGames : 0;
      stat.pointDifference = stat.pointsFor - stat.pointsAgainst;
    });

    // Sort participants by ranking criteria
    const sortedParticipants = participants.sort((a: TournamentParticipant, b: TournamentParticipant) => {
      const statsA = stats.get(a.id)!;
      const statsB = stats.get(b.id)!;

      // Compare win rates
      if (statsA.winRate !== statsB.winRate) {
        return statsB.winRate - statsA.winRate;
      }

      // Compare total wins
      if (statsA.wins !== statsB.wins) {
        return statsB.wins - statsA.wins;
      }

      // Compare point difference
      if (statsA.pointDifference !== statsB.pointDifference) {
        return statsB.pointDifference - statsA.pointDifference;
      }

      // Compare points for
      return statsB.pointsFor - statsA.pointsFor;
    });

    // Create table nodes for each participant
    sortedParticipants.forEach((participant, index) => {
      const participantStats = stats.get(participant.id)!;
      
      nodes.push({
        id: participant.id,
        round: 1,
        position: { x: 0, y: index * 100 },
        player1: participant,
        children: []
      });
    });

    return nodes;
  }
}
