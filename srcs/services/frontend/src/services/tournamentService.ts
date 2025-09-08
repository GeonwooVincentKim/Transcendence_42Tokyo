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

export interface TournamentStats {
  tournament: Tournament;
  participantCount: number;
  totalMatches: number;
  completedMatches: number;
  pendingMatches: number;
  activeMatches: number;
  progress: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const TournamentService = {
  async list(): Promise<Tournament[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments`);
    if (!res.ok) throw new Error('Failed to list tournaments');
    return res.json();
  },

  async get(id: number): Promise<Tournament> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}`);
    if (!res.ok) throw new Error('Failed to get tournament');
    return res.json();
  },

  async create(
    token: string,
    input: { name: string; description?: string; maxParticipants: number }
  ): Promise<Tournament> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(input)
    });
    if (!res.ok) throw new Error('Failed to create tournament');
    return res.json();
  },

  async join(token: string, id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/join`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to join tournament');
  },

  async leave(token: string, id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/leave`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to leave tournament');
  },

  async start(token: string, id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to start tournament');
  },

  async getParticipants(id: number): Promise<TournamentParticipant[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/participants`);
    if (!res.ok) throw new Error('Failed to get participants');
    return res.json();
  },

  async listMatches(id: number): Promise<TournamentMatch[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/matches`);
    if (!res.ok) throw new Error('Failed to list matches');
    return res.json();
  },

  async getBrackets(id: number): Promise<TournamentBracket[]> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/brackets`);
    if (!res.ok) throw new Error('Failed to get brackets');
    return res.json();
  },

  async getCurrentMatch(id: number): Promise<TournamentMatch | null> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/current-match`);
    if (!res.ok) throw new Error('Failed to get current match');
    return res.json();
  },

  async getNextMatch(id: number): Promise<TournamentMatch | null> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/next-match`);
    if (!res.ok) throw new Error('Failed to get next match');
    return res.json();
  },

  async startMatch(token: string, tournamentId: number, matchId: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/matches/${matchId}/start`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) throw new Error('Failed to start match');
  },

  async reportMatchResult(
    token: string, 
    tournamentId: number, 
    matchId: number, 
    winnerUserId: number, 
    player1Score: number, 
    player2Score: number
  ): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        winnerUserId,
        player1Score,
        player2Score
      })
    });
    if (!res.ok) throw new Error('Failed to report match result');
  },

  async getStats(id: number): Promise<TournamentStats> {
    const res = await fetch(`${API_BASE_URL}/api/tournaments/${id}/stats`);
    if (!res.ok) throw new Error('Failed to get tournament stats');
    return res.json();
  },

  async joinGameRoom(token: string, tournamentId: number, matchId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/matches/${matchId}/join-game`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to join game room');
    }

    return response.json();
  },

  async leaveGameRoom(token: string, tournamentId: number, matchId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/matches/${matchId}/leave-game`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to leave game room');
    }
  }
};


