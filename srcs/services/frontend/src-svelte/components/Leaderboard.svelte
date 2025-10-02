<!--
  Leaderboard.svelte - Leaderboard Component
  Displays top players and their game statistics
  Shows rankings based on games won and total score
-->

<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { GameStatsService, type UserStatistics } from '../shared/services/gameStatsService';
  import { _ } from 'svelte-i18n';

  // Props
  export let onBack: () => void;

  const dispatch = createEventDispatcher();

  // State
  let leaderboard: UserStatistics[] = [];
  let loading = true;
  let error: string | null = null;

  onMount(() => {
    fetchLeaderboard();
  });

  /**
   * Fetch leaderboard data
   */
  async function fetchLeaderboard() {
    try {
      loading = true;
      error = null;
      const data = await GameStatsService.getLeaderboard(10);
      leaderboard = data;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load leaderboard';
    } finally {
      loading = false;
    }
  }

  /**
   * Calculate win rate percentage
   * @param won - Number of games won
   * @param total - Total number of games
   * @returns string - Win rate percentage
   */
  function calculateWinRate(won: number, total: number): string {
    if (total === 0) return '0%';
    return `${Math.round((won / total) * 100)}%`;
  }

  /**
   * Get rank icon based on position
   * @param index - Player position (0-based)
   * @returns string - Rank icon
   */
  function getRankIcon(index: number): string {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return '';
    }
  }

  /**
   * Get rank icon color based on position
   * @param index - Player position (0-based)
   * @returns string - CSS color class
   */
  function getRankIconColor(index: number): string {
    switch (index) {
      case 0: return 'text-yellow-500';
      case 1: return 'text-gray-400';
      case 2: return 'text-orange-500';
      default: return '';
    }
  }

  function handleRetry() {
    fetchLeaderboard();
  }
</script>

<div class="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-3xl font-bold text-gray-800">{$_('label.leaderboard')}</h2>
    <button
      on:click={onBack}
      class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
    >
      {$_('button.back')}
    </button>
  </div>

  {#if loading}
    <div class="text-center py-8">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      <p class="text-gray-600 mt-4">{$_('label.loading')}</p>
    </div>
  {:else if error}
    <div class="text-center py-8">
      <p class="text-red-600 text-lg">{error}</p>
      <button
        on:click={handleRetry}
        class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
      >
        {$_('button.retry')}
      </button>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">
              {$_('rankinfo.rank')}
            </th>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-600">
              {$_('rankinfo.player')}
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">
              {$_('rankinfo.gameswon')}
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">
              {$_('rankinfo.gamesplayed')}
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">
              {$_('rankinfo.winrate')}
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">
              {$_('rankinfo.totalscore')}
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">
              {$_('rankinfo.highscore')}
            </th>
            <th class="px-4 py-3 text-center text-sm font-semibold text-gray-600">
              {$_('rankinfo.avgscore')}
            </th>
          </tr>
        </thead>
        <tbody>
          {#if leaderboard.length === 0}
            <tr>
              <td colspan="8" class="text-center py-8 text-gray-500">
                {$_('label.noplayers')}
              </td>
            </tr>
          {:else}
            {#each leaderboard as player, index (player.id)}
              <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="flex items-center">
                    {#if getRankIcon(index)}
                      <span class="text-lg mr-2 {getRankIconColor(index)}">
                        {getRankIcon(index)}
                      </span>
                    {/if}
                    <span class="font-semibold text-gray-800">
                      #{index + 1}
                    </span>
                  </div>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center">
                    <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span class="text-sm font-bold text-blue-600">
                        {player.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span class="font-medium text-gray-800">{player.username}</span>
                  </div>
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="font-semibold text-green-600">{player.gamesWon}</span>
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {player.totalGames}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="font-medium">
                    {calculateWinRate(player.gamesWon, player.totalGames)}
                  </span>
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {player.totalScore}
                </td>
                <td class="px-4 py-3 text-center">
                  <span class="font-semibold text-yellow-600">{player.highestScore}</span>
                </td>
                <td class="px-4 py-3 text-center text-gray-600">
                  {player.averageScore.toFixed(1)}
                </td>
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>
  {/if}

  <div class="mt-6 text-center text-sm text-gray-500">
    <p>{$_('msg.leaderboard')}</p>
  </div>
</div>

<style>
  /* Additional styles if needed */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
