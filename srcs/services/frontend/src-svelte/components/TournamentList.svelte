<!--
  TournamentList.svelte - Tournament List View
  Displays list of tournaments with stats and actions
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Tournament, TournamentStats } from '../shared/services/tournamentService';
  import { _ } from 'svelte-i18n';

  // Props
  export let tournaments: Tournament[];
  export let stats: TournamentStats | null;
  export let isAuthenticated: boolean;
  export let currentUser: any;

  const dispatch = createEventDispatcher();

  function handleCreate() {
    dispatch('create');
  }

  function handleDetail(tournament: Tournament) {
    dispatch('detail', tournament);
  }

  function handleJoin(tournament: Tournament) {
    dispatch('join', tournament);
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
</script>

<div class="space-y-6">
  <!-- Stats Overview -->
  {#if stats}
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">Tournament Statistics</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{stats.total_tournaments}</div>
          <div class="text-sm text-gray-600">Total Tournaments</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{stats.active_tournaments}</div>
          <div class="text-sm text-gray-600">Active</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-gray-600">{stats.completed_tournaments}</div>
          <div class="text-sm text-gray-600">Completed</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{stats.total_participants}</div>
          <div class="text-sm text-gray-600">Participants</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Create Tournament Button -->
  <div class="flex justify-between items-center">
    <h2 class="text-2xl font-bold text-gray-900">Tournaments</h2>
    <button 
      on:click={handleCreate}
      class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
    >
      Create Tournament
    </button>
  </div>

  <!-- Tournaments List -->
  {#if tournaments.length === 0}
    <div class="bg-white rounded-lg shadow p-8 text-center">
      <div class="text-gray-500 text-lg mb-4">No tournaments found</div>
      <p class="text-gray-400">Be the first to create a tournament!</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each tournaments as tournament (tournament.id)}
        <div class="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <div>
                <h3 class="text-xl font-semibold text-gray-900">{tournament.name}</h3>
                {#if tournament.description}
                  <p class="text-gray-600 mt-1">{tournament.description}</p>
                {/if}
              </div>
              <span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(tournament.status)}">
                {getStatusText(tournament.status)}
              </span>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm text-gray-600">
              <div>
                <span class="font-medium">Type:</span> 
                {tournament.tournament_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
              </div>
              <div>
                <span class="font-medium">Max Participants:</span> 
                {tournament.max_participants}
              </div>
              <div>
                <span class="font-medium">Created:</span> 
                {formatDate(tournament.created_at)}
              </div>
              {#if tournament.started_at}
                <div>
                  <span class="font-medium">Started:</span> 
                  {formatDate(tournament.started_at)}
                </div>
              {/if}
            </div>

            <div class="flex justify-between items-center">
              <div class="flex space-x-3">
                <button 
                  on:click={() => handleDetail(tournament)}
                  class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  View Details
                </button>
                
                {#if tournament.status === 'registration'}
                  <button 
                    on:click={() => handleJoin(tournament)}
                    class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Join Tournament
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
