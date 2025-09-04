import React, { useState, useEffect } from 'react';
import { TournamentService } from '../services/tournamentService';
import type { 
  Tournament as TournamentType, 
  TournamentParticipant, 
  TournamentMatch, 
  TournamentBracket,
  TournamentStats
} from '../services/tournamentService';
import { AuthService } from '../services/authService';

interface Props {
  onBack: () => void;
}

export const Tournament: React.FC<Props> = ({ onBack }) => {
  const [tournaments, setTournaments] = useState<TournamentType[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentType | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [brackets, setBrackets] = useState<TournamentBracket[]>([]);
  const [currentMatch, setCurrentMatch] = useState<TournamentMatch | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [view, setView] = useState<'list' | 'detail' | 'brackets'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('New Tournament');
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [description, setDescription] = useState('');

  const token = AuthService.getStoredAuthData()?.token || '';

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentDetails(selectedTournament.id);
    }
  }, [selectedTournament]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TournamentService.list();
      setTournaments(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  };

  const loadTournamentDetails = async (tournamentId: number) => {
    try {
      setError(null);
      const [participantsData, matchesData, bracketsData, currentMatchData, statsData] = await Promise.all([
        TournamentService.getParticipants(tournamentId),
        TournamentService.listMatches(tournamentId),
        TournamentService.getBrackets(tournamentId),
        TournamentService.getCurrentMatch(tournamentId),
        TournamentService.getStats(tournamentId)
      ]);

      setParticipants(participantsData);
      setMatches(matchesData);
      setBrackets(bracketsData);
      setCurrentMatch(currentMatchData);
      setStats(statsData);
    } catch (e: any) {
      setError(e.message || 'Failed to load tournament details');
    }
  };

  const createTournament = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await TournamentService.create(token, {
        name,
        description,
        maxParticipants
      });
      
      setName('New Tournament');
      setMaxParticipants(2);
      setDescription('');
      setError('Tournament created successfully!');
      await loadTournaments();
    } catch (e: any) {
      setError(e.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournament: TournamentType) => {
    try {
      await TournamentService.join(token, tournament.id);
      if (selectedTournament?.id === tournament.id) {
        await loadTournamentDetails(tournament.id);
      }
      setError('Joined tournament successfully!');
      await loadTournaments();
    } catch (e: any) {
      setError(e.message || 'Failed to join tournament');
    }
  };

  const startTournament = async (tournament: TournamentType) => {
    try {
      // 토너먼트 시작 전 조건 확인
      if (tournament.status !== 'registration') {
        setError('Tournament cannot be started in current state');
        return;
      }
      
      // 참가자 수 확인 (최소 2명 필요)
      if (participants.length < 2) {
        setError(`Tournament needs at least 2 participants to start. Current: ${participants.length}`);
        return;
      }
      
      // 참가자 수가 최대 인원을 초과하지 않는지 확인
      if (participants.length > tournament.max_participants) {
        setError(`Too many participants. Max: ${tournament.max_participants}, Current: ${participants.length}`);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      await TournamentService.start(token, tournament.id);
      
      if (selectedTournament?.id === tournament.id) {
        await loadTournamentDetails(tournament.id);
      }
      
      setError('Tournament started successfully!');
      await loadTournaments();
    } catch (e: any) {
      console.error('Tournament start error:', e);
      setError(e.message || 'Failed to start tournament. Please check tournament requirements.');
    } finally {
      setLoading(false);
    }
  };

  const startMatch = async (matchId: number) => {
    if (!selectedTournament) return;
    
    try {
      await TournamentService.startMatch(token, selectedTournament.id, matchId);
      await loadTournamentDetails(selectedTournament.id);
      setError('Match started successfully!');
    } catch (error: any) {
      setError(error.message || 'Failed to start match');
    }
  };



  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration': return 'text-blue-600';
      case 'active': return 'text-green-600';
      case 'completed': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getMatchStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'active': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const renderTournamentList = () => (
    <div className="space-y-4">
      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded">
        <h3 className="text-xl font-semibold mb-4">Create Tournament</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input 
            className="px-3 py-2 text-black rounded" 
            placeholder="Tournament Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <div className="flex flex-col">
            <input 
              className="px-3 py-2 text-black rounded" 
              type="number" 
              min={2} 
              max={16} 
              value={maxParticipants} 
              onChange={(e) => setMaxParticipants(parseInt(e.target.value || '2', 10))} 
            />
            <span className="text-xs text-gray-400 mt-1">Max participants (2-16)</span>
          </div>
          <button 
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700" 
            onClick={createTournament}
          >
            Create
          </button>
        </div>
        <textarea 
          className="px-3 py-2 text-black rounded w-full mb-4" 
          placeholder="Description (optional)" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
        />
      </div>

      <div className="w-full max-w-4xl bg-gray-800 p-6 rounded">
        <h3 className="text-xl font-semibold mb-4">Tournaments</h3>
        {loading ? (
          <div className="text-center py-8">Loading tournaments...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-4">{error}</div>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No tournaments found</div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map(t => (
              <div key={t.id} className="bg-gray-700 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-semibold">{t.name}</h4>
                    <p className="text-sm text-gray-300">{t.description || 'No description'}</p>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${getStatusColor(t.status)}`}>
                      {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Max {t.max_participants} participants
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t.status === 'registration' && 'Open for joining'}
                      {t.status === 'active' && 'In progress'}
                      {t.status === 'completed' && 'Finished'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700" 
                    onClick={() => joinTournament(t)}
                  >
                    Join
                  </button>
                  {t.status === 'registration' && (
                    <button 
                      className={`px-3 py-1 rounded ${
                        participants.length >= 2 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-gray-500 cursor-not-allowed'
                      }`}
                      onClick={() => participants.length >= 2 && startTournament(t)}
                      disabled={participants.length < 2}
                      title={participants.length < 2 ? 'Need at least 2 participants to start' : 'Start tournament'}
                    >
                      Start
                    </button>
                  )}
                  <button 
                    className="px-3 py-1 bg-gray-600 rounded hover:bg-gray-700" 
                    onClick={() => {
                      setSelectedTournament(t);
                      setView('detail');
                    }}
                  >
                    View Details
                  </button>
                  <button 
                    className="px-3 py-1 bg-indigo-600 rounded hover:bg-indigo-700" 
                    onClick={() => {
                      setSelectedTournament(t);
                      setView('brackets');
                    }}
                  >
                    View Brackets
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderTournamentDetail = () => {
    if (!selectedTournament) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{selectedTournament.name}</h2>
          <button 
            onClick={() => setView('list')} 
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Back to List
          </button>
        </div>

        {stats && (
          <div className="bg-gray-800 p-6 rounded">
            <h3 className="text-xl font-semibold mb-4">Tournament Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{stats.participantCount}</div>
                <div className="text-sm text-gray-400">Participants</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{stats.completedMatches}</div>
                <div className="text-sm text-gray-400">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{stats.pendingMatches}</div>
                <div className="text-sm text-gray-400">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{Math.round(stats.progress)}%</div>
                <div className="text-sm text-gray-400">Progress</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${stats.progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">Participants</h3>
          <div className="grid gap-2">
            {participants.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-gray-700 px-4 py-2 rounded">
                <span className="font-medium">{p.username || `User ${p.user_id}`}</span>
                <span className="text-sm text-gray-400">
                  {p.final_rank ? `Rank: ${p.final_rank}` : 'Active'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {currentMatch && (
          <div className="bg-gray-800 p-6 rounded">
            <h3 className="text-xl font-semibold mb-4">Current Match</h3>
            <div className="bg-gray-700 p-4 rounded">
              <div className="text-center mb-4">
                <div className="text-lg font-semibold">Round {currentMatch.round} - Match {currentMatch.match_number}</div>
                <div className={`text-sm ${getMatchStatusColor(currentMatch.status)}`}>
                  {currentMatch.status.charAt(0).toUpperCase() + currentMatch.status.slice(1)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-semibold">
                    {currentMatch.player1_username || `Player ${currentMatch.player1_id}`}
                  </div>
                  <div className="text-2xl font-bold text-blue-400">{currentMatch.player1_score}</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">VS</div>
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {currentMatch.player2_username || `Player ${currentMatch.player2_id}`}
                  </div>
                  <div className="text-2xl font-bold text-red-400">{currentMatch.player2_score}</div>
                </div>
              </div>
              {currentMatch.status === 'pending' && (
                <div className="text-center mt-4">
                  <button 
                    className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                    onClick={() => startMatch(currentMatch.id)}
                  >
                    Start Match
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">All Matches</h3>
          <div className="space-y-2">
            {matches.map(match => (
              <div key={match.id} className="bg-gray-700 p-4 rounded">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-400">
                    Round {match.round} - Match {match.match_number}
                  </div>
                  <div className={`text-sm font-semibold ${getMatchStatusColor(match.status)}`}>
                    {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-medium">
                      {match.player1_username || `Player ${match.player1_id}`}
                    </div>
                    <div className="text-lg font-bold">{match.player1_score}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold">VS</div>
                    {match.winner_username && (
                      <div className="text-sm text-green-400">
                        Winner: {match.winner_username}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium">
                      {match.player2_username || `Player ${match.player2_id}`}
                    </div>
                    <div className="text-lg font-bold">{match.player2_score}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTournamentBrackets = () => {
    if (!selectedTournament) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{selectedTournament.name} - Brackets</h2>
          <button 
            onClick={() => setView('list')} 
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Back to List
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded">
          <div className="space-y-8">
            {brackets.map(round => (
              <div key={round.round} className="border-b border-gray-700 pb-6 last:border-b-0">
                <h3 className="text-xl font-semibold mb-4 text-center">
                  {round.round === 1 ? 'First Round' : 
                   round.round === 2 ? 'Quarter Finals' :
                   round.round === 3 ? 'Semi Finals' :
                   round.round === 4 ? 'Finals' : `Round ${round.round}`}
                </h3>
                <div className="grid gap-4">
                  {round.matches.map(match => (
                    <div key={match.id} className="bg-gray-700 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-400">
                          Match {match.match_number}
                        </div>
                        <div className={`text-sm font-semibold ${getMatchStatusColor(match.status)}`}>
                          {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className={`p-2 rounded ${match.winner_id === match.player1_id ? 'bg-green-800' : 'bg-gray-600'}`}>
                          <div className="font-medium">
                            {match.player1_username || `Player ${match.player1_id}`}
                          </div>
                          <div className="text-lg font-bold">{match.player1_score}</div>
                        </div>
                        <div className="text-center flex items-center justify-center">
                          <div className="text-lg font-bold">VS</div>
                        </div>
                        <div className={`p-2 rounded ${match.winner_id === match.player2_id ? 'bg-green-800' : 'bg-gray-600'}`}>
                          <div className="font-medium">
                            {match.player2_username || `Player ${match.player2_id}`}
                          </div>
                          <div className="text-lg font-bold">{match.player2_score}</div>
                        </div>
                      </div>
                      {match.winner_username && (
                        <div className="text-center mt-2">
                          <div className="text-sm text-green-400">
                            Winner: {match.winner_username}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Tournament System</h1>
          <p className="text-gray-400">Manage and participate in Pong tournaments</p>
          <div className="mt-4 p-4 bg-blue-900 border border-blue-700 rounded-lg max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-200 mb-2">How Tournaments Work</h3>
            <ul className="text-sm text-blue-100 text-left space-y-1">
              <li>• Create a tournament with 2-16 participants</li>
              <li>• Join tournaments during registration phase</li>
              <li>• Start tournament when ready (minimum 2 players)</li>
              <li>• Single-elimination bracket system</li>
              <li>• Play matches and advance through rounds</li>
            </ul>
          </div>
        </div>

        {error && (
          <div className={`border px-4 py-3 rounded mb-6 ${
            error.includes('successfully') 
              ? 'bg-green-900 border-green-700 text-green-200' 
              : 'bg-red-900 border-red-700 text-red-200'
          }`}>
            {error}
            <button 
              onClick={() => setError(null)} 
              className={`float-right font-bold hover:opacity-80 ${
                error.includes('successfully') 
                  ? 'text-green-200 hover:text-green-100' 
                  : 'text-red-200 hover:text-red-100'
              }`}
            >
              ×
            </button>
          </div>
        )}

        {view === 'list' && renderTournamentList()}
        {view === 'detail' && renderTournamentDetail()}
        {view === 'brackets' && renderTournamentBrackets()}

        <div className="text-center mt-8">
          <button 
            onClick={onBack} 
            className="px-6 py-3 bg-gray-600 rounded hover:bg-gray-700 text-lg"
          >
            Back to Menu
          </button>
        </div>
      </div>
    </div>
  );
};


