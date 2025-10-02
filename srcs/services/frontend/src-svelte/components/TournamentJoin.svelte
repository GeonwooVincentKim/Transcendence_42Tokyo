<!--
  TournamentJoin.svelte - Tournament Join View
  Handles joining tournaments
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tournamentService, type Tournament } from '../shared/services/tournamentService';

  // Props
  export let tournament: Tournament;
  export let isAuthenticated: boolean;
  export let currentUser: any;

  const dispatch = createEventDispatcher();

  // State
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;

  async function handleJoin() {
    if (!isAuthenticated || !currentUser) {
      error = 'You must be logged in to join a tournament';
      return;
    }

    try {
      loading = true;
      error = null;
      success = null;

      await tournamentService.joinTournament(tournament.id);
      success = 'Successfully joined the tournament!';
      
      // Dispatch success event after a short delay
      setTimeout(() => {
        dispatch('joined');
      }, 1500);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to join tournament';
    } finally {
      loading = false;
    }
  }

  function handleBack() {
    dispatch('back');
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'registration': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'registration': return 'Registration Open';
      case 'active': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  }

  function canJoin() {
    return tournament.status === 'registration' && 
           isAuthenticated && 
           currentUser;
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Join Tournament</h2>
      <button 
        on:click={handleBack}
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Back
      </button>
    </div>

    <!-- Tournament Info -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 mb-2">{tournament.name}</h3>
      {#if tournament.description}
        <p class="text-gray-600 mb-3">{tournament.description}</p>
      {/if}
      
      <div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
        <div>
          <span class="font-medium">Type:</span> 
          {tournament.tournament_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </div>
        <div>
          <span class="font-medium">Max Participants:</span> 
          {tournament.max_participants}
        </div>
        <div>
          <span class="font-medium">Status:</span> 
          <span class="px-2 py-1 rounded text-xs font-medium {getStatusColor(tournament.status)}">
            {getStatusText(tournament.status)}
          </span>
        </div>
        <div>
          <span class="font-medium">Created:</span> 
          {formatDate(tournament.created_at)}
        </div>
      </div>
    </div>

    <!-- Error/Success Messages -->
    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    {/if}

    {#if success}
      <div class="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
        {success}
      </div>
    {/if}

    <!-- Join Form -->
    {#if !isAuthenticated}
      <div class="text-center py-8">
        <div class="text-gray-500 text-lg mb-4">You must be logged in to join a tournament</div>
        <p class="text-gray-400">Please log in to continue</p>
      </div>
    {:else if !canJoin()}
      <div class="text-center py-8">
        <div class="text-gray-500 text-lg mb-4">This tournament is not accepting new participants</div>
        <p class="text-gray-400">
          {#if tournament.status === 'active'}
            The tournament has already started
          {:else if tournament.status === 'completed'}
            The tournament has been completed
          {:else if tournament.status === 'cancelled'}
            The tournament has been cancelled
          {:else}
            Registration is not open
          {/if}
        </p>
      </div>
    {:else}
      <div class="text-center py-8">
        <div class="text-gray-700 text-lg mb-4">
          Ready to join <strong>{tournament.name}</strong>?
        </div>
        <p class="text-gray-500 mb-6">
          You will be added to the tournament and can start playing once it begins.
        </p>
        
        <button 
          on:click={handleJoin}
          class="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {#if loading}
            <span class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Joining...
            </span>
          {:else}
            Join Tournament
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>
