<!--
  Match History Component
  
  Displays the user's match history in a table format.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { MatchHistoryService } from '../shared/services/matchHistoryService';
  import type { LocalMatch, GameStats } from '../shared/services/matchHistoryService';

  export let onBack: () => void;

  let matches: LocalMatch[] = [];
  let stats: GameStats | null = null;
  let loading = true;
  let error: string | null = null;

  onMount(() => {
    loadMatchHistory();
  });

  async function loadMatchHistory() {
    try {
      loading = true;
      error = null;
      
      console.log('📂 Loading match history from backend...');
      
      // Load matches from backend API
      matches = await MatchHistoryService.getMatches();
      console.log('✅ Loaded matches:', matches.length);
      console.log('📋 Match data:', matches);
      
      // Calculate stats from matches
      stats = MatchHistoryService.getStats(matches);
      console.log('✅ Calculated stats:', stats);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load match history';
      console.error('❌ Error loading match history:', err);
    } finally {
      loading = false;
    }
  }
  
  function clearHistory() {
    if (confirm('Are you sure you want to clear all match history?')) {
      MatchHistoryService.clearMatches();
      loadMatchHistory();
    }
  }

  function formatDate(dateString: string): string {
    // Parse the date string as UTC and convert to local time
    const date = new Date(dateString + (dateString.includes('Z') ? '' : 'Z'));
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  function formatDuration(seconds: number | null | undefined): string {
    if (!seconds || seconds === 0) {
      return '--:--';
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  function getResultBadgeClass(result: string): string {
    switch (result) {
      case 'win':
        return 'bg-green-100 text-green-800';
      case 'loss':
        return 'bg-red-100 text-red-800';
      case 'draw':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
  
  function getResultText(result: string): string {
    if (result === 'win') {
      return $_('matchhistory.win');
    } else if (result === 'loss') {
      return $_('matchhistory.loss');
    } else if (result === 'draw') {
      return $_('matchhistory.draw');
    }
    return result.toUpperCase();
  }
</script>

<div class="max-w-6xl mx-auto space-y-6">
  <!-- Game Statistics Card -->
  {#if stats && stats.totalGames > 0}
    <div class="bg-white rounded-lg shadow-md p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">{$_('matchhistory.gamestats')}</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-blue-50 rounded-lg">
          <div class="text-2xl font-bold text-blue-600">{stats.totalGames || 0}</div>
          <div class="text-sm text-gray-600 mt-1">{$_('rankinfo.totalgames')}</div>
        </div>
        <div class="text-center p-4 bg-green-50 rounded-lg">
          <div class="text-2xl font-bold text-green-600">{stats.gamesWon || 0}</div>
          <div class="text-sm text-gray-600 mt-1">{$_('rankinfo.gameswon')}</div>
        </div>
        <div class="text-center p-4 bg-red-50 rounded-lg">
          <div class="text-2xl font-bold text-red-600">{stats.gamesLost || 0}</div>
          <div class="text-sm text-gray-600 mt-1">{$_('info.gameslost')}</div>
        </div>
        <div class="text-center p-4 bg-purple-50 rounded-lg">
          <div class="text-2xl font-bold text-purple-600">{(stats.winRate || 0).toFixed(1)}%</div>
          <div class="text-sm text-gray-600 mt-1">{$_('rankinfo.winrate')}</div>
        </div>
        <div class="text-center p-4 bg-yellow-50 rounded-lg">
          <div class="text-2xl font-bold text-yellow-600">{stats.totalScore || 0}</div>
          <div class="text-sm text-gray-600 mt-1">{$_('rankinfo.totalscore')}</div>
        </div>
        <div class="text-center p-4 bg-orange-50 rounded-lg">
          <div class="text-2xl font-bold text-orange-600">{stats.highestScore || 0}</div>
          <div class="text-sm text-gray-600 mt-1">{$_('rankinfo.highscore')}</div>
        </div>
        <div class="text-center p-4 bg-indigo-50 rounded-lg">
          <div class="text-2xl font-bold text-indigo-600">{(stats.averageScore || 0).toFixed(1)}</div>
          <div class="text-sm text-gray-600 mt-1">{$_('rankinfo.avgscore')}</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Match History Card -->
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-bold text-gray-800">{$_('matchhistory.title')}</h2>
      <div class="flex space-x-2">
        {#if matches.length > 0}
          <button
            on:click={clearHistory}
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Clear History
          </button>
        {/if}
        <button
          on:click={onBack}
          class="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          {$_('button.back')}
        </button>
      </div>
    </div>

  {#if loading}
    <div class="flex justify-center items-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  {:else if error}
    <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
      {error}
    </div>
  {:else if matches.length === 0}
    <div class="text-center py-12">
      <p class="text-gray-600 text-lg">{$_('msg.nomatchesyet')}</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {$_('matchhistory.opponent')}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {$_('matchhistory.score')}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {$_('matchhistory.result')}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {$_('matchhistory.gamemode')}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {$_('matchhistory.duration')}
            </th>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              {$_('info.createdat')}
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each matches as match (match.id)}
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <span class="text-gray-600 text-sm font-medium">
                      {match.opponentName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span class="text-sm font-medium text-gray-900">{match.opponentName}</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="text-sm text-gray-900">
                  {match.userScore} - {match.opponentScore}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getResultBadgeClass(match.result)}`}>
                  {getResultText(match.result)}
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {match.gameMode === 'tournament' ? $_('matchhistory.tournament') : $_('matchhistory.multiplayer')}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDuration(match.duration)}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(match.playedAt)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    
  {/if}
  </div>
</div>



