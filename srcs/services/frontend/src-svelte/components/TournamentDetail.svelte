<!--
  TournamentDetail.svelte - Tournament Detail View
  Shows tournament details, participants, and matches
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { tournamentService, type Tournament, type TournamentParticipant, type TournamentMatch, type BracketNode } from '../shared/services/tournamentService';
  import TournamentBracket from './TournamentBracket.svelte';

  // Props
  export let tournament: Tournament;
  export let isAuthenticated: boolean;
  export let currentUser: any;
  export let onStartMatch: ((tournamentId: number, matchId: number, roomId: string) => void) | undefined = undefined;

  const dispatch = createEventDispatcher();

  // State
  let participants: TournamentParticipant[] = [];
  let matches: TournamentMatch[] = [];
  let bracket: BracketNode[] = [];
  let loading = false;
  let error: string | null = null;

  onMount(() => {
    loadTournamentData();
  });

  async function loadTournamentData() {
    try {
      loading = true;
      error = null;
      
      const [participantsData, matchesData, bracketData] = await Promise.all([
        tournamentService.getTournamentParticipants(tournament.id),
        tournamentService.getTournamentMatches(tournament.id),
        tournamentService.getTournamentBracket(tournament.id)
      ]);
      
      participants = participantsData;
      matches = matchesData;
      bracket = bracketData;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load tournament data';
    } finally {
      loading = false;
    }
  }

  function handleBack() {
    dispatch('back');
  }

  function handleStart() {
    dispatch('start');
  }

  function handleStartMatch(match: TournamentMatch) {
    if (onStartMatch) {
      const roomId = `tournament-${tournament.id}-match-${match.id}`;
      onStartMatch(tournament.id, match.id, roomId);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  function canStartTournament() {
    return tournament.status === 'registration' && 
           participants.length >= 2 && 
           isAuthenticated && 
           currentUser?.id === tournament.creator_id;
  }

  function canStartMatch(match: TournamentMatch) {
    return match.status === 'pending' && 
           match.player1_id && 
           match.player2_id && 
           isAuthenticated;
  }
</script>

<div class="max-w-6xl mx-auto">
  <div class="space-y-6">
    <!-- Header -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-start mb-4">
        <div>
          <h2 class="text-2xl font-bold text-gray-900">{tournament.name}</h2>
          {#if tournament.description}
            <p class="text-gray-600 mt-1">{tournament.description}</p>
          {/if}
        </div>
        <div class="flex space-x-3">
          <span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(tournament.status)}">
            {getStatusText(tournament.status)}
          </span>
          <button 
            on:click={handleBack}
            class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Back
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
        <div>
          <span class="font-medium">Type:</span> 
          {tournament.tournament_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
        </div>
        <div>
          <span class="font-medium">Max Participants:</span> 
          {tournament.max_participants}
        </div>
        <div>
          <span class="font-medium">Current Participants:</span> 
          {participants.length}
        </div>
        <div>
          <span class="font-medium">Created:</span> 
          {formatDate(tournament.created_at)}
        </div>
      </div>

      {#if canStartTournament()}
        <div class="mt-4">
          <button 
            on:click={handleStart}
            class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Start Tournament
          </button>
        </div>
      {/if}
    </div>

    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    {/if}

    {#if loading}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <!-- Participants -->
      <div class="bg-white rounded-lg shadow p-6">
        <h3 class="text-xl font-semibold text-gray-900 mb-4">Participants ({participants.length})</h3>
        {#if participants.length === 0}
          <p class="text-gray-500">No participants yet</p>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {#each participants as participant (participant.id)}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span class="text-blue-600 font-medium">
                      {participant.user?.username?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <div class="font-medium text-gray-900">
                      {participant.user?.username || 'Unknown User'}
                    </div>
                    <div class="text-sm text-gray-500">
                      Joined: {formatDate(participant.joined_at)}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Tournament Bracket -->
      {#if bracket.length > 0}
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-4">Tournament Bracket</h3>
          <TournamentBracket 
            {bracket}
            {matches}
            tournamentType={tournament.tournament_type}
            tournamentId={tournament.id}
            onMatchClick={handleStartMatch}
          />
        </div>
      {/if}

      <!-- Matches List (for reference) -->
      {#if matches.length > 0}
        <div class="bg-white rounded-lg shadow p-6">
          <h3 class="text-xl font-semibold text-gray-900 mb-4">All Matches ({matches.length})</h3>
          <div class="space-y-4">
            {#each matches as match (match.id)}
              <div class="border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-center">
                  <div class="flex-1">
                    <div class="flex items-center space-x-4">
                      <div class="text-sm">
                        <span class="font-medium">
                          {match.player1?.username || 'TBD'}
                        </span>
                        <span class="text-gray-500 mx-2">vs</span>
                        <span class="font-medium">
                          {match.player2?.username || 'TBD'}
                        </span>
                      </div>
                      <span class="px-2 py-1 rounded text-xs font-medium {getStatusColor(match.status)}">
                        {getStatusText(match.status)}
                      </span>
                    </div>
                    {#if match.winner_id}
                      <div class="text-sm text-green-600 mt-1">
                        Winner: {match.winner?.username}
                      </div>
                    {/if}
                  </div>
                  
                  {#if canStartMatch(match)}
                    <button 
                      on:click={() => handleStartMatch(match)}
                      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Match
                    </button>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
