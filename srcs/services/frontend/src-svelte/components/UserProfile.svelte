<!--
  User Profile Component
  
  Displays user information and provides logout functionality.
  Shows username, email, account creation date, last activity, and game statistics.
-->

<script lang="ts">
  import { onMount } from 'svelte';
  import { AuthService } from '../shared/services/authService';
  import { GameStatsService, type UserStatistics } from '../shared/services/gameStatsService';
  import { _ } from 'svelte-i18n';
  import type { User } from '../shared/types/auth';

  export let user: User | null = null;
  export let onLogout: () => void;
  export let onBackToGame: () => void;
  export let onDeleteAccount: () => void;

  let statistics: UserStatistics | null = null;
  let loading = true;
  let error: string | null = null;

  /**
   * Fetch user statistics on component mount
   */
  onMount(async () => {
    try {
      loading = true;
      error = null;
      const stats = await GameStatsService.getUserStatistics();
      statistics = stats;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : $_('error.statsfailed');
      error = errorMessage;
      
      // If it's an authentication error, redirect to login
      if (errorMessage.includes('Valid JWT token required')) {
        AuthService.clearAuthData();
        onLogout();
      }
    } finally {
      loading = false;
    }
  });

  /**
   * Handle logout action
   * Clears stored authentication data and calls logout callback
   */
  const handleLogout = () => {
    AuthService.clearAuthData();
    onLogout();
  };

  /**
   * Format date for display
   * @param dateString - ISO date string
   * @returns string - Formatted date
   */
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Calculate win rate percentage
   * @param won - Number of games won
   * @param total - Total number of games
   * @returns string - Win rate percentage
   */
  const calculateWinRate = (won: number, total: number): string => {
    if (total === 0) return '0%';
    return `${Math.round((won / total) * 100)}%`;
  };
</script>

{#if user}
  <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
    <div class="text-center mb-6">
      <div class="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-2xl font-bold text-blue-600">
          {user.username.charAt(0).toUpperCase()}
        </span>
      </div>
      <h2 class="text-2xl font-bold text-gray-800">{user.username}</h2>
      <p class="text-gray-600">{user.email}</p>
    </div>

  <div class="space-y-4 mb-6">
    <!-- Account Information -->
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">{$_('label.acctinfo')}</h3>
      
      <div class="space-y-2">
        <div class="flex justify-between">
          <span class="text-gray-600">{$_('info.usrnm')}</span>
          <span class="font-medium">{user.username}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-600">{$_('info.email')}</span>
          <span class="font-medium">{user.email}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-600">{$_('info.createdat')}</span>
          <span class="font-medium">{formatDate(user.createdAt)}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-gray-600">{$_('info.updatedat')}</span>
          <span class="font-medium">{formatDate(user.updatedAt)}</span>
        </div>
      </div>
    </div>

    <!-- Game Statistics -->
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-3">{$_('label.gamestats')}</h3>
      
      {#if loading}
        <div class="text-center py-4">
          <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-600 mt-2">{$_('label.loading')}</p>
        </div>
      {:else if error}
        <div class="text-center py-4">
          <p class="text-red-600">{error}</p>
          <button
            on:click={() => window.location.reload()}
            class="mt-2 text-blue-600 hover:text-blue-800"
          >
            {$_('button.retry')}
          </button>
        </div>
      {:else if statistics}
        <div class="space-y-2">
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.totalgames')}</span>
            <span class="font-medium">{statistics.totalGames}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.gameswon')}</span>
            <span class="font-medium text-green-600">{statistics.gamesWon}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.gameslost')}</span>
            <span class="font-medium text-red-600">{statistics.gamesLost}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.winrate')}</span>
            <span class="font-medium">
              {calculateWinRate(statistics.gamesWon, statistics.totalGames)}
            </span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.totalscore')}</span>
            <span class="font-medium">{statistics.totalScore}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.highscore')}</span>
            <span class="font-medium text-yellow-600">{statistics.highestScore}</span>
          </div>
          
          <div class="flex justify-between">
            <span class="text-gray-600">{$_('info.avgscore')}</span>
            <span class="font-medium">{statistics.averageScore.toFixed(1)}</span>
          </div>
        </div>
      {:else}
        <div class="text-center py-4">
          <p class="text-gray-600">{$_('label.nostats')}</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="space-y-3">
    <button
      on:click={handleLogout}
      class="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      {$_('button.logout')}
    </button>
    
    <button
      on:click={onBackToGame}
      class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
    >
      {$_('button.backtogame')}
    </button>

    <button
      on:click={onDeleteAccount}
      class="w-full bg-red-800 text-white py-2 px-4 rounded-md hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      {$_('button.deleteacct')}
    </button>
  </div>
  </div>
{:else}
  <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
    <div class="text-center">
      <p class="text-gray-600 mb-4">No user data available</p>
      <button
        on:click={onBackToGame}
        class="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
      >
        Back to Game
      </button>
    </div>
  </div>
{/if}
