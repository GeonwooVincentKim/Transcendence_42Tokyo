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
import { PongGame } from './PongGame';
import WebSocketService from '../services/websocketService';

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
  const [view, setView] = useState<'list' | 'detail' | 'brackets' | 'game'>('list');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameRoomState, setGameRoomState] = useState<any>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [gameSyncStatus, setGameSyncStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'waiting' | 'ready' | 'playing'>('disconnected');
  const [name, setName] = useState('New Tournament');
  const [maxParticipants, setMaxParticipants] = useState(2);
  const [description, setDescription] = useState('');
  const [tournamentParticipants, setTournamentParticipants] = useState<{[tournamentId: number]: TournamentParticipant[]}>({});
  const [currentGameMatch, setCurrentGameMatch] = useState<TournamentMatch | null>(null);

  const token = AuthService.getStoredAuthData()?.token || '';
  const isAuthenticated = AuthService.isAuthenticated();
  const currentUser = AuthService.getUser();

  useEffect(() => {
    if (isAuthenticated) {
      loadTournaments();
    } else {
      setError('Please login to access tournaments');
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedTournament) {
      loadTournamentDetails(selectedTournament.id);
    }
  }, [selectedTournament]);

  // WebSocket 이벤트 핸들러 설정
  useEffect(() => {
    const handlePlayerJoined = (data: any) => {
      console.log('Player joined:', data);
      setGameRoomState(data.roomState);
    };

    const handlePlayerLeft = (data: any) => {
      console.log('Player left:', data);
      setGameRoomState(data.roomState);
    };

    const handlePlayerReady = (data: any) => {
      console.log('Player ready:', data);
      setGameRoomState(data.roomState);
    };

    const handleGameStart = (data: any) => {
      console.log('Game starting:', data);
      setGameRoomState(data.roomState);
      setGameSyncStatus('ready');
      setError('Game starting in 2 seconds...');
    };

    const handleGamePlaying = (data: any) => {
      console.log('Game is playing:', data);
      setGameRoomState(data.roomState);
      setGameSyncStatus('playing');
      setError('Game is now playing!');
      
      // 양쪽 모두 게임 뷰로 자동 전환
      if (currentGameMatch) {
        setView('game');
      }
    };

    const handleGameStateUpdate = (data: any) => {
      console.log('Game state update:', data);
      // Handle real-time game state synchronization
    };

    const handleGameEnd = (data: any) => {
      console.log('Game ended:', data);
      setGameRoomState(data.roomState);
      setGameSyncStatus('disconnected');
    };

    // WebSocket 이벤트 리스너 등록
    WebSocketService.on('player_joined', handlePlayerJoined);
    WebSocketService.on('player_left', handlePlayerLeft);
    WebSocketService.on('player_ready', handlePlayerReady);
    WebSocketService.on('game_start', handleGameStart);
    WebSocketService.on('game_playing', handleGamePlaying);
    WebSocketService.on('game_state_update', handleGameStateUpdate);
    WebSocketService.on('game_end', handleGameEnd);

    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      WebSocketService.off('player_joined', handlePlayerJoined);
      WebSocketService.off('player_left', handlePlayerLeft);
      WebSocketService.off('player_ready', handlePlayerReady);
      WebSocketService.off('game_start', handleGameStart);
      WebSocketService.off('game_playing', handleGamePlaying);
      WebSocketService.off('game_state_update', handleGameStateUpdate);
      WebSocketService.off('game_end', handleGameEnd);
    };
  }, []);

  // 실시간 업데이트 완전 비활성화 (화면 깜빡임 방지)
  // useEffect(() => {
  //   if (isAuthenticated && tournaments.length > 0) {
  //     const interval = setInterval(() => {
  //       loadTournaments();
  //     }, 5000);
  //     return () => clearInterval(interval);
  //   }
  // }, [isAuthenticated, tournaments.length]);

  const loadTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TournamentService.list();
      setTournaments(data);
      
      // Load participants for each tournament
      const participantsMap: {[tournamentId: number]: TournamentParticipant[]} = {};
      for (const tournament of data) {
        try {
          const participantsData = await TournamentService.getParticipants(tournament.id);
          participantsMap[tournament.id] = participantsData;
        } catch (e) {
          console.warn(`Failed to load participants for tournament ${tournament.id}:`, e);
          participantsMap[tournament.id] = [];
        }
      }
      setTournamentParticipants(participantsMap);
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
      if (!isAuthenticated) {
        setError('Please login to create tournaments');
        return;
      }
      
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
      
      // Reload tournaments and participants
      await loadTournaments();
      
      setError('Tournament created successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  const joinTournament = async (tournament: TournamentType) => {
    try {
      if (!isAuthenticated) {
        setError('Please login to join tournaments');
        return;
      }
      
      await TournamentService.join(token, tournament.id);
      
      // Update participants for this tournament
      const participantsData = await TournamentService.getParticipants(tournament.id);
      setTournamentParticipants(prev => ({
        ...prev,
        [tournament.id]: participantsData
      }));
      
      // If viewing this tournament's details, update the detail view
      if (selectedTournament?.id === tournament.id) {
        await loadTournamentDetails(tournament.id);
      }
      
      setError('Joined tournament successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to join tournament');
    }
  };

  const leaveTournament = async (tournamentId: number) => {
    try {
      await TournamentService.leave(token, tournamentId);
      
      // Update participants for this tournament
      const participantsData = await TournamentService.getParticipants(tournamentId);
      setTournamentParticipants(prev => ({
        ...prev,
        [tournamentId]: participantsData
      }));
      
      if (selectedTournament?.id === tournamentId) {
        await loadTournamentDetails(tournamentId);
      }
      setError('Left tournament successfully!');
    } catch (e: any) {
      setError(e.message || 'Failed to leave tournament');
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
        // 브래킷 뷰로 자동 이동
        setView('brackets');
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

  const playGame = async (match: TournamentMatch) => {
    if (!selectedTournament) return;
    
    try {
      console.log('playGame called with match:', match);
      console.log('selectedTournament.id:', selectedTournament.id);
      console.log('match.id:', match.id);
      console.log('match.id type:', typeof match.id);
      
      // 매치를 활성 상태로 변경
      await TournamentService.startMatch(token, selectedTournament.id, match.id);
      
      // WebSocket 연결 및 게임 룸 참가
      setGameSyncStatus('connecting');
      setError('Connecting to game room...');
      
      const currentUser = AuthService.getUser();
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      await WebSocketService.connect(selectedTournament.id, match.id, currentUser.id);
      
      // 게임 매치 설정하고 게임 뷰로 전환
      setCurrentGameMatch(match);
      setView('game');
      setGameSyncStatus('connected');
      setError('Connected to game room! Waiting for opponent...');
      
    } catch (error: any) {
      setError(error.message || 'Failed to start game');
      setGameSyncStatus('disconnected');
    }
  };

  const handleGameComplete = async (winnerId: number, _loserId: number, player1Score: number, player2Score: number) => {
    if (!selectedTournament || !currentGameMatch) return;
    
    try {
      // 게임 결과를 토너먼트에 보고
      await TournamentService.reportMatchResult(token, selectedTournament.id, currentGameMatch.id, winnerId, player1Score, player2Score);
      
      // WebSocket으로 게임 종료 알림
      WebSocketService.endGame({
        winnerId,
        player1Score,
        player2Score,
        matchId: currentGameMatch.id
      });
      
      // 토너먼트 상세 정보 새로고침
      await loadTournamentDetails(selectedTournament.id);
      
      // 게임 뷰에서 브래킷 뷰로 돌아가기
      setCurrentGameMatch(null);
      setView('brackets');
      setGameSyncStatus('disconnected');
      
      // WebSocket 연결 종료
      WebSocketService.disconnect();
      
      setError('Game completed! Tournament updated.');
    } catch (error: any) {
      setError(error.message || 'Failed to report game result');
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

  const renderTournamentList = () => {
    // 현재 사용자가 참가한 토너먼트가 있는지 확인
    const hasJoinedTournament = tournaments.some(t => {
      const participants = tournamentParticipants[t.id] || [];
      return currentUser && participants.some(p => p.user_id === parseInt(currentUser.id));
    });

    // 현재 사용자가 생성한 토너먼트가 있는지 확인
    const hasCreatedTournament = tournaments.some(t => {
      return currentUser && (t.created_by === parseInt(currentUser.id) || t.created_by?.toString() === currentUser.id);
    });

    // 디버깅을 위한 콘솔 로그
    // Debug logging removed to reduce console noise

    return (
      <div className="space-y-4">
        {isAuthenticated && !hasJoinedTournament && !hasCreatedTournament && (
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
        )}

        <div className="w-full max-w-4xl bg-gray-800 p-6 rounded">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">Tournaments</h3>
          <button
            onClick={loadTournaments}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
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
                      {(() => {
                        const currentTournamentParticipants = tournamentParticipants[t.id] || [];
                        return `${currentTournamentParticipants.length}/${t.max_participants} participants`;
                      })()}
                      {/* 디버깅 정보 */}
                      <div className="text-xs text-gray-500 mt-1">
                        Debug: Tournament {t.id} has {tournamentParticipants[t.id]?.length || 0} participants
                        {tournamentParticipants[t.id] && tournamentParticipants[t.id].length > 0 && (
                          <div>Participants: {tournamentParticipants[t.id].map(p => `User ${p.user_id}`).join(', ')}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {t.status === 'registration' && 'Open for joining'}
                      {t.status === 'active' && 'In progress'}
                      {t.status === 'completed' && 'Finished'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(() => {
                    const currentTournamentParticipants = tournamentParticipants[t.id] || [];
                    const isCurrentUserParticipant = currentUser && currentTournamentParticipants.some(p => p.user_id === parseInt(currentUser.id));
                    const participantCount = currentTournamentParticipants.length;
                    
                    return (
                      <>
                        {isCurrentUserParticipant ? (
                          <button 
                            className="px-3 py-1 bg-red-600 rounded hover:bg-red-700" 
                            onClick={() => leaveTournament(t.id)}
                          >
                            Leave
                          </button>
                        ) : (
                          <button 
                            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700" 
                            onClick={() => joinTournament(t)}
                          >
                            Join
                          </button>
                        )}
                  {t.status === 'registration' && (
                    <button 
                      className={`px-3 py-1 rounded ${
                        participantCount >= 2 
                          ? 'bg-purple-600 hover:bg-purple-700' 
                          : 'bg-gray-500 cursor-not-allowed'
                      }`}
                      onClick={() => participantCount >= 2 && startTournament(t)}
                      disabled={participantCount < 2}
                      title={participantCount < 2 ? `Need at least 2 participants to start. Current: ${participantCount}` : 'Start tournament'}
                    >
                      Start
                    </button>
                  )}
                      </>
                    );
                  })()}
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
  };

  const renderTournamentDetail = () => {
    if (!selectedTournament) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{selectedTournament.name}</h2>
          <div className="flex gap-2">
            <button 
              onClick={() => setView('brackets')} 
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              View Brackets
            </button>
            <button 
              onClick={() => setView('list')} 
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Back to List
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tournament Info */}
          <div className="bg-gray-800 p-6 rounded">
            <h3 className="text-xl font-semibold mb-4">Tournament Information</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`font-semibold ${getStatusColor(selectedTournament.status)}`}>
                  {selectedTournament.status.charAt(0).toUpperCase() + selectedTournament.status.slice(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Max Participants:</span>
                <span>{selectedTournament.max_participants}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Current Participants:</span>
                <span>{participants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Created:</span>
                <span>{new Date(selectedTournament.created_at).toLocaleDateString()}</span>
              </div>
              {selectedTournament.started_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Started:</span>
                  <span>{new Date(selectedTournament.started_at).toLocaleDateString()}</span>
                </div>
              )}
              {selectedTournament.finished_at && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Finished:</span>
                  <span>{new Date(selectedTournament.finished_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
            
            {selectedTournament.status === 'registration' && (
              <div className="mt-4">
                <button 
                  onClick={() => startTournament(selectedTournament)}
                  disabled={loading || participants.length < 2}
                  className="w-full px-4 py-2 bg-green-600 rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {loading ? 'Starting...' : 'Start Tournament'}
                </button>
              </div>
            )}
          </div>

          {/* Statistics */}
          {stats && (
            <div className="bg-gray-800 p-6 rounded">
              <h3 className="text-xl font-semibold mb-4">Tournament Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Matches:</span>
                  <span>{stats.totalMatches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Completed:</span>
                  <span className="text-green-400">{stats.completedMatches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active:</span>
                  <span className="text-blue-400">{stats.activeMatches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Pending:</span>
                  <span className="text-yellow-400">{stats.pendingMatches}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Progress:</span>
                  <span>{Math.round(stats.progress * 100)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Participants */}
        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">Participants ({participants.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map(participant => (
              <div key={participant.id} className="bg-gray-700 p-4 rounded">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{participant.username || `User ${participant.user_id}`}</div>
                    <div className="text-sm text-gray-400">
                      Joined: {new Date(participant.joined_at).toLocaleDateString()}
                    </div>
                  </div>
                  {participant.final_rank && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-400">#{participant.final_rank}</div>
                      <div className="text-xs text-gray-400">Final Rank</div>
                    </div>
                  )}
                  {participant.eliminated_at && (
                    <div className="text-right">
                      <div className="text-sm text-red-400">Eliminated</div>
                      <div className="text-xs text-gray-400">
                        {new Date(participant.eliminated_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current Match */}
        {currentMatch && (
          <div className="bg-gray-800 p-6 rounded">
            <h3 className="text-xl font-semibold mb-4">Current Match</h3>
            <div className="bg-gray-700 p-4 rounded">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm text-gray-400">
                  Round {currentMatch.round} - Match {currentMatch.match_number}
                </div>
                <div className={`text-sm font-semibold ${getMatchStatusColor(currentMatch.status)}`}>
                  {currentMatch.status.charAt(0).toUpperCase() + currentMatch.status.slice(1)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="font-medium">
                    {currentMatch.player1_username || `Player ${currentMatch.player1_id}`}
                  </div>
                  <div className="text-lg font-bold">{currentMatch.player1_score}</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">VS</div>
                  {currentMatch.winner_username && (
                    <div className="text-sm text-green-400">
                      Winner: {currentMatch.winner_username}
                    </div>
                  )}
                </div>
                <div>
                  <div className="font-medium">
                    {currentMatch.player2_username || `Player ${currentMatch.player2_id}`}
                  </div>
                  <div className="text-lg font-bold">{currentMatch.player2_score}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Matches */}
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
                {match.status === 'pending' && (
                  <div className="text-center mt-4 space-x-2">
                    <button 
                      onClick={() => startMatch(match.id)}
                      className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                    >
                      Start Match
                    </button>
                    <button 
                      onClick={() => playGame(match)}
                      className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                    >
                      🎮 Play Game
                    </button>
                  </div>
                )}
                {match.status === 'active' && (
                  <div className="text-center mt-4">
                    <button 
                      onClick={() => playGame(match)}
                      className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
                    >
                      🎮 Play Game
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Tournament Brackets Preview */}
        {selectedTournament.status !== 'registration' && brackets.length > 0 && (
          <div className="bg-gray-800 p-6 rounded">
            <h3 className="text-xl font-semibold mb-4">Tournament Brackets Preview</h3>
            <div className="space-y-6">
              {brackets.slice(0, 2).map(round => (
                <div key={round.round} className="border-b border-gray-700 pb-4 last:border-b-0">
                  <h4 className="text-lg font-semibold mb-3 text-center text-blue-400">
                    {round.round === 1 ? 'First Round' : 
                     round.round === 2 ? 'Quarter Finals' :
                     round.round === 3 ? 'Semi Finals' :
                     round.round === 4 ? 'Finals' : `Round ${round.round}`}
                  </h4>
                  <div className="grid gap-3">
                    {round.matches.slice(0, 4).map(match => (
                      <div key={match.id} className="bg-gray-700 p-3 rounded text-sm">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {match.player1_username || `Player ${match.player1_id}`}
                          </span>
                          <span className="text-gray-400">VS</span>
                          <span className="font-medium">
                            {match.player2_username || `Player ${match.player2_id}`}
                          </span>
                        </div>
                        <div className="text-center mt-1">
                          <span className={`text-xs px-2 py-1 rounded ${
                            match.status === 'completed' ? 'bg-green-600' :
                            match.status === 'active' ? 'bg-blue-600' :
                            'bg-gray-600'
                          }`}>
                            {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="text-center">
                <button 
                  onClick={() => setView('brackets')} 
                  className="px-4 py-2 bg-indigo-600 rounded hover:bg-indigo-700"
                >
                  View Full Brackets
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderGameView = () => {
    if (!selectedTournament || !currentGameMatch) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">
            {selectedTournament.name} - Match {currentGameMatch.match_number}
          </h2>
          <button 
            onClick={() => {
              setCurrentGameMatch(null);
              setView('brackets');
            }} 
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Back to Brackets
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">Match Information</h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {currentGameMatch.player1_username || `Player ${currentGameMatch.player1_id}`}
              </div>
              <div className="text-sm text-gray-400">Player 1</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {currentGameMatch.player2_username || `Player ${currentGameMatch.player2_id}`}
              </div>
              <div className="text-sm text-gray-400">Player 2</div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold mb-4">VS</div>
            <div className="text-sm text-gray-400 mb-4">
              Round {currentGameMatch.round} - Match {currentGameMatch.match_number}
            </div>
          </div>
        </div>

        {/* 실제 PongGame 컴포넌트 */}
        <div className="bg-gray-800 p-6 rounded">
          <h3 className="text-xl font-semibold mb-4">Tournament Match</h3>
          <div className="text-center mb-4">
            <p className="text-gray-400">
              {currentGameMatch.player1_username || `Player ${currentGameMatch.player1_id}`} vs {currentGameMatch.player2_username || `Player ${currentGameMatch.player2_id}`}
            </p>
            <div className="mt-2 p-2 bg-blue-900 rounded">
              <p className="text-blue-300 text-sm">
                🔗 WebSocket Status: {gameSyncStatus.toUpperCase()}
              </p>
              {gameRoomState && (
                <div className="mt-2 text-xs text-gray-400">
                  <p>Players: {gameRoomState.player1Id ? 'Player 1' : 'None'} vs {gameRoomState.player2Id ? 'Player 2' : 'None'}</p>
                  <p>Ready Status: P1: {gameRoomState.player1Ready ? '✅' : '❌'} | P2: {gameRoomState.player2Ready ? '✅' : '❌'}</p>
                  <p>Game Status: {gameRoomState.status}</p>
                </div>
              )}
              {gameSyncStatus === 'connected' && !isPlayerReady && (
                <button 
                  onClick={() => {
                    WebSocketService.setPlayerReady(true);
                    setIsPlayerReady(true);
                  }}
                  className="mt-2 px-4 py-2 bg-green-600 rounded hover:bg-green-700 text-sm"
                >
                  ✅ I'm Ready!
                </button>
              )}
            </div>
          </div>
          
          {/* 실제 PongGame 컴포넌트 */}
          <div className="flex justify-center">
            {gameSyncStatus === 'playing' ? (
              <PongGame 
                width={800} 
                height={400}
                onGameEnd={(winner, leftScore, rightScore) => {
                  // 게임 종료 시 토너먼트 결과 처리
                  const winnerId = winner === 'left' ? currentGameMatch.player1_id : currentGameMatch.player2_id;
                  const loserId = winner === 'left' ? currentGameMatch.player2_id : currentGameMatch.player1_id;
                  handleGameComplete(winnerId || 0, loserId || 0, leftScore, rightScore);
                }}
              />
            ) : (
              <div className="w-[800px] h-[400px] bg-gray-900 border border-gray-600 rounded flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl mb-4">
                    {gameSyncStatus === 'connecting' && '🔗 Connecting...'}
                    {gameSyncStatus === 'connected' && '⏳ Waiting for opponent...'}
                    {gameSyncStatus === 'ready' && '🚀 Game starting...'}
                    {gameSyncStatus === 'waiting' && '⏳ Waiting for both players to be ready...'}
                  </div>
                  <div className="text-gray-400">
                    {gameSyncStatus === 'connected' && 'Make sure both players click "I\'m Ready!"'}
                    {gameSyncStatus === 'ready' && 'Game will start automatically in 2 seconds...'}
                    {gameSyncStatus === 'waiting' && 'Both players need to join and be ready'}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 게임 컨트롤 */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-400 mb-2">
              Use W/S keys for left player, Arrow Up/Down for right player
            </p>
            <button 
              onClick={() => {
                setCurrentGameMatch(null);
                setView('brackets');
              }}
              className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Cancel Game
            </button>
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
            onClick={() => setView('detail')} 
            className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Back to Detail
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
                      
                      {/* Match Action Buttons */}
                      {match.status === 'pending' && (
                        <div className="text-center mt-3 space-x-2">
                          <button 
                            onClick={() => startMatch(match.id)}
                            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                          >
                            🚀 Start Match
                          </button>
                          <button 
                            onClick={() => playGame(match)}
                            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors"
                          >
                            🎮 Play Game
                          </button>
                        </div>
                      )}
                      
                      {match.status === 'active' && (
                        <div className="text-center mt-3">
                          <button 
                            onClick={() => playGame(match)}
                            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition-colors"
                          >
                            🎮 Play Game
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Tournament Control Buttons */}
            {selectedTournament.status === 'registration' && participants.length >= 2 && (
              <div className="text-center pt-6 border-t border-gray-700">
                <button 
                  onClick={() => startTournament(selectedTournament)}
                  disabled={loading}
                  className="px-8 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold text-lg transition-colors"
                >
                  {loading ? '🚀 Starting Tournament...' : '🚀 Start Tournament'}
                </button>
                <p className="text-sm text-gray-400 mt-2">
                  Ready to begin with {participants.length} participants
                </p>
              </div>
            )}
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
          
          {!isAuthenticated && (
            <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-red-200 mb-2">⚠️ Authentication Required</h3>
              <p className="text-sm text-red-100">Please login to create and join tournaments</p>
            </div>
          )}
          
          {isAuthenticated && (
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
          )}
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
        {view === 'game' && renderGameView()}

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


