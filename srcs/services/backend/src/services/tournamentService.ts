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
  user?: {
    id: number;
    username: string;
    email: string;
  };
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
  player1?: TournamentParticipant;
  player2?: TournamentParticipant;
  winner?: TournamentParticipant;
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
    console.log('🔍 listTournaments query result:', JSON.stringify(rows, null, 2));
    if (rows && rows.length > 0) {
      console.log('🔍 First tournament:', rows[0]);
      console.log('🔍 First tournament ID:', rows[0].id, 'Type:', typeof rows[0].id);
    }
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
    // For registered users, user_id must be provided, and guest_alias should also be provided (same as display_name)
    if (!user_id && (!guest_alias || guest_alias.trim().length === 0)) {
      throw new Error('Either user_id or guest_alias is required');
    }

    // Allow both user_id and guest_alias for registered users (guest_alias is set to display_name)
    // This allows consistent display of participant names regardless of registration status

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
   * Get tournament participants with user information
   */
  static async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    const rows = await DatabaseService.query(
      `SELECT 
        tp.*,
        u.id as user_db_id,
        u.username as user_username,
        u.email as user_email
      FROM tournament_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.tournament_id = ? 
      ORDER BY tp.joined_at ASC`,
      [tournamentId]
    );
    
    console.log('🔍 getTournamentParticipants - rows count:', rows.length);
    if (rows.length > 0) {
      console.log('🔍 getTournamentParticipants - first row:', {
        id: rows[0].id,
        user_id: rows[0].user_id,
        user_db_id: rows[0].user_db_id,
        user_username: rows[0].user_username,
        display_name: rows[0].display_name
      });
    }
    
    // Map rows to TournamentParticipant with user information
    return rows.map((row: any) => {
      const participant: any = {
        id: row.id,
        tournament_id: row.tournament_id,
        user_id: row.user_id,
        guest_alias: row.guest_alias,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
        joined_at: row.joined_at,
        eliminated_at: row.eliminated_at,
        final_rank: row.final_rank,
        seed: row.seed,
        is_ready: row.is_ready === 1
      };
      
      // Add user information if exists
      if (row.user_db_id) {
        participant.user = {
          id: row.user_db_id,
          username: row.user_username,
          email: row.user_email
        };
        console.log('🔍 Added user info to participant:', {
          participantId: participant.id,
          userId: participant.user.id,
          username: participant.user.username
        });
      } else {
        console.log('🔍 No user_db_id for participant:', {
          participantId: participant.id,
          user_id: participant.user_id,
          display_name: participant.display_name
        });
      }
      
      return participant;
    });
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
        `INSERT INTO tournament_matches (tournament_id, round, match_number, player1_id, player2_id, status, bracket_position)
         VALUES (?, 1, ?, ?, ?, ?, ?)`,
        [
          tournamentId,
          matchNumber++,
          match.player1.id,
          match.player2?.id || null,
          match.player2 ? 'pending' : 'completed',
          1 // bracket_position = 1 for single elimination
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
          `INSERT INTO tournament_matches (tournament_id, round, match_number, status, bracket_position)
           VALUES (?, ?, ?, ?, ?)`,
          [tournamentId, round, match, 'pending', 1] // bracket_position = 1 for single elimination
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
   * Get tournament matches with participant information
   */
  static async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    const rows = await DatabaseService.query(
      `SELECT 
        m.*,
        p1.id as p1_id, p1.user_id as p1_user_id, p1.guest_alias as p1_guest_alias, 
        p1.display_name as p1_display_name, p1.avatar_url as p1_avatar_url,
        u1.id as u1_db_id, u1.username as u1_username, u1.email as u1_email,
        p2.id as p2_id, p2.user_id as p2_user_id, p2.guest_alias as p2_guest_alias,
        p2.display_name as p2_display_name, p2.avatar_url as p2_avatar_url,
        u2.id as u2_db_id, u2.username as u2_username, u2.email as u2_email,
        w.id as w_id, w.user_id as w_user_id, w.guest_alias as w_guest_alias,
        w.display_name as w_display_name, w.avatar_url as w_avatar_url,
        uw.id as uw_db_id, uw.username as uw_username, uw.email as uw_email
      FROM tournament_matches m
      LEFT JOIN tournament_participants p1 ON m.player1_id = p1.id
      LEFT JOIN users u1 ON p1.user_id = u1.id
      LEFT JOIN tournament_participants p2 ON m.player2_id = p2.id
      LEFT JOIN users u2 ON p2.user_id = u2.id
      LEFT JOIN tournament_participants w ON m.winner_id = w.id
      LEFT JOIN users uw ON w.user_id = uw.id
      WHERE m.tournament_id = ? 
      ORDER BY m.round ASC, m.match_number ASC`,
      [tournamentId]
    );
    
    console.log('🔍 getTournamentMatches - rows count:', rows.length);
    if (rows.length > 0) {
      console.log('🔍 getTournamentMatches - first row:', {
        match_id: rows[0].id,
        player1_id: rows[0].player1_id,
        player2_id: rows[0].player2_id,
        p1_id: rows[0].p1_id,
        p2_id: rows[0].p2_id,
        p1_display_name: rows[0].p1_display_name,
        p2_display_name: rows[0].p2_display_name,
        u1_db_id: rows[0].u1_db_id,
        u1_username: rows[0].u1_username,
        u2_db_id: rows[0].u2_db_id,
        u2_username: rows[0].u2_username
      });
    }
    
    // Map rows to TournamentMatch with participant information
    const matches: TournamentMatch[] = rows.map((row: any) => {
      const match: any = {
        id: row.id,
        tournament_id: row.tournament_id,
        round: row.round,
        match_number: row.match_number,
        bracket_position: row.bracket_position,
        player1_id: row.player1_id,
        player2_id: row.player2_id,
        winner_id: row.winner_id,
        status: row.status,
        player1_score: row.player1_score,
        player2_score: row.player2_score,
        game_session_id: row.game_session_id,
        created_at: row.created_at,
        started_at: row.started_at,
        finished_at: row.finished_at,
        match_data: row.match_data
      };
      
      console.log('🔍 Processing match row:', {
        matchId: match.id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        hasP1Id: !!row.p1_id,
        hasP2Id: !!row.p2_id,
        p1DisplayName: row.p1_display_name,
        p2DisplayName: row.p2_display_name
      });
      
      // Add player1 participant if exists
      if (row.p1_id) {
        match.player1 = {
          id: row.p1_id,
          tournament_id: tournamentId,
          user_id: row.p1_user_id,
          guest_alias: row.p1_guest_alias,
          display_name: row.p1_display_name || null, // Allow null display_name
          avatar_url: row.p1_avatar_url,
          joined_at: '',
          eliminated_at: null,
          final_rank: null,
          seed: null,
          is_ready: false
        };
        // Add user information if exists
        if (row.u1_db_id) {
          match.player1.user = {
            id: row.u1_db_id,
            username: row.u1_username,
            email: row.u1_email
          };
        }
        // If display_name is missing but user exists, use username
        if (!match.player1.display_name && match.player1.user?.username) {
          match.player1.display_name = match.player1.user.username;
        }
        // If display_name is still missing but guest_alias exists, use guest_alias
        if (!match.player1.display_name && match.player1.guest_alias) {
          match.player1.display_name = match.player1.guest_alias;
        }
      } else {
        match.player1 = undefined;
      }
      
      // Add player2 participant if exists
      if (row.p2_id) {
        match.player2 = {
          id: row.p2_id,
          tournament_id: tournamentId,
          user_id: row.p2_user_id,
          guest_alias: row.p2_guest_alias,
          display_name: row.p2_display_name || null, // Allow null display_name
          avatar_url: row.p2_avatar_url,
          joined_at: '',
          eliminated_at: null,
          final_rank: null,
          seed: null,
          is_ready: false
        };
        // Add user information if exists
        if (row.u2_db_id) {
          match.player2.user = {
            id: row.u2_db_id,
            username: row.u2_username,
            email: row.u2_email
          };
        }
        // If display_name is missing but user exists, use username
        if (!match.player2.display_name && match.player2.user?.username) {
          match.player2.display_name = match.player2.user.username;
        }
        // If display_name is still missing but guest_alias exists, use guest_alias
        if (!match.player2.display_name && match.player2.guest_alias) {
          match.player2.display_name = match.player2.guest_alias;
        }
      } else {
        match.player2 = undefined;
      }
      
      // Add winner participant if exists
      if (row.w_id) {
        match.winner = {
          id: row.w_id,
          tournament_id: tournamentId,
          user_id: row.w_user_id,
          guest_alias: row.w_guest_alias,
          display_name: row.w_display_name || null, // Allow null display_name
          avatar_url: row.w_avatar_url,
          joined_at: '',
          eliminated_at: null,
          final_rank: null,
          seed: null,
          is_ready: false
        };
        // Add user information if exists
        if (row.uw_db_id) {
          match.winner.user = {
            id: row.uw_db_id,
            username: row.uw_username,
            email: row.uw_email
          };
        }
        // If display_name is missing but user exists, use username
        if (!match.winner.display_name && match.winner.user?.username) {
          match.winner.display_name = match.winner.user.username;
        }
        // If display_name is still missing but guest_alias exists, use guest_alias
        if (!match.winner.display_name && match.winner.guest_alias) {
          match.winner.display_name = match.winner.guest_alias;
        }
        console.log('🔍 Winner participant:', {
          w_id: row.w_id,
          w_display_name: row.w_display_name,
          w_user_id: row.w_user_id,
          uw_username: row.uw_username,
          final_display_name: match.winner.display_name
        });
      } else if (row.winner_id) {
        // winner_id exists but w_id is null - this shouldn't happen, but log it
        console.log('⚠️ winner_id exists but w_id is null:', {
          winner_id: row.winner_id,
          match_id: match.id
        });
      }
      
      return match;
    });
    
    return matches;
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
    } else if (tournament.tournament_type === 'single_elimination') {
      // Handle single elimination match progression
      await this.handleSingleEliminationMatchProgression(match.tournament_id, match, winnerId);
    } else {
      // Handle other tournament types (round robin, etc.)
    await this.checkTournamentCompletion(match.tournament_id);
    }
  }

  /**
   * Handle match progression for single elimination tournaments
   */
  private static async handleSingleEliminationMatchProgression(
    tournamentId: number,
    completedMatch: TournamentMatch,
    winnerId: number
  ): Promise<void> {
    // Check if this is the final match
    const allMatches = await this.getTournamentMatches(tournamentId);
    const maxRound = Math.max(...allMatches.map(m => m.round));
    
    if (completedMatch.round >= maxRound) {
      // This is the final match, tournament is complete
      await DatabaseService.run(
        'UPDATE tournaments SET status = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['completed', tournamentId]
      );
      
      // Update final rankings
      await this.updateSingleEliminationRankings(tournamentId);
    } else {
      // IMPORTANT: First check if we can start the next round and activate it
      // This ensures the next round matches are in 'pending' status before we try to assign players
      await this.checkAndStartNextRound(tournamentId, completedMatch.round, completedMatch.round + 1, 1);
      
      // Then advance the winner to the next round
      await this.advancePlayerToNextRound(tournamentId, winnerId, completedMatch.round + 1, 1);
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
    // IMPORTANT: Check if all matches in the CURRENT round (completedMatch.round) are completed
    // before activating the NEXT round (completedMatch.round + 1)
    await this.checkAndStartNextRound(tournamentId, completedMatch.round, completedMatch.round + 1, 1);
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
      // IMPORTANT: Check if all matches in the CURRENT round (completedMatch.round) are completed
      // before activating the NEXT round (completedMatch.round + 1)
      await this.checkAndStartNextRound(tournamentId, completedMatch.round, completedMatch.round + 1, 2);
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
    console.log(`🏆 Advancing player ${playerId} to round ${nextRound}, bracket position ${bracketPosition}`);
    
    // Find the next match for this player
    // IMPORTANT: Check for matches with bracket_position = 1 OR bracket_position IS NULL
    // (for backward compatibility with existing tournaments that might not have bracket_position set)
    const nextMatch = await DatabaseService.get(
      `SELECT id FROM tournament_matches 
       WHERE tournament_id = ? AND round = ? 
       AND (bracket_position = ? OR bracket_position IS NULL)
       AND (player1_id IS NULL OR player2_id IS NULL)
       ORDER BY match_number ASC LIMIT 1`,
      [tournamentId, nextRound, bracketPosition]
    ) as { id: number } | null;
    
    console.log(`🔍 Searching for next match: tournamentId=${tournamentId}, round=${nextRound}, bracketPosition=${bracketPosition}`);
    if (!nextMatch) {
      // Debug: Check if any matches exist in the next round
      const allMatchesInRound = await DatabaseService.query(
        `SELECT id, player1_id, player2_id, status, bracket_position FROM tournament_matches 
         WHERE tournament_id = ? AND round = ?`,
        [tournamentId, nextRound]
      );
      console.log(`🔍 All matches in round ${nextRound}:`, allMatchesInRound);
    }

    if (nextMatch) {
      console.log(`✅ Found next match ${nextMatch.id} for player ${playerId}`);
      
      // Check if player1 or player2 slot is available
      const match = await DatabaseService.get(
        'SELECT player1_id, player2_id FROM tournament_matches WHERE id = ?',
        [nextMatch.id]
      ) as { player1_id: number | null; player2_id: number | null };

      console.log(`🔍 Next match ${nextMatch.id} current state:`, {
        player1_id: match.player1_id,
        player2_id: match.player2_id
      });

      if (match.player1_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player1_id = ? WHERE id = ?',
          [playerId, nextMatch.id]
        );
        console.log(`✅ Assigned player ${playerId} as player1 in match ${nextMatch.id}`);
      } else if (match.player2_id === null) {
        await DatabaseService.run(
          'UPDATE tournament_matches SET player2_id = ? WHERE id = ?',
          [playerId, nextMatch.id]
        );
        console.log(`✅ Assigned player ${playerId} as player2 in match ${nextMatch.id}`);
      } else {
        console.log(`⚠️ Next match ${nextMatch.id} is already full, cannot assign player ${playerId}`);
      }
    } else {
      console.log(`⚠️ No next match found for player ${playerId} in round ${nextRound}, bracket position ${bracketPosition}`);
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
    currentRound: number,
    nextRound: number,
    bracketPosition: number
  ): Promise<void> {
    console.log(`🔍 checkAndStartNextRound: tournamentId=${tournamentId}, currentRound=${currentRound}, nextRound=${nextRound}, bracketPosition=${bracketPosition}`);
    
    // Check if all matches in current round are completed
    const pendingMatches = await DatabaseService.get(
      `SELECT COUNT(*) as count FROM tournament_matches 
       WHERE tournament_id = ? AND round = ? AND bracket_position = ? AND status != 'completed'`,
      [tournamentId, currentRound, bracketPosition]
    ) as { count: number };

    console.log(`🔍 Pending matches in round ${currentRound}: ${pendingMatches.count}`);

    if (pendingMatches.count === 0) {
      // All matches in current round completed, activate next round
      console.log(`✅ All matches in round ${currentRound} completed, activating round ${nextRound}`);
      await DatabaseService.run(
        `UPDATE tournament_matches SET status = 'pending' 
         WHERE tournament_id = ? AND round = ? AND bracket_position = ?`,
        [tournamentId, nextRound, bracketPosition]
      );
      console.log(`✅ Updated ${nextRound} round matches to 'pending' status`);
    } else {
      console.log(`⏳ Round ${currentRound} still has ${pendingMatches.count} pending matches, not activating next round yet`);
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

    console.log('🔍 buildSingleEliminationBracket - matches:', matches.length);
    console.log('🔍 buildSingleEliminationBracket - participants:', participants.length);
    console.log('🔍 buildSingleEliminationBracket - participantMap keys:', Array.from(participantMap.keys()));
    console.log('🔍 buildSingleEliminationBracket - participants with details:', participants.map(p => ({
      id: p.id,
      display_name: p.display_name,
      user_id: p.user_id,
      user: p.user?.username
    })));
    if (matches.length > 0) {
      console.log('🔍 buildSingleEliminationBracket - first match:', {
        matchId: matches[0].id,
        player1_id: matches[0].player1_id,
        player2_id: matches[0].player2_id,
        player1InMap: matches[0].player1_id ? participantMap.has(matches[0].player1_id) : false,
        player2InMap: matches[0].player2_id ? participantMap.has(matches[0].player2_id) : false
      });
    }

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
        console.log('🔍 Processing match:', {
          matchId: match.id,
          player1_id: match.player1_id,
          player2_id: match.player2_id,
          hasPlayer1: !!match.player1,
          hasPlayer2: !!match.player2,
          player1DisplayName: match.player1?.display_name,
          player2DisplayName: match.player2?.display_name
        });

        // Always try to get from participantMap first, as it has the most complete data
        // Only use match.player1/match.player2 if they have display_name and participantMap doesn't have the participant
        let player1: TournamentParticipant | undefined = undefined;
        let player2: TournamentParticipant | undefined = undefined;
        
        // Try to get player1 from participantMap first
        if (match.player1_id) {
          const mapPlayer1 = participantMap.get(match.player1_id);
          if (mapPlayer1 && mapPlayer1.display_name) {
            player1 = mapPlayer1;
            console.log('🔍 Got player1 from participantMap:', {
              player1_id: match.player1_id,
              displayName: player1.display_name,
              user: player1.user?.username
            });
          } else if (match.player1 && match.player1.display_name) {
            // Fallback to match.player1 if participantMap doesn't have it
            player1 = match.player1;
            console.log('🔍 Using match.player1 as fallback:', {
              player1_id: match.player1_id,
              displayName: player1.display_name
            });
          } else {
            console.log('🔍 Could not find player1:', {
              player1_id: match.player1_id,
              inMap: !!mapPlayer1,
              mapHasDisplayName: mapPlayer1?.display_name,
              matchHasPlayer1: !!match.player1,
              matchHasDisplayName: match.player1?.display_name
            });
          }
        }
        
        // Try to get player2 from participantMap first
        if (match.player2_id) {
          const mapPlayer2 = participantMap.get(match.player2_id);
          if (mapPlayer2 && mapPlayer2.display_name) {
            player2 = mapPlayer2;
            console.log('🔍 Got player2 from participantMap:', {
              player2_id: match.player2_id,
              displayName: player2.display_name,
              user: player2.user?.username
            });
          } else if (match.player2 && match.player2.display_name) {
            // Fallback to match.player2 if participantMap doesn't have it
            player2 = match.player2;
            console.log('🔍 Using match.player2 as fallback:', {
              player2_id: match.player2_id,
              displayName: player2.display_name
            });
          } else {
            console.log('🔍 Could not find player2:', {
              player2_id: match.player2_id,
              inMap: !!mapPlayer2,
              mapHasDisplayName: mapPlayer2?.display_name,
              matchHasPlayer2: !!match.player2,
              matchHasDisplayName: match.player2?.display_name
            });
          }
        }
        
        // If player1 exists but doesn't have user info, try to enrich from participantMap
        if (player1 && !player1.user && match.player1_id) {
          const enrichedPlayer1 = participantMap.get(match.player1_id);
          if (enrichedPlayer1 && enrichedPlayer1.user) {
            player1.user = enrichedPlayer1.user;
            console.log('🔍 Enriched player1 with user info:', enrichedPlayer1.user.username);
          }
        }
        
        // If player2 exists but doesn't have user info, try to enrich from participantMap
        if (player2 && !player2.user && match.player2_id) {
          const enrichedPlayer2 = participantMap.get(match.player2_id);
          if (enrichedPlayer2 && enrichedPlayer2.user) {
            player2.user = enrichedPlayer2.user;
            console.log('🔍 Enriched player2 with user info:', enrichedPlayer2.user.username);
          }
        }

        // Final check: if player1 or player2 is still undefined, try one more time from participantMap
        if (!player1 && match.player1_id) {
          player1 = participantMap.get(match.player1_id);
          console.log('🔍 Final attempt to get player1 from map:', {
            player1_id: match.player1_id,
            found: !!player1,
            displayName: player1?.display_name
          });
        }
        
        if (!player2 && match.player2_id) {
          player2 = participantMap.get(match.player2_id);
          console.log('🔍 Final attempt to get player2 from map:', {
            player2_id: match.player2_id,
            found: !!player2,
            displayName: player2?.display_name
          });
        }

        // Ensure player1 and player2 are either valid TournamentParticipant or undefined (not empty object)
        const finalPlayer1 = player1 && player1.display_name ? player1 : undefined;
        const finalPlayer2 = player2 && player2.display_name ? player2 : undefined;
        
        console.log('🔍 Before creating node:', {
          player1: player1 ? { id: player1.id, display_name: player1.display_name } : 'undefined',
          player2: player2 ? { id: player2.id, display_name: player2.display_name } : 'undefined',
          finalPlayer1: finalPlayer1 ? { id: finalPlayer1.id, display_name: finalPlayer1.display_name } : 'undefined',
          finalPlayer2: finalPlayer2 ? { id: finalPlayer2.id, display_name: finalPlayer2.display_name } : 'undefined'
        });
        
        // Build node object conditionally to avoid undefined properties in JSON
        const node: any = {
          id: match.id,
          match_id: match.id,
          round,
          position: { x: match.bracket_position || 0, y: round }
        };
        
        // Only add player1, player2, winner if they exist and have display_name
        console.log('🔍 Setting player1 and player2:', {
          finalPlayer1Exists: !!finalPlayer1,
          finalPlayer1DisplayName: finalPlayer1?.display_name,
          finalPlayer2Exists: !!finalPlayer2,
          finalPlayer2DisplayName: finalPlayer2?.display_name
        });
        
        if (finalPlayer1 && finalPlayer1.display_name) {
          // Create a clean copy to avoid any serialization issues
          const player1Copy: any = {
            id: finalPlayer1.id,
            tournament_id: finalPlayer1.tournament_id,
            user_id: finalPlayer1.user_id,
            guest_alias: finalPlayer1.guest_alias,
            display_name: finalPlayer1.display_name,
            avatar_url: finalPlayer1.avatar_url,
            joined_at: finalPlayer1.joined_at,
            eliminated_at: finalPlayer1.eliminated_at,
            final_rank: finalPlayer1.final_rank,
            seed: finalPlayer1.seed,
            is_ready: finalPlayer1.is_ready
          };
          if (finalPlayer1.user) {
            player1Copy.user = {
              id: finalPlayer1.user.id,
              username: finalPlayer1.user.username,
              email: finalPlayer1.user.email
            };
          }
          node.player1 = player1Copy;
          console.log('🔍 Set player1:', JSON.stringify(player1Copy));
        } else {
          console.log('🔍 Skipping player1:', { finalPlayer1: !!finalPlayer1, displayName: finalPlayer1?.display_name });
        }
        
        if (finalPlayer2 && finalPlayer2.display_name) {
          // Create a clean copy to avoid any serialization issues
          const player2Copy: any = {
            id: finalPlayer2.id,
            tournament_id: finalPlayer2.tournament_id,
            user_id: finalPlayer2.user_id,
            guest_alias: finalPlayer2.guest_alias,
            display_name: finalPlayer2.display_name,
            avatar_url: finalPlayer2.avatar_url,
            joined_at: finalPlayer2.joined_at,
            eliminated_at: finalPlayer2.eliminated_at,
            final_rank: finalPlayer2.final_rank,
            seed: finalPlayer2.seed,
            is_ready: finalPlayer2.is_ready
          };
          if (finalPlayer2.user) {
            player2Copy.user = {
              id: finalPlayer2.user.id,
              username: finalPlayer2.user.username,
              email: finalPlayer2.user.email
            };
          }
          node.player2 = player2Copy;
          console.log('🔍 Set player2:', JSON.stringify(player2Copy));
        } else {
          console.log('🔍 Skipping player2:', { finalPlayer2: !!finalPlayer2, displayName: finalPlayer2?.display_name });
        }
        
        const winner = match.winner || (match.winner_id ? participantMap.get(match.winner_id) : undefined);
        if (winner && winner.display_name) {
          node.winner = {
            id: winner.id,
            tournament_id: winner.tournament_id,
            user_id: winner.user_id,
            guest_alias: winner.guest_alias,
            display_name: winner.display_name,
            avatar_url: winner.avatar_url,
            joined_at: winner.joined_at,
            eliminated_at: winner.eliminated_at,
            final_rank: winner.final_rank,
            seed: winner.seed,
            is_ready: winner.is_ready
          };
          if (winner.user) {
            node.winner.user = {
              id: winner.user.id,
              username: winner.user.username,
              email: winner.user.email
            };
          }
        }
        
        console.log('🔍 Created bracket node:', {
          nodeId: node.id,
          player1: node.player1?.display_name || 'undefined',
          player2: node.player2?.display_name || 'undefined',
          winner: node.winner?.display_name || 'undefined',
          player1Id: node.player1?.id,
          player2Id: node.player2?.id,
          winnerId: node.winner?.id,
          player1Exists: !!node.player1,
          player2Exists: !!node.player2,
          winnerExists: !!node.winner,
          matchWinnerId: match.winner_id,
          matchWinner: match.winner ? { id: match.winner.id, display_name: match.winner.display_name } : 'none',
          player1Type: typeof node.player1,
          player2Type: typeof node.player2,
          player1Keys: node.player1 ? Object.keys(node.player1) : [],
          player2Keys: node.player2 ? Object.keys(node.player2) : [],
          player1Full: JSON.stringify(node.player1),
          player2Full: JSON.stringify(node.player2),
          nodeStringified: JSON.stringify(node)
        });
        
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
        // Use match.player1 and match.player2 if available (from getTournamentMatches),
        // otherwise fall back to participantMap lookup
        const node: BracketNode = {
          id: match.id,
          match_id: match.id,
          player1: match.player1 || (match.player1_id ? participantMap.get(match.player1_id) : undefined),
          player2: match.player2 || (match.player2_id ? participantMap.get(match.player2_id) : undefined),
          winner: match.winner || (match.winner_id ? participantMap.get(match.winner_id) : undefined),
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

  /**
   * Clear all tournament data (for testing/development)
   * Preserves user data
   */
  static async clearAllTournaments(): Promise<void> {
    console.log('🧹 Clearing all tournament data...');
    
    try {
      // Delete in correct order (respecting foreign keys)
      await DatabaseService.run('DELETE FROM tournament_matches');
      console.log('   ✅ Cleared tournament_matches');
      
      await DatabaseService.run('DELETE FROM tournament_participants');
      console.log('   ✅ Cleared tournament_participants');
      
      await DatabaseService.run('DELETE FROM tournaments');
      console.log('   ✅ Cleared tournaments');
      
      // Reset auto-increment counters
      await DatabaseService.run("DELETE FROM sqlite_sequence WHERE name='tournaments'");
      await DatabaseService.run("DELETE FROM sqlite_sequence WHERE name='tournament_participants'");
      await DatabaseService.run("DELETE FROM sqlite_sequence WHERE name='tournament_matches'");
      console.log('   ✅ Reset auto-increment counters');
      
      // Clear in-memory game rooms from SocketIO service
      const socketIOService = (global as any).socketIOService;
      if (socketIOService && typeof socketIOService.clearAllGameRooms === 'function') {
        socketIOService.clearAllGameRooms();
        console.log('   ✅ Cleared in-memory game rooms');
      }
      
      console.log('✅ Tournament data cleanup completed successfully!');
    } catch (error) {
      console.error('❌ Error during tournament cleanup:', error);
      throw error;
    }
  }
}
