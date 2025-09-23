/**
 * Tournament Component
 * 
 * Comprehensive tournament management interface with support for both registered and guest users
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  tournamentService, 
  Tournament as TournamentData, 
  TournamentParticipant, 
  TournamentMatch, 
  BracketNode,
  TournamentStats,
  CreateTournamentInput,
  JoinTournamentInput
} from '../services/tournamentService';
import { AuthService } from '../services/authService';
import { TournamentBracket } from './TournamentBracket';

interface Props {
  onBack: () => void;
  onStartMatch?: (tournamentId: number, matchId: number, roomId: string) => void;
}

interface TournamentFormData {
  name: string;
  description: string;
  max_participants: number;
  tournament_type: 'single_elimination' | 'double_elimination' | 'round_robin';
}

interface JoinFormData {
  display_name: string;
  guest_alias: string;
  avatar_url: string;
}

type ViewMode = 'list' | 'create' | 'detail' | 'bracket' | 'join';

export const Tournament: React.FC<Props> = ({ onBack, onStartMatch }) => {
  // State management
  const [view, setView] = useState<ViewMode>('list');
  const [tournaments, setTournaments] = useState<TournamentData[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentData | null>(null);
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [bracket, setBracket] = useState<BracketNode[]>([]);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form data
  const [tournamentForm, setTournamentForm] = useState<TournamentFormData>({
    name: '',
    description: '',
    max_participants: 8,
    tournament_type: 'single_elimination'
  });

  const [joinForm, setJoinForm] = useState<JoinFormData>({
    display_name: '',
    guest_alias: '',
    avatar_url: ''
  });

  // Auth state
  const isAuthenticated = AuthService.isAuthenticated();
  const currentUser = AuthService.getUser();

  // Load initial data
  useEffect(() => {
      loadTournaments();
    loadStats();
  }, []);

  // Load tournaments
  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tournamentService.listTournaments();
      setTournaments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load tournament details
  const loadTournamentDetails = useCallback(async (tournamentId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const [tournament, participantsData, matchesData] = await Promise.all([
        tournamentService.getTournament(tournamentId),
        tournamentService.getTournamentParticipants(tournamentId),
        tournamentService.getTournamentMatches(tournamentId)
      ]);

      setSelectedTournament(tournament);
      setParticipants(participantsData);
      setMatches(matchesData);

      // Load bracket if tournament is active or completed
      if (tournament.status === 'active' || tournament.status === 'completed') {
        try {
          const bracketData = await tournamentService.getTournamentBracket(tournamentId);
          setBracket(bracketData);
        } catch (err) {
          console.warn('Failed to load bracket:', err);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tournament details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const data = await tournamentService.getTournamentStats();
      setStats(data);
    } catch (err) {
      console.warn('Failed to load tournament stats:', err);
    }
  }, []);

  // Create tournament
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const nameError = tournamentService.validateTournamentName(tournamentForm.name);
    const participantsError = tournamentService.validateMaxParticipants(tournamentForm.max_participants);
    
    if (nameError || participantsError) {
      setError(nameError || participantsError || 'Validation failed');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const input: CreateTournamentInput = {
        name: tournamentForm.name.trim(),
        description: tournamentForm.description.trim() || undefined,
        max_participants: tournamentForm.max_participants,
        tournament_type: tournamentForm.tournament_type,
        created_by: isAuthenticated ? (currentUser?.id ? parseInt(currentUser.id) : undefined) : undefined
      };

      const newTournament = await tournamentService.createTournament(input);
      setTournaments(prev => [newTournament, ...prev]);
      setSuccess('Tournament created successfully!');
      setTournamentForm({ name: '', description: '', max_participants: 8, tournament_type: 'single_elimination' });
      setView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tournament');
    } finally {
      setLoading(false);
    }
  };

  // Join tournament
  const handleJoinTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedTournament) return;

    // Validate form
    const displayNameError = tournamentService.validateDisplayName(joinForm.display_name);
    const guestAliasError = !isAuthenticated ? tournamentService.validateGuestAlias(joinForm.guest_alias) : null;
    
    if (displayNameError || guestAliasError) {
      setError(displayNameError || guestAliasError || 'Validation failed');
        return;
      }
      
    try {
      setLoading(true);
      setError(null);
      
      const input: JoinTournamentInput = {
        display_name: joinForm.display_name.trim(),
        user_id: isAuthenticated ? parseInt(currentUser?.id || '0') : undefined,
        guest_alias: !isAuthenticated ? joinForm.guest_alias.trim() : undefined,
        avatar_url: joinForm.avatar_url.trim() || undefined
      };

      await tournamentService.joinTournament(selectedTournament.id, input);
      setSuccess('Successfully joined tournament!');
      setJoinForm({ display_name: '', guest_alias: '', avatar_url: '' });
      await loadTournamentDetails(selectedTournament.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join tournament');
    } finally {
      setLoading(false);
    }
  };

  // Leave tournament
  const handleLeaveTournament = async () => {
    if (!selectedTournament) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await tournamentService.leaveTournament(
        selectedTournament.id,
        isAuthenticated ? (currentUser?.id ? parseInt(currentUser.id) : undefined) : undefined,
        !isAuthenticated ? joinForm.guest_alias : undefined
      );
      
      setSuccess('Successfully left tournament!');
      await loadTournamentDetails(selectedTournament.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave tournament');
    } finally {
      setLoading(false);
    }
  };

  // Start tournament
  const handleStartTournament = async () => {
    if (!selectedTournament) return;
    
    try {
      setLoading(true);
      setError(null);
      
      await tournamentService.startTournament(selectedTournament.id);
      setSuccess('Tournament started successfully!');
      await loadTournamentDetails(selectedTournament.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start tournament');
    } finally {
      setLoading(false);
    }
  };

  // View tournament details
  const handleViewTournament = (tournament: TournamentData) => {
    setSelectedTournament(tournament);
    setView('detail');
    loadTournamentDetails(tournament.id);
  };

  // Clear messages
  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  // Render tournament list
  const renderTournamentList = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Tournaments</h2>
        <div className="flex gap-2">
            <button 
            onClick={() => setView('create')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
            Create Tournament
            </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Game
          </button>
        </div>
                  </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.total_tournaments}</div>
            <div className="text-sm text-gray-600">Total Tournaments</div>
                    </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.active_tournaments}</div>
            <div className="text-sm text-gray-600">Active</div>
                      </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.completed_tournaments}</div>
            <div className="text-sm text-gray-600">Completed</div>
                    </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.total_participants}</div>
            <div className="text-sm text-gray-600">Participants</div>
                    </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.total_matches}</div>
            <div className="text-sm text-gray-600">Matches</div>
                  </div>
                </div>
      )}

      {/* Tournament list */}
      <div className="grid gap-4">
        {tournaments.map((tournament) => (
          <div key={tournament.id} className="p-6 bg-white rounded-lg shadow-md border">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{tournament.name}</h3>
                {tournament.description && (
                  <p className="text-gray-600 mt-1">{tournament.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span>{tournamentService.getTournamentTypeDisplayName(tournament.tournament_type)}</span>
                  <span>•</span>
                  <span>{tournament.max_participants} participants</span>
                  <span>•</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${tournamentService.getTournamentStatusColor(tournament.status)}`}>
                    {tournamentService.getTournamentStatusDisplayName(tournament.status)}
                  </span>
                </div>
              </div>
                    <button 
                onClick={() => handleViewTournament(tournament)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
      </div>

      {tournaments.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No tournaments found</p>
          <p className="text-gray-400 mt-2">Create the first tournament to get started!</p>
          </div>
        )}
      </div>
    );

  // Render create tournament form
  const renderCreateTournament = () => (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create Tournament</h2>
            <button 
              onClick={() => setView('list')} 
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back to List
            </button>
          </div>

      <form onSubmit={handleCreateTournament} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tournament Name *
          </label>
          <input
            type="text"
            value={tournamentForm.name}
            onChange={(e) => setTournamentForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter tournament name"
            maxLength={100}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={tournamentForm.description}
            onChange={(e) => setTournamentForm(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter tournament description (optional)"
            rows={3}
            maxLength={500}
          />
              </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Participants *
            </label>
            <input
              type="number"
              value={tournamentForm.max_participants}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, max_participants: parseInt(e.target.value) || 2 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="2"
              max="8"
              required
            />
              </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tournament Type *
            </label>
            <select
              value={tournamentForm.tournament_type}
              onChange={(e) => setTournamentForm(prev => ({ ...prev, tournament_type: e.target.value as 'single_elimination' | 'double_elimination' | 'round_robin' }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="single_elimination">Single Elimination</option>
              <option value="double_elimination">Double Elimination</option>
              <option value="round_robin">Round Robin</option>
            </select>
              </div>
            </div>
            
        <div className="flex gap-4">
                <button 
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Cancel
                </button>
              </div>
      </form>
          </div>
  );

  // Render tournament details
  const renderTournamentDetails = () => {
    if (!selectedTournament) return null;

    const canJoin = selectedTournament.status === 'registration' && participants.length < selectedTournament.max_participants;
    const canStart = selectedTournament.status === 'registration' && participants.length >= 2;
    const isParticipant = isAuthenticated 
      ? participants.some(p => p.user_id === currentUser?.id)
      : false;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-start">
                <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedTournament.name}</h2>
            {selectedTournament.description && (
              <p className="text-gray-600 mt-1">{selectedTournament.description}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{tournamentService.getTournamentTypeDisplayName(selectedTournament.tournament_type)}</span>
              <span>•</span>
              <span>{participants.length}/{selectedTournament.max_participants} participants</span>
              <span>•</span>
              <span className={`px-2 py-1 rounded-full text-xs ${tournamentService.getTournamentStatusColor(selectedTournament.status)}`}>
                {tournamentService.getTournamentStatusDisplayName(selectedTournament.status)}
              </span>
                </div>
                  </div>
          <div className="flex gap-2">
            {canJoin && !isParticipant && (
              <button
                onClick={() => setView('join')}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Join Tournament
              </button>
            )}
            {isParticipant && selectedTournament.status === 'registration' && (
                    <button 
                onClick={handleLeaveTournament}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                Leave Tournament
                    </button>
            )}
            {canStart && (
                    <button 
                onClick={handleStartTournament}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                Start Tournament
                    </button>
                )}
                    <button 
              onClick={() => setView('list')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
              Back to List
                    </button>
          </div>
        </div>

        {/* Participants */}
        <div className="bg-white rounded-lg shadow-md border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
          <div className="grid gap-2">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {participant.avatar_url ? (
                    <img src={participant.avatar_url} alt={participant.display_name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600">
                        {participant.display_name.charAt(0).toUpperCase()}
                      </span>
                  </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{participant.display_name}</div>
                    {participant.guest_alias && (
                      <div className="text-sm text-gray-500">Guest: {participant.guest_alias}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {participant.final_rank && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                      Rank #{participant.final_rank}
                    </span>
                  )}
                  {participant.is_ready && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Ready
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Matches */}
        {matches.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Matches</h3>
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-600">
                      Round {match.round} • Match {match.match_number}
                          </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${tournamentService.getMatchStatusColor(match.status)}`}>
                      {tournamentService.getMatchStatusDisplayName(match.status)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex justify-between">
                          <span className="font-medium">
                          {match.player1_id ? participants.find(p => p.id === match.player1_id)?.display_name || 'TBD' : 'Bye'}
                          </span>
                        <span className="font-bold text-lg">{match.player1_score}</span>
                        </div>
                      <div className="flex justify-between">
                        <span className="font-medium">
                          {match.player2_id ? participants.find(p => p.id === match.player2_id)?.display_name || 'TBD' : 'Bye'}
                          </span>
                        <span className="font-bold text-lg">{match.player2_score}</span>
                        </div>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bracket */}
        {bracket.length > 0 && (
          <div className="bg-white rounded-lg shadow-md border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Tournament Bracket</h3>
                <button 
                onClick={() => setView('bracket')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                View Full Bracket
                </button>
              </div>
            {/* Simplified bracket preview */}
            <div className="text-center text-gray-500">
              Bracket visualization available in full view
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render join tournament form
  const renderJoinTournament = () => {
    if (!selectedTournament) return null;

    return (
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Join Tournament</h2>
          <button 
            onClick={() => setView('detail')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md border p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900">{selectedTournament.name}</h3>
          <p className="text-gray-600 mt-1">{selectedTournament.description}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span>{tournamentService.getTournamentTypeDisplayName(selectedTournament.tournament_type)}</span>
            <span>•</span>
            <span>{participants.length}/{selectedTournament.max_participants} participants</span>
            </div>
          </div>
          
        <form onSubmit={handleJoinTournament} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={joinForm.display_name}
              onChange={(e) => setJoinForm(prev => ({ ...prev, display_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your display name"
              maxLength={50}
              required
            />
        </div>

          {!isAuthenticated && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Guest Alias *
              </label>
              <input
                type="text"
                value={joinForm.guest_alias}
                onChange={(e) => setJoinForm(prev => ({ ...prev, guest_alias: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter a unique alias"
                maxLength={50}
                pattern="[a-zA-Z0-9_-]+"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Only letters, numbers, underscores, and hyphens allowed
              </p>
                </div>
              )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Avatar URL
            </label>
            <input
              type="url"
              value={joinForm.avatar_url}
              onChange={(e) => setJoinForm(prev => ({ ...prev, avatar_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter avatar URL (optional)"
            />
          </div>
          
          <div className="flex gap-4">
                <button 
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Joining...' : 'Join Tournament'}
                </button>
                <button 
              type="button"
              onClick={() => setView('detail')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
                </button>
              </div>
        </form>
      </div>
    );
  };

  // Handle match click
  const handleMatchClick = (match: TournamentMatch) => {
    console.log('Match clicked:', match);
    
    if (!selectedTournament) {
      console.error('No tournament selected');
      return;
    }

    // Check if match is ready to start (has both players and is pending)
    if (match.status === 'pending' && match.player1_id && match.player2_id) {
      const roomId = `${selectedTournament.id}-${match.id}`;
      console.log('Starting match with roomId:', roomId);
      
      if (onStartMatch) {
        onStartMatch(selectedTournament.id, match.id, roomId);
      } else {
        // Fallback: show alert for now
        alert(`Match ${match.id} is ready to start! Room ID: ${roomId}`);
      }
    } else {
      console.log('Match not ready to start:', {
        status: match.status,
        player1_id: match.player1_id,
        player2_id: match.player2_id
      });
      alert('This match is not ready to start yet. Both players must be assigned and match must be pending.');
    }
  };

  // Render bracket view
  const renderBracket = () => {
    if (!selectedTournament) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">{selectedTournament.name} - Bracket</h2>
          <button 
            onClick={() => setView('detail')} 
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back to Details
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md border p-6">
          <TournamentBracket
            bracket={bracket}
            matches={matches}
            tournamentType={selectedTournament.tournament_type}
            onMatchClick={handleMatchClick}
          />
                        </div>
                        </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Messages */}
        {(error || success) && (
          <div className="mb-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex justify-between items-center">
                <span>{error}</span>
                <button onClick={clearMessages} className="text-red-700 hover:text-red-900">
                  ×
                          </button>
                        </div>
                      )}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg flex justify-between items-center">
                <span>{success}</span>
                <button onClick={clearMessages} className="text-green-700 hover:text-green-900">
                  ×
                          </button>
                        </div>
                      )}
              </div>
            )}

        {/* Loading overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Loading...</span>
            </div>
            </div>
          )}

        {/* Main content */}
        {view === 'list' && renderTournamentList()}
        {view === 'create' && renderCreateTournament()}
        {view === 'detail' && renderTournamentDetails()}
        {view === 'join' && renderJoinTournament()}
        {view === 'bracket' && renderBracket()}
      </div>
    </div>
  );
};
