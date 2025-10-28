/**
 * Tournament Service
 * 
 * Frontend service for tournament API communication
 */

// Types
export type TournamentStatus = 'registration' | 'active' | 'completed' | 'cancelled';
export type TournamentType = 'single_elimination' | 'double_elimination' | 'round_robin';
export type MatchStatus = 'pending' | 'active' | 'completed' | 'forfeit';

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
  settings?: string | null;
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
  stats?: {
    wins: number;
    losses: number;
    totalGames: number;
    winRate: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifference: number;
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
  match_data?: string | null;
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

export interface TournamentStats {
  total_tournaments: number;
  active_tournaments: number;
  completed_tournaments: number;
  total_participants: number;
  total_matches: number;
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
  user_id?: number;
  guest_alias?: string;
  display_name: string;
  avatar_url?: string;
}

export interface UpdateMatchResultInput {
  winner_id: number;
  player1_score: number;
  player2_score: number;
  game_session_id?: string;
}

// API Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class TournamentService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        ...options.headers,
      },
    };

    // Only set Content-Type for requests with a body
    if (options.body) {
      defaultOptions.headers = {
        'Content-Type': 'application/json',
        ...defaultOptions.headers,
      };
    }

    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Request failed');
    }

    return data.data as T;
  }

  // Tournament CRUD operations
  async createTournament(input: CreateTournamentInput): Promise<Tournament> {
    return this.request<Tournament>('/api/tournaments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getTournament(id: number): Promise<Tournament> {
    return this.request<Tournament>(`/api/tournaments/${id}`);
  }

  async listTournaments(filters: {
    status?: TournamentStatus;
    tournament_type?: TournamentType;
    created_by?: number;
    limit?: number;
    offset?: number;
  } = {}): Promise<Tournament[]> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.tournament_type) params.append('tournament_type', filters.tournament_type);
    if (filters.created_by) params.append('created_by', filters.created_by.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());
    if (filters.offset) params.append('offset', filters.offset.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/api/tournaments?${queryString}` : '/api/tournaments';
    
    return this.request<Tournament[]>(endpoint);
  }

  async cancelTournament(id: number): Promise<void> {
    await this.request(`/api/tournaments/${id}/cancel`, {
      method: 'POST',
    });
  }

  // Participant operations
  async joinTournament(tournamentId: number, input: JoinTournamentInput): Promise<TournamentParticipant> {
    return this.request<TournamentParticipant>(`/api/tournaments/${tournamentId}/join`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async leaveTournament(tournamentId: number, userId?: number, guestAlias?: string): Promise<void> {
    await this.request(`/api/tournaments/${tournamentId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, guest_alias: guestAlias }),
    });
  }

  async getTournamentParticipants(tournamentId: number): Promise<TournamentParticipant[]> {
    return this.request<TournamentParticipant[]>(`/api/tournaments/${tournamentId}/participants`);
  }

  // Match operations
  async getTournamentMatches(tournamentId: number): Promise<TournamentMatch[]> {
    return this.request<TournamentMatch[]>(`/api/tournaments/${tournamentId}/matches`);
  }

  async getMatch(_matchId: number): Promise<TournamentMatch> {
    // Note: This would need a dedicated endpoint in the backend
    // For now, we'll get it from tournament matches
    throw new Error('Get match by ID not implemented yet');
  }

  async updateMatchResult(
    tournamentId: number, 
    matchId: number, 
    input: UpdateMatchResultInput
  ): Promise<void> {
    await this.request(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // Tournament management
  async startTournament(id: number): Promise<void> {
    await this.request(`/api/tournaments/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async getTournamentBracket(tournamentId: number): Promise<BracketNode[]> {
    return this.request<BracketNode[]>(`/api/tournaments/${tournamentId}/bracket`);
  }

  // Statistics
  async getTournamentStats(): Promise<TournamentStats> {
    return this.request<TournamentStats>('/api/tournaments/stats');
  }

  // Utility methods
  async isUserInTournament(tournamentId: number, userId?: number, guestAlias?: string): Promise<boolean> {
    try {
      const participants = await this.getTournamentParticipants(tournamentId);
      
      if (userId) {
        return participants.some(p => p.user_id === userId);
      } else if (guestAlias) {
        return participants.some(p => p.guest_alias === guestAlias);
      }
      
      return false;
    } catch (error) {
      console.error('Error checking tournament participation:', error);
      return false;
    }
  }

  async getTournamentStatus(tournamentId: number): Promise<TournamentStatus> {
    const tournament = await this.getTournament(tournamentId);
    return tournament.status;
  }

  async canJoinTournament(tournamentId: number): Promise<boolean> {
    try {
      const tournament = await this.getTournament(tournamentId);
      const participants = await this.getTournamentParticipants(tournamentId);
      
      return tournament.status === 'registration' && participants.length < tournament.max_participants;
    } catch (error) {
      console.error('Error checking if can join tournament:', error);
      return false;
    }
  }

  async canStartTournament(tournamentId: number): Promise<boolean> {
    try {
      const tournament = await this.getTournament(tournamentId);
      const participants = await this.getTournamentParticipants(tournamentId);
      
      return tournament.status === 'registration' && participants.length >= 2;
    } catch (error) {
      console.error('Error checking if can start tournament:', error);
      return false;
    }
  }

  // Tournament type helpers
  getTournamentTypeDisplayName(type: TournamentType): string {
    switch (type) {
      case 'single_elimination':
        return 'Single Elimination';
      case 'double_elimination':
        return 'Double Elimination';
      case 'round_robin':
        return 'Round Robin';
      default:
        return type;
    }
  }

  getTournamentStatusDisplayName(status: TournamentStatus): string {
    switch (status) {
      case 'registration':
        return 'Registration Open';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }

  getTournamentStatusColor(status: TournamentStatus): string {
    switch (status) {
      case 'registration':
        return 'text-blue-600 bg-blue-100';
      case 'active':
        return 'text-green-600 bg-green-100';
      case 'completed':
        return 'text-gray-600 bg-gray-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  // Bracket helpers
  calculateBracketRounds(participantCount: number, tournamentType: TournamentType): number {
    switch (tournamentType) {
      case 'single_elimination':
        return Math.ceil(Math.log2(participantCount));
      case 'double_elimination':
        return Math.ceil(Math.log2(participantCount)) * 2 - 1;
      case 'round_robin':
        return 1; // All matches in one round
      default:
        return 1;
    }
  }

  getBracketPosition(round: number, matchInRound: number, _totalRounds: number): { x: number; y: number } {
    const x = round * 200; // Horizontal spacing between rounds
    const y = matchInRound * 100; // Vertical spacing between matches
    
    return { x, y };
  }

  // Match helpers
  getMatchStatusDisplayName(status: MatchStatus): string {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'active':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'forfeit':
        return 'Forfeit';
      default:
        return status;
    }
  }

  getMatchStatusColor(status: MatchStatus): string {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'active':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'forfeit':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  }

  // Validation helpers
  validateTournamentName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'Tournament name is required';
    }
    if (name.length > 100) {
      return 'Tournament name must be 100 characters or less';
    }
    return null;
  }

  validateMaxParticipants(maxParticipants: number): string | null {
    if (maxParticipants < 2) {
      return 'Tournament must have at least 2 participants';
    }
    if (maxParticipants > 64) {
      return 'Tournament cannot have more than 64 participants';
    }
    return null;
  }

  validateDisplayName(displayName: string): string | null {
    if (!displayName || displayName.trim().length === 0) {
      return 'Display name is required';
    }
    if (displayName.length > 50) {
      return 'Display name must be 50 characters or less';
    }
    return null;
  }

  validateGuestAlias(guestAlias: string): string | null {
    if (!guestAlias || guestAlias.trim().length === 0) {
      return 'Guest alias is required';
    }
    if (guestAlias.length > 50) {
      return 'Guest alias must be 50 characters or less';
    }
    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(guestAlias)) {
      return 'Guest alias can only contain letters, numbers, underscores, and hyphens';
    }
    return null;
  }
}

// Export singleton instance
export const tournamentService = new TournamentService();
export default tournamentService;
