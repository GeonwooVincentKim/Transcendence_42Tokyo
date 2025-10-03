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
      const data = await tournamentService.listTournaments();
      tournaments = data;
    } catch (err) {
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

  function showDetail(tournament: TournamentData) {
    selectedTournament = tournament;
    view = 'detail';
    error = null;
    success = null;
  }

  function showJoin(tournament: TournamentData) {
    selectedTournament = tournament;
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
  function handleTournamentCreated(newTournament: TournamentData) {
    tournaments = [newTournament, ...tournaments];
    success = 'Tournament created successfully!';
    view = 'list';
  }

  // Handle tournament join
  function handleTournamentJoined() {
    success = $_('msg.joinedtournament');
    view = 'list';
    loadTournaments(); // Refresh the list
  }

  // Handle tournament start
  function handleTournamentStarted() {
    success = $_('msg.startedtournament');
    view = 'list';
    loadTournaments(); // Refresh the list
  }
</script>

<div class="min-h-screen bg-gray-50 py-8">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex justify-between items-center">
        <h1 class="text-3xl font-bold text-gray-900">{$_('label.tournaments')}</h1>
        <button 
          on:click={onBack}
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          {$_('button.backtogame')}
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
      {:else if view === 'detail' && selectedTournament}
        <TournamentDetail 
          tournament={selectedTournament}
          {isAuthenticated}
          {currentUser}
          {onStartMatch}
          on:back={showList}
          on:start={handleTournamentStarted}
        />
      <!-- Tournament Join View -->
      {:else if view === 'join' && selectedTournament}
        <TournamentJoin 
          tournament={selectedTournament}
          {isAuthenticated}
          {currentUser}
          on:joined={handleTournamentJoined}
          on:back={showList}
        />
      {/if}
    {/if}
  </div>
</div>
