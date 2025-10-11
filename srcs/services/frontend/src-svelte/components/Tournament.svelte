<!--
  Tournament.svelte - Main Tournament Container
  Handles routing between different tournament views
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { tournamentService, type Tournament as TournamentData, type TournamentStats } from '../shared/services/tournamentService';
  import { AuthService } from '../shared/services/authService';
  import { _ } from 'svelte-i18n';
  import TournamentList from './TournamentList.svelte';
  import TournamentCreate from './TournamentCreate.svelte';
  import TournamentDetail from './TournamentDetail.svelte';
  import TournamentJoin from './TournamentJoin.svelte';

  // Props
  export let onBack: () => void;
  export let onStartMatch: ((tournamentId: number, matchId: number, roomId: string) => void) | undefined = undefined;

  // State
  let view: 'list' | 'create' | 'detail' | 'join' = 'list';
  let tournaments: TournamentData[] = [];
  let selectedTournament: TournamentData | null = null;
  let stats: TournamentStats | null = null;
  let loading = false;
  let error: string | null = null;
  let success: string | null = null;

  // Auth state
  const isAuthenticated = AuthService.isAuthenticated();
  const currentUser = AuthService.getUser();

  // Load initial data
  onMount(() => {
    loadTournaments();
    loadStats();
  });

  // Load tournaments
  async function loadTournaments() {
    try {
      loading = true;
      error = null;
      console.log('Loading tournaments...');
      const data = await tournamentService.listTournaments();
      console.log('Tournaments loaded:', data);
      console.log('Tournaments array before assignment:', tournaments);
      tournaments = data;
      console.log('Tournaments array after assignment:', tournaments);
    } catch (err) {
      console.error('Failed to load tournaments:', err);
      error = err instanceof Error ? err.message : 'Failed to load tournaments';
    } finally {
      loading = false;
    }
  }

  // Load stats
  async function loadStats() {
    try {
      const data = await tournamentService.getTournamentStats();
      stats = data;
    } catch (err) {
      console.warn('Failed to load tournament stats:', err);
    }
  }

  // Navigation functions
  function showCreate() {
    view = 'create';
    error = null;
    success = null;
  }

  function showDetail(event: CustomEvent<TournamentData>) {
    console.log('Tournament.svelte: showDetail received event:', event);
    console.log('Tournament.svelte: Event detail:', event.detail);
    selectedTournament = event.detail;
    console.log('Tournament.svelte: selectedTournament set to:', selectedTournament);
    view = 'detail';
    error = null;
    success = null;
  }

  function showJoin(event: CustomEvent<TournamentData>) {
    console.log('Tournament.svelte: showJoin received event:', event);
    console.log('Tournament.svelte: Event detail:', event.detail);
    selectedTournament = event.detail;
    console.log('Tournament.svelte: selectedTournament set to:', selectedTournament);
    view = 'join';
    error = null;
    success = null;
  }

  function showList() {
    view = 'list';
    selectedTournament = null;
    error = null;
    success = null;
  }

  // Handle tournament creation
  function handleTournamentCreated(event: CustomEvent<TournamentData>) {
    console.log('Tournament.svelte: Tournament created event:', event);
    const newTournament = event.detail;
    console.log('Tournament.svelte: Tournament data:', newTournament);
    
    if (!newTournament || !newTournament.id) {
      console.error('Tournament.svelte: Invalid tournament data received:', newTournament);
      error = 'Invalid tournament data received';
      return;
    }
    
    tournaments = [newTournament, ...tournaments];
    success = 'Tournament created successfully!';
    view = 'list';
    // Force re-render by updating the tournaments array
    tournaments = [...tournaments];
    // Also refresh stats to update the count
    loadStats();
  }

  // Handle tournament join
  function handleTournamentJoined() {
    success = 'Successfully joined tournament!';
    view = 'list';
    loadTournaments(); // Refresh the list
  }

  // Handle tournament start
  function handleTournamentStarted() {
    success = 'Tournament started successfully!';
    view = 'list';
    loadTournaments(); // Refresh the list
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">Tournaments</h1>
        <button 
          on:click={onBack}
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Game
        </button>
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

    <!-- Loading State -->
    {#if loading}
      <div class="flex justify-center items-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    {:else}
      <!-- Tournament List View -->
      {#if view === 'list'}
        <TournamentList 
          {tournaments}
          {stats}
          {isAuthenticated}
          {currentUser}
          on:create={showCreate}
          on:detail={showDetail}
          on:join={showJoin}
        />
      <!-- Tournament Create View -->
      {:else if view === 'create'}
        <TournamentCreate 
          {isAuthenticated}
          {currentUser}
          on:created={handleTournamentCreated}
          on:back={showList}
        />
      <!-- Tournament Detail View -->
      {:else if view === 'detail'}
        {#if selectedTournament}
          <TournamentDetail 
            tournament={selectedTournament}
            {isAuthenticated}
            {currentUser}
            {onStartMatch}
            on:back={showList}
            on:start={handleTournamentStarted}
          />
        {:else}
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-center">
              <p class="text-gray-600 mb-4">No tournament selected</p>
              <button 
                on:click={showList}
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Tournament List
              </button>
            </div>
          </div>
        {/if}
      <!-- Tournament Join View -->
      {:else if view === 'join'}
        {#if selectedTournament}
          <TournamentJoin 
            tournament={selectedTournament}
            {isAuthenticated}
            {currentUser}
            on:joined={handleTournamentJoined}
            on:back={showList}
          />
        {:else}
          <div class="bg-white rounded-lg shadow p-6">
            <div class="text-center">
              <p class="text-gray-600 mb-4">No tournament selected</p>
              <button 
                on:click={showList}
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Back to Tournament List
              </button>
            </div>
          </div>
        {/if}
      {/if}
    {/if}
  </div>
</div>
