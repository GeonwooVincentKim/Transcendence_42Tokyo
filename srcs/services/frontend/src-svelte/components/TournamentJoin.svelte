<!--
  TournamentJoin.svelte - Tournament Join View
  Handles joining tournaments
-->

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { tournamentService, type Tournament } from '../shared/services/tournamentService';

  // Props
  export let tournament: Tournament | null = null;
  export let isAuthenticated: boolean;
  export let currentUser: any;

  const dispatch = createEventDispatcher();

  // State
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;
  let displayName = '';
  let guestAlias = '';
  let avatarUrl = '';

  // Initialize display name for logged in users
  if (isAuthenticated && currentUser) {
    displayName = currentUser.username || '';
  }

  onMount(() => {
    console.log('TournamentJoin mounted with tournament:', tournament);
    if (!tournament) {
      console.error('No tournament provided to TournamentJoin component');
    }
  });

  async function handleJoin() {
    if (!tournament) {
      error = 'No tournament selected';
      return;
    }

    // Validate display name
    if (!displayName || displayName.trim().length === 0) {
      error = 'Display name is required';
      return;
    }

    // For guest users, validate guest alias
    if (!isAuthenticated && (!guestAlias || guestAlias.trim().length === 0)) {
      error = 'Guest alias is required for non-logged in users';
      return;
    }

    try {
      loading = true;
      error = null;
      success = null;

      const joinInput = {
        user_id: isAuthenticated ? currentUser?.id : undefined,
        guest_alias: !isAuthenticated ? guestAlias.trim() : undefined,
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim() || null
      };
      
      await tournamentService.joinTournament(tournament.id, joinInput);
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
    return tournament && 
           tournament.status === 'registration';
  }
</script>

{#if tournament}
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
          {tournament.tournament_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
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
    {#if !canJoin()}
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
      <div class="space-y-6">
        <div class="text-center">
          <div class="text-gray-700 text-lg mb-2">
            Join <strong>{tournament.name}</strong>
          </div>
          <p class="text-gray-500">
            Enter your game nickname to join this tournament.
          </p>
        </div>

        <form on:submit|preventDefault={handleJoin} class="space-y-4">
          <!-- Display Name -->
          <div>
            <label for="displayName" class="block text-sm font-medium text-gray-700 mb-2">
              Game Nickname *
            </label>
            <input
              id="displayName"
              type="text"
              bind:value={displayName}
              placeholder="Enter your game nickname"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              maxlength="50"
              required
            />
            <p class="text-xs text-gray-500 mt-1">
              This is the name that will be displayed in the tournament
            </p>
          </div>

          <!-- Guest Alias (for non-authenticated users) -->
          {#if !isAuthenticated}
            <div>
              <label for="guestAlias" class="block text-sm font-medium text-gray-700 mb-2">
                Guest ID *
              </label>
              <input
                id="guestAlias"
                type="text"
                bind:value={guestAlias}
                placeholder="Enter a unique guest ID"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                maxlength="50"
                pattern="[a-zA-Z0-9_-]+"
                required
              />
              <p class="text-xs text-gray-500 mt-1">
                Use letters, numbers, underscores, and hyphens only
              </p>
            </div>
          {/if}

          <!-- Avatar URL (optional) -->
          <div>
            <label for="avatarUrl" class="block text-sm font-medium text-gray-700 mb-2">
              Avatar URL (Optional)
            </label>
            <input
              id="avatarUrl"
              type="url"
              bind:value={avatarUrl}
              placeholder="https://example.com/avatar.jpg"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p class="text-xs text-gray-500 mt-1">
              Optional: URL to your avatar image
            </p>
          </div>

          <!-- Submit Button -->
          <div class="flex space-x-3">
            <button 
              type="submit"
              class="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {#if loading}
                <span class="flex items-center justify-center">
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
            
            <button 
              type="button"
              on:click={handleBack}
              class="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    {/if}
    </div>
  </div>
{:else}
  <div class="max-w-2xl mx-auto">
    <div class="bg-white rounded-lg shadow p-6">
      <div class="text-center">
        <p class="text-gray-600 mb-4">No tournament selected</p>
        <button 
          on:click={handleBack}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to Tournament List
        </button>
      </div>
    </div>
  </div>
{/if}
