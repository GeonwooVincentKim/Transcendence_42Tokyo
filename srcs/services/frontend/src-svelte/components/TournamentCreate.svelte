<!--
  TournamentCreate.svelte - Tournament Creation Form
  Handles creating new tournaments
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tournamentService, type Tournament } from '../shared/services/tournamentService';

  // Props
  export let isAuthenticated: boolean;
  export let currentUser: any;

  const dispatch = createEventDispatcher();

  // Form state
  let name = '';
  let description = '';
  let tournamentType = 'single_elimination';
  let maxParticipants = 8;
  let loading = false;
  let error: string | null = null;

  // Validation
  let nameError = '';
  let descriptionError = '';
  let maxParticipantsError = '';

  function validateForm() {
    let isValid = true;
    
    // Clear previous errors
    nameError = '';
    descriptionError = '';
    maxParticipantsError = '';

    // Validate name
    if (!name.trim()) {
      nameError = 'Tournament name is required';
      isValid = false;
    } else if (name.length < 3) {
      nameError = 'Tournament name must be at least 3 characters';
      isValid = false;
    } else if (name.length > 50) {
      nameError = 'Tournament name must be less than 50 characters';
      isValid = false;
    }

    // Validate description
    if (description && description.length > 200) {
      descriptionError = 'Description must be less than 200 characters';
      isValid = false;
    }

    // Validate max participants
    if (maxParticipants < 2) {
      maxParticipantsError = 'Must have at least 2 participants';
      isValid = false;
    } else if (maxParticipants > 32) {
      maxParticipantsError = 'Maximum 32 participants allowed';
      isValid = false;
    }

    return isValid;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      loading = true;
      error = null;

      const tournamentData = {
        name: name.trim(),
        description: description.trim() || null,
        tournament_type: tournamentType,
        max_participants: maxParticipants
      };

      const newTournament = await tournamentService.createTournament(tournamentData);
      dispatch('created', newTournament);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create tournament';
    } finally {
      loading = false;
    }
  }

  function handleBack() {
    dispatch('back');
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="bg-white rounded-lg shadow p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-900">Create Tournament</h2>
      <button 
        on:click={handleBack}
        class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
      >
        Back
      </button>
    </div>

    {#if error}
      <div class="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <!-- Tournament Name -->
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-2">
          Tournament Name *
        </label>
        <input
          id="name"
          type="text"
          bind:value={name}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter tournament name"
          disabled={loading}
        />
        {#if nameError}
          <p class="mt-1 text-sm text-red-600">{nameError}</p>
        {/if}
      </div>

      <!-- Description -->
      <div>
        <label for="description" class="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          bind:value={description}
          rows="3"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Enter tournament description (optional)"
          disabled={loading}
        ></textarea>
        {#if descriptionError}
          <p class="mt-1 text-sm text-red-600">{descriptionError}</p>
        {/if}
      </div>

      <!-- Tournament Type -->
      <div>
        <label for="tournamentType" class="block text-sm font-medium text-gray-700 mb-2">
          Tournament Type *
        </label>
        <select
          id="tournamentType"
          bind:value={tournamentType}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="single_elimination">Single Elimination</option>
          <option value="double_elimination">Double Elimination</option>
          <option value="round_robin">Round Robin</option>
        </select>
      </div>

      <!-- Max Participants -->
      <div>
        <label for="maxParticipants" class="block text-sm font-medium text-gray-700 mb-2">
          Maximum Participants *
        </label>
        <input
          id="maxParticipants"
          type="number"
          bind:value={maxParticipants}
          min="2"
          max="32"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        />
        {#if maxParticipantsError}
          <p class="mt-1 text-sm text-red-600">{maxParticipantsError}</p>
        {/if}
        <p class="mt-1 text-sm text-gray-500">Minimum 2, Maximum 32 participants</p>
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end space-x-3">
        <button
          type="button"
          on:click={handleBack}
          class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          disabled={loading}
        >
          {#if loading}
            <span class="flex items-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </span>
          {:else}
            Create Tournament
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
