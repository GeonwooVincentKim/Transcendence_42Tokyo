/**
 * Tournament Service
 *
 * Provides CRUD operations for tournaments, participants, and matches,
 * and utilities to generate single-elimination brackets with proper progression.
 */

import { DatabaseService } from './databaseService';

export interface CreateTournamentInput {
  name: string;
  description?: string;
  maxParticipants: number;
  createdBy?: number;
}

export interface Tournament {
  id: number;
  name: string;
  description?: string | null;
  max_participants: number;
  status: 'registration' | 'active' | 'completed';
  created_by?: number | null;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface TournamentParticipant {
  id: number;
  tournament_id: number;
  user_id: number;
  joined_at: string;
  eliminated_at?: string | null;
  final_rank?: number | null;
  username?: string;
}

export interface TournamentMatch {
  id: number;
  tournament_id: number;
  round: number;
  match_number: number;
  player1_id?: number | null;
  player2_id?: number | null;
  winner_id?: number | null;
  status: 'pending' | 'active' | 'completed';
  player1_score: number;
  player2_score: number;
  created_at: string;
  started_at?: string | null;
  finished_at?: string | null;
  player1_username?: string;
  player2_username?: string;
  winner_username?: string;
}

export interface TournamentBracket {
  round: number;
  matches: TournamentMatch[];
}

export class TournamentService {
  static async createTournament(input: CreateTournamentInput): Promise<Tournament> {
    // Validate input
    if (!input.name || !input.maxParticipants || input.maxParticipants < 2) {
      throw new Error('Invalid tournament input: name and maxParticipants (>=2) are required');
    }

    // If createdBy is provided, validate that the user exists
    if (input.createdBy) {
      const userExists = await DatabaseService.query(
        `SELECT id FROM users WHERE id = $1`,
        [input.createdBy]
      );
      if (userExists.length === 0) {
        throw new Error('User not found');
      }
    }

    await DatabaseService.run(
      `INSERT INTO tournaments (name, description, max_participants, created_by)
       VALUES ($1, $2, $3, $4)`,
      [input.name, input.description || null, input.maxParticipants, input.createdBy || null]
    );

    const rows = await DatabaseService.query(
      `SELECT * FROM tournaments WHERE name = $1 ORDER BY id DESC LIMIT 1`,
      [input.name]
    );
    
    if (!rows || rows.length === 0) {
      throw new Error('Failed to create tournament');
    }
    
    return rows[0] as Tournament;
  }

  static async listTournaments(): Promise<Tournament[]> {
    const rows = await DatabaseService.query(`SELECT * FROM tournaments ORDER BY created_at DESC`);
    return rows as Tournament[];
  }

  static async getTournamentById(tournamentId: number): Promise<Tournament | null> {
    const rows = await DatabaseService.query(`SELECT * FROM tournaments WHERE id = $1`, [tournamentId]);
    return rows[0] || null;
  }

  static async joinTournament(tournamentId: number, userId: number): Promise<void> {
    // Check if tournament is in registration phase
    const tournament = await this.getTournamentById(tournamentId);
    if (!tournament || tournament.status !== 'registration') {
      throw new Error('Tournament is not accepting participants');
    }

    // Check if user is already a participant
    const existing = await DatabaseService.query(
      `SELECT id FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2`,
      [tournamentId, userId]
    );
    if (existing.length > 0) {
      throw new Error('User is already a participant');
    }

    // Check if tournament is full
    const participantCount = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = $1`,
      [tournamentId]
    );
    if (participantCount[0].count >= tournament.max_participants) {
      throw new Error('Tournament is full');
    }

    // Validate that tournamentId and userId are valid numbers
    if (!tournamentId || !userId || isNaN(tournamentId) || isNaN(userId)) {
      throw new Error('Invalid tournament ID or user ID');
    }

    await DatabaseService.run(
      `INSERT INTO tournament_participants (tournament_id, user_id)
       VALUES ($1, $2)`,
      [tournamentId, userId]
    );
  }

  static async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    const rows = await DatabaseService.query(
      `SELECT tp.*, u.username 
       FROM tournament_participants tp 
       LEFT JOIN users u ON tp.user_id = u.id 
       WHERE tp.tournament_id = $1 
       ORDER BY tp.joined_at ASC`,
      [tournamentId]
    );
    return rows as TournamentParticipant[];
  }

  static async startTournament(tournamentId: number): Promise<void> {
    // Validate tournamentId
    if (!tournamentId || isNaN(tournamentId)) {
      throw new Error('Invalid tournament ID');
    }

    // Fetch participants
    const participants = await this.getTournamentParticipants(tournamentId);

    if (participants.length < 2) {
      throw new Error('Not enough participants to start the tournament');
    }

    // Update tournament status
    await DatabaseService.run(
      `UPDATE tournaments SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [tournamentId]
    );

    // Generate matches for round 1 (single-elimination)
    const shuffled = [...participants].sort(() => Math.random() - 0.5);
    let matchNumber = 1;
    
    for (let i = 0; i < shuffled.length; i += 2) {
      const p1 = shuffled[i]?.user_id ?? null;
      const p2 = shuffled[i + 1]?.user_id ?? null; // bye if null
      
      // Validate that we have valid user IDs
      if (p1 === null) {
        throw new Error('Invalid participant data');
      }

      await DatabaseService.run(
        `INSERT INTO tournament_matches (
          tournament_id, round, match_number, player1_id, player2_id, status
        ) VALUES ($1, 1, $2, $3, $4, $5)`,
        [tournamentId, matchNumber++, p1, p2, p2 ? 'pending' : 'completed']
      );

      // If bye, immediately advance p1
      if (p2 === null && p1 !== null) {
        await DatabaseService.run(
          `UPDATE tournament_matches SET winner_id = $1 WHERE tournament_id = $2 AND round = 1 AND match_number = $3`,
          [p1, tournamentId, matchNumber - 1]
        );
      }
    }
  }

  static async listMatches(tournamentId: number): Promise<TournamentMatch[]> {
    const rows = await DatabaseService.query(
      `SELECT tm.*, 
              p1.username as player1_username, 
              p2.username as player2_username,
              w.username as winner_username
       FROM tournament_matches tm
       LEFT JOIN users p1 ON tm.player1_id = p1.id
       LEFT JOIN users p2 ON tm.player2_id = p2.id
       LEFT JOIN users w ON tm.winner_id = w.id
       WHERE tm.tournament_id = $1 
       ORDER BY tm.round ASC, tm.match_number ASC`,
      [tournamentId]
    );
    return rows as TournamentMatch[];
  }

  static async getBrackets(tournamentId: number): Promise<TournamentBracket[]> {
    const matches = await this.listMatches(tournamentId);
    const byRound: Record<number, TournamentMatch[]> = {};
    
    for (const m of matches) {
      byRound[m.round] = byRound[m.round] || [];
      byRound[m.round].push(m);
    }
    
    return Object.keys(byRound).map(round => ({
      round: parseInt(round),
      matches: byRound[parseInt(round)]
    }));
  }

  static async getCurrentMatch(tournamentId: number): Promise<TournamentMatch | null> {
    const rows = await DatabaseService.query(
      `SELECT tm.*, 
              p1.username as player1_username, 
              p2.username as player2_username,
              w.username as winner_username
       FROM tournament_matches tm
       LEFT JOIN users p1 ON tm.player1_id = p1.id
       LEFT JOIN users p2 ON tm.player2_id = p2.id
       LEFT JOIN users w ON tm.winner_id = w.id
       WHERE tm.tournament_id = $1 AND tm.status = 'pending'
       ORDER BY tm.round ASC, tm.match_number ASC
       LIMIT 1`,
      [tournamentId]
    );
    return rows[0] || null;
  }

  static async getNextMatch(tournamentId: number): Promise<TournamentMatch | null> {
    const rows = await DatabaseService.query(
      `SELECT tm.*, 
              p1.username as player1_username, 
              p2.username as player2_username,
              w.username as winner_username
       FROM tournament_matches tm
       LEFT JOIN users p1 ON tm.player1_id = p1.id
       LEFT JOIN users p2 ON tm.player2_id = p2.id
       LEFT JOIN users w ON tm.winner_id = w.id
       WHERE tm.tournament_id = $1 AND tm.status = 'pending'
       ORDER BY tm.round ASC, tm.match_number ASC
       LIMIT 1 OFFSET 1`,
      [tournamentId]
    );
    return rows[0] || null;
  }

  static async startMatch(tournamentId: number, matchId: number): Promise<void> {
    await DatabaseService.run(
      `UPDATE tournament_matches SET status = 'active', started_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND tournament_id = $2`,
      [matchId, tournamentId]
    );
  }

  static async reportMatchResult(
    tournamentId: number,
    matchId: number,
    winnerUserId: number,
    player1Score: number,
    player2Score: number
  ): Promise<void> {
    // Update match result
    await DatabaseService.run(
      `UPDATE tournament_matches
       SET winner_id = $1, status = 'completed', player1_score = $2, player2_score = $3, finished_at = CURRENT_TIMESTAMP
       WHERE id = $4 AND tournament_id = $5`,
      [winnerUserId, player1Score, player2Score, matchId, tournamentId]
    );

    // Check if this round is complete
    const currentMatch = await DatabaseService.query(
      `SELECT round FROM tournament_matches WHERE id = $1`,
      [matchId]
    );
    
    if (currentMatch.length > 0) {
      const currentRound = currentMatch[0].round;
      const roundMatches = await DatabaseService.query(
        `SELECT COUNT(*) as total, 
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
         FROM tournament_matches 
         WHERE tournament_id = $1 AND round = $2`,
        [tournamentId, currentRound]
      );

      if (roundMatches[0].total === roundMatches[0].completed) {
        // Round is complete, generate next round
        await this.generateNextRound(tournamentId, currentRound);
      }
    }

    // Check if tournament is complete
    const pendingMatches = await DatabaseService.query(
      `SELECT COUNT(*) as count FROM tournament_matches WHERE tournament_id = $1 AND status != 'completed'`,
      [tournamentId]
    );

    if (pendingMatches[0].count === 0) {
      await this.completeTournament(tournamentId);
    }
  }

  private static async generateNextRound(tournamentId: number, currentRound: number): Promise<void> {
    // Get winners from current round
    const winners = await DatabaseService.query(
      `SELECT winner_id FROM tournament_matches 
       WHERE tournament_id = $1 AND round = $2 AND winner_id IS NOT NULL
       ORDER BY match_number ASC`,
      [tournamentId, currentRound]
    );

    if (winners.length < 2) {
      // Only one winner, tournament complete
      return;
    }

    const nextRound = currentRound + 1;
    let matchNumber = 1;

    // Generate matches for next round
    for (let i = 0; i < winners.length; i += 2) {
      const p1 = winners[i]?.winner_id ?? null;
      const p2 = winners[i + 1]?.winner_id ?? null; // bye if null

      await DatabaseService.run(
        `INSERT INTO tournament_matches (
          tournament_id, round, match_number, player1_id, player2_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [tournamentId, nextRound, matchNumber++, p1, p2, p2 ? 'pending' : 'completed']
      );

      // If bye, immediately advance p1
      if (p2 === null && p1 !== null) {
        await DatabaseService.run(
          `UPDATE tournament_matches SET winner_id = $1 WHERE tournament_id = $2 AND round = $3 AND match_number = $4`,
          [p1, tournamentId, nextRound, matchNumber - 1]
        );
      }
    }
  }

  private static async completeTournament(tournamentId: number): Promise<void> {
    // Get final winner
    const finalMatch = await DatabaseService.query(
      `SELECT winner_id FROM tournament_matches 
       WHERE tournament_id = $1 
       ORDER BY round DESC, match_number DESC 
       LIMIT 1`,
      [tournamentId]
    );

    if (finalMatch.length > 0 && finalMatch[0].winner_id) {
      // Update final rankings
      const participants = await this.getTournamentParticipants(tournamentId);
      const matches = await this.listMatches(tournamentId);
      
      // Calculate final rankings based on elimination order
      const rankings = this.calculateFinalRankings(participants, matches);
      
      for (const ranking of rankings) {
        await DatabaseService.run(
          `UPDATE tournament_participants 
           SET final_rank = $1, eliminated_at = CURRENT_TIMESTAMP 
           WHERE tournament_id = $2 AND user_id = $3`,
          [ranking.rank, tournamentId, ranking.userId]
        );
      }
    }

    // Update tournament status
    await DatabaseService.run(
      `UPDATE tournaments SET status = 'completed', finished_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [tournamentId]
    );
  }

  private static calculateFinalRankings(
    participants: TournamentParticipant[], 
    matches: TournamentMatch[]
  ): Array<{ userId: number; rank: number }> {
    const rankings: Array<{ userId: number; rank: number }> = [];
    const eliminated = new Set<number>();
    
    // Find the final winner (last match winner)
    const finalMatch = matches[matches.length - 1];
    if (finalMatch?.winner_id) {
      rankings.push({ userId: finalMatch.winner_id, rank: 1 });
    }

    // Find runner-up (final match loser)
    if (finalMatch) {
      const runnerUp = finalMatch.player1_id === finalMatch.winner_id ? 
        finalMatch.player2_id : finalMatch.player1_id;
      if (runnerUp) {
        rankings.push({ userId: runnerUp, rank: 2 });
        eliminated.add(runnerUp);
      }
    }

    // Add other participants (they all get the same rank)
    for (const participant of participants) {
      if (!eliminated.has(participant.user_id) && 
          participant.user_id !== finalMatch?.winner_id) {
        rankings.push({ userId: participant.user_id, rank: 3 });
      }
    }

    return rankings;
  }

  static async getTournamentStats(tournamentId: number): Promise<any> {
    const tournament = await this.getTournamentById(tournamentId);
    const participants = await this.getTournamentParticipants(tournamentId);
    const matches = await this.listMatches(tournamentId);
    
    const completedMatches = matches.filter(m => m.status === 'completed');
    const pendingMatches = matches.filter(m => m.status === 'pending');
    const activeMatches = matches.filter(m => m.status === 'active');

    return {
      tournament,
      participantCount: participants.length,
      totalMatches: matches.length,
      completedMatches: completedMatches.length,
      pendingMatches: pendingMatches.length,
      activeMatches: activeMatches.length,
      progress: tournament?.status === 'completed' ? 100 : 
                (completedMatches.length / matches.length) * 100
    };
  }

  /**
   * Automatically clean up empty tournaments (no participants)
   * This method removes tournaments that have no participants
   */
  static async cleanupEmptyTournaments(): Promise<number> {
    try {
      // Find tournaments with no participants
      const emptyTournaments = await DatabaseService.query(
        `SELECT t.id FROM tournaments t
         LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
         WHERE tp.tournament_id IS NULL
         AND t.status = 'registration'`
      );

      let cleanedCount = 0;
      for (const tournament of emptyTournaments) {
        // Delete tournament matches first
        await DatabaseService.run(
          'DELETE FROM tournament_matches WHERE tournament_id = $1',
          [tournament.id]
        );
        
        // Delete tournament participants (should be none, but safety first)
        await DatabaseService.run(
          'DELETE FROM tournament_participants WHERE tournament_id = $1',
          [tournament.id]
        );
        
        // Delete the tournament
        await DatabaseService.run(
          'DELETE FROM tournaments WHERE id = $1',
          [tournament.id]
        );
        
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      console.error('Error cleaning up empty tournaments:', error);
      return 0;
    }
  }

  /**
   * Remove participant from tournament and cleanup if empty
   */
  static async removeParticipant(tournamentId: number, userId: number): Promise<boolean> {
    try {
      // Remove participant
      await DatabaseService.run(
        'DELETE FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
        [tournamentId, userId]
      );

      // Check if tournament is now empty
      const remainingParticipants = await DatabaseService.query(
        'SELECT COUNT(*) as count FROM tournament_participants WHERE tournament_id = $1',
        [tournamentId]
      );

      const participantCount = remainingParticipants[0]?.count || 0;

      if (participantCount === 0) {
        // Tournament is empty, clean it up
        await this.cleanupEmptyTournaments();
        return true; // Tournament was cleaned up
      }

      return false; // Tournament still has participants
    } catch (error) {
      console.error('Error removing participant:', error);
      return false;
    }
  }
}


