<script lang="ts">
  import { onMount } from 'svelte';
  import LoginForm from './components/LoginForm.svelte';
  import RegisterForm from './components/RegisterForm.svelte';
  import UserProfile from './components/UserProfile.svelte';
  import PongGame from './components/PongGame.svelte';
  import AIPong from './components/AIPong.svelte';
  import MultiPlayerPong from './components/MultiPlayerPong.svelte';
  import Tournament from './components/Tournament.svelte';
  import Leaderboard from './components/Leaderboard.svelte';
  import ForgotUsername from './components/ForgotUsername.svelte';
  import ForgotPassword from './components/ForgotPassword.svelte';
  import { _, t, locale, isLoading as i18nLoading } from 'svelte-i18n';
  import { AuthService } from './shared/services/authService';
  import type { AuthResponse, User } from './shared/types/auth';

  // Game mode state
  let gameMode: 'menu' | 'single' | 'multiplayer' | 'ai' = 'menu';
  let roomId = '';
  let playerSide: 'left' | 'right' = 'left';
  let showRoomInput = true; // Add flag to control room input visibility

  // Authentication state
  let user: User | null = null;
  let isAuthenticated = false;
  let isLoading = true;
  let authMode: 'login' | 'register' = 'login';
  let view: 'game' | 'profile' | 'deleteAccount' | 'forgotPassword' | 'forgotUsername' | 'settings' | 'ranking' | 'tournament' = 'game';
  let showSettings = false;
  let selectedLanguage = 'en';

  // Check authentication status on component mount
  onMount(async () => {
    // Wait for i18n to load
    while ($i18nLoading) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    await checkAuth();
  });

  const checkAuth = async () => {
    try {
      const storedAuth = AuthService.getStoredAuthData();
      if (storedAuth && AuthService.isAuthenticated()) {
        user = storedAuth.user;
        isAuthenticated = true;
      } else {
        // Clear invalid auth data
        AuthService.clearAuthData();
        user = null;
        isAuthenticated = false;
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      AuthService.clearAuthData();
      user = null;
      isAuthenticated = false;
    }
    isLoading = false;
  };

  // Handle successful authentication
  const handleAuthSuccess = (authData: AuthResponse) => {
    user = authData.user;
    isAuthenticated = true;
    view = 'game';
  };

  // Handle logout
  const handleLogout = () => {
    user = null;
    isAuthenticated = false;
    authMode = 'login';
    view = 'game';
    AuthService.clearAuthData();
  };

  // Game mode functions
  const startSinglePlayerGame = () => {
    gameMode = 'single';
  };

  const startAIGame = () => {
    gameMode = 'ai';
  };

  const showMultiplayerSetup = () => {
    gameMode = 'multiplayer';
    showRoomInput = true;
    roomId = ''; // Reset roomId
  };

  const startMultiplayerGame = () => {
    if (roomId.trim() === '') {
      alert('Please enter a Room ID');
      return;
    }
    showRoomInput = false;
  };

  const handleReturnToMenu = () => {
    gameMode = 'menu';
  };

  // Handle view changes
  const setView = (newView: typeof view) => {
    view = newView;
  };

  const setShowSettings = (show: boolean) => {
    showSettings = show;
  };
</script>

<main>
  <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
    {#if isLoading || $i18nLoading}
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    {:else if !isAuthenticated}
      <!-- Authentication Views -->
      <div class="text-center">
        <h1 class="text-4xl mb-8">{$_('label.title')}</h1>
        <p class="text-gray-400 mb-8">{$_('label.signintoplay')}</p>
        
        {#if authMode === 'login'}
          <LoginForm 
            onLoginSuccess={handleAuthSuccess}
            onSwitchToRegister={() => authMode = 'register'}
            onSwitchToForgotUsername={() => { view = 'forgotUsername'; }}
            onSwitchToForgotPassword={() => { view = 'forgotPassword'; }}
          />
        {:else}
          <RegisterForm 
            onRegisterSuccess={handleAuthSuccess}
            onSwitchToLogin={() => authMode = 'login'}
          />
        {/if}
        
        <!-- Forgot Password/Username Views (for unauthenticated users) -->
        {#if view === 'forgotUsername'}
          <ForgotUsername onBackToLogin={() => { view = 'game'; }} />
        {:else if view === 'forgotPassword'}
          <ForgotPassword onBackToLogin={() => { view = 'game'; }} />
        {/if}
      </div>
    {:else}
      <!-- Main Game View -->
      <div class="text-center">
        <div class="flex justify-between items-center mb-8">
          <div class="text-left">
            <h1 class="text-4xl">{$_('label.title')}</h1>
            <p class="text-gray-400 mt-2">Welcome, {user?.username || 'Guest'}!</p>
          </div>
          <div class="flex gap-4">
            <button 
              on:click={() => setView('profile')}
              class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              {$_('button.userprofile')}
            </button>
            <button 
              on:click={handleLogout}
              class="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
            >
              {$_('button.logout')}
            </button>
          </div>
        </div>
        
        <!-- Game Content -->
        {#if view === 'game'}
          {#if gameMode === 'menu'}
            <!-- Main Menu -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <button 
                on:click={startSinglePlayerGame}
                class="p-6 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <h3 class="text-xl font-bold mb-2">{$_('button.pvplocal')}</h3>
                <p class="text-gray-300">{$_('msg.movementkeys')}</p>
              </button>
              
              <button 
                on:click={showMultiplayerSetup}
                class="p-6 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                <h3 class="text-xl font-bold mb-2">{$_('button.mponline')}</h3>
                <p class="text-gray-300">Play with friends online</p>
              </button>
              
              <button 
                on:click={startAIGame}
                class="p-6 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
              >
                <h3 class="text-xl font-bold mb-2">{$_('button.pve')}</h3>
                <p class="text-gray-300">{$_('msg.aidifficulty')}</p>
              </button>
              
              <button 
                on:click={() => setView('tournament')}
                class="p-6 bg-yellow-600 rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <h3 class="text-xl font-bold mb-2">{$_('button.tournament')}</h3>
                <p class="text-gray-300">Join or create tournaments</p>
              </button>
              
              <button 
                on:click={() => setView('ranking')}
                class="p-6 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <h3 class="text-xl font-bold mb-2">{$_('button.ranking')}</h3>
                <p class="text-gray-300">{$_('msg.leaderboard')}</p>
              </button>
              
              <button 
                on:click={() => setShowSettings(true)}
                class="p-6 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <h3 class="text-xl font-bold mb-2">{$_('button.settings')}</h3>
                <p class="text-gray-300">Game settings and preferences</p>
              </button>
            </div>
          {:else if gameMode === 'single'}
            <!-- Single Player Game -->
            <PongGame />
            <button 
              on:click={handleReturnToMenu}
              class="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              {$_('button.backtomenu')}
            </button>
          {:else if gameMode === 'multiplayer'}
            {#if showRoomInput}
              <!-- Multiplayer Setup -->
              <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">{$_('label.multiplayer')}</h2>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      {$_('placeholder.roomid')} *
                    </label>
                    <input
                      type="text"
                      placeholder={$_('placeholder.roomid')}
                      bind:value={roomId}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">
                      Player Side
                    </label>
                    <select
                      bind:value={playerSide}
                      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="left">{$_('option.leftplayer')}</option>
                      <option value="right">{$_('option.rightplayer')}</option>
                    </select>
                  </div>
                  
                  <div class="flex space-x-3">
                    <button 
                      on:click={startMultiplayerGame}
                      class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {$_('button.startgame')}
                    </button>
                    <button 
                      on:click={handleReturnToMenu}
                      class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      {$_('button.backtomenu')}
                    </button>
                  </div>
                </div>
              </div>
            {:else}
              <!-- Multiplayer Game -->
              <MultiPlayerPong {roomId} {playerSide} />
              <button 
                on:click={handleReturnToMenu}
                class="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
              >
                {$_('button.backtomenu')}
              </button>
            {/if}
          {:else if gameMode === 'ai'}
            <!-- AI Game -->
            <AIPong />
            <button 
              on:click={handleReturnToMenu}
              class="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              {$_('button.backtomenu')}
            </button>
          {/if}
        {:else if view === 'profile'}
          <!-- User Profile -->
          <UserProfile 
            {user}
            onBackToGame={() => setView('game')}
            onLogout={handleLogout}
            onDeleteAccount={() => setView('deleteAccount')}
          />
        {:else if view === 'tournament'}
          <!-- Tournament -->
          <Tournament 
            onBack={() => setView('game')}
            onStartMatch={(tournamentId, matchId, roomId) => {
              gameMode = 'multiplayer';
              roomId = roomId;
              playerSide = 'left';
              setView('game');
            }}
          />
        {:else if view === 'ranking'}
          <!-- Leaderboard -->
          <Leaderboard onBack={() => setView('game')} />
        {/if}
      </div>
    {/if}
    
    <!-- Settings Modal -->
    {#if showSettings}
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-2xl font-bold text-gray-900">Game Settings</h2>
            <button 
              on:click={() => setShowSettings(false)}
              class="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Game Speed
              </label>
              <select class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                <option value="slow">Slow</option>
                <option value="normal" selected>Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Sound Effects
              </label>
              <input type="checkbox" checked class="mr-2"> Enable sound effects
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select 
                bind:value={selectedLanguage}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="en">English</option>
                <option value="ko">한국어</option>
                <option value="jp">日本語</option>
              </select>
            </div>
          </div>
          
          <div class="mt-6 flex justify-end space-x-3">
            <button 
              on:click={() => setShowSettings(false)}
              class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cancel
            </button>
            <button 
              on:click={() => {
                locale.set(selectedLanguage);
                setShowSettings(false);
              }}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>

<style>
  main {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  .grid {
    display: grid;
  }
  
  .grid-cols-1 {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
  
  @media (min-width: 768px) {
    .md\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  
  @media (min-width: 1024px) {
    .lg\:grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  
  .gap-6 {
    gap: 1.5rem;
  }
  
  .max-w-4xl {
    max-width: 56rem;
  }
  
  .mx-auto {
    margin-left: auto;
    margin-right: auto;
  }
  
  .p-6 {
    padding: 1.5rem;
  }
  
  .bg-blue-600 {
    background-color: rgb(37 99 235);
  }
  
  .bg-green-600 {
    background-color: rgb(22 163 74);
  }
  
  .bg-purple-600 {
    background-color: rgb(147 51 234);
  }
  
  .bg-yellow-600 {
    background-color: rgb(202 138 4);
  }
  
  .bg-indigo-600 {
    background-color: rgb(79 70 229);
  }
  
  .bg-gray-600 {
    background-color: rgb(75 85 99);
  }
  
  .hover\:bg-blue-700:hover {
    background-color: rgb(29 78 216);
  }
  
  .hover\:bg-green-700:hover {
    background-color: rgb(21 128 61);
  }
  
  .hover\:bg-purple-700:hover {
    background-color: rgb(126 34 206);
  }
  
  .hover\:bg-yellow-700:hover {
    background-color: rgb(161 98 7);
  }
  
  .hover\:bg-indigo-700:hover {
    background-color: rgb(67 56 202);
  }
  
  .hover\:bg-gray-700:hover {
    background-color: rgb(55 65 81);
  }
  
  .rounded-lg {
    border-radius: 0.5rem;
  }
  
  .transition-colors {
    transition-property: color, background-color, border-color, text-decoration-color, fill, stroke;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
  }
  
  .text-xl {
    font-size: 1.25rem;
    line-height: 1.75rem;
  }
  
  .font-bold {
    font-weight: 700;
  }
  
  .mb-2 {
    margin-bottom: 0.5rem;
  }
  
  .text-gray-300 {
    color: rgb(209 213 219);
  }
  
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
  
  .rounded-full {
    border-radius: 9999px;
  }
  
  .h-12 {
    height: 3rem;
  }
  
  .w-12 {
    width: 3rem;
  }
  
  .border-b-2 {
    border-bottom-width: 2px;
  }
  
  .border-white {
    border-color: rgb(255 255 255);
  }
  
  .mb-4 {
    margin-bottom: 1rem;
  }
  
  .text-black {
    color: rgb(0 0 0);
  }
  
  .mr-2 {
    margin-right: 0.5rem;
  }
  
  .mt-4 {
    margin-top: 1rem;
  }
  
  .px-4 {
    padding-left: 1rem;
    padding-right: 1rem;
  }
  
  .py-2 {
    padding-top: 0.5rem;
    padding-bottom: 0.5rem;
  }
  
  .rounded {
    border-radius: 0.25rem;
  }
  
  .hover\:bg-gray-700:hover {
    background-color: rgb(55 65 81);
  }
  
  .min-h-screen {
    min-height: 100vh;
  }
  
  .bg-gray-900 {
    background-color: rgb(17 24 39);
  }
  
  .text-white {
    color: rgb(255 255 255);
  }
  
  .flex {
    display: flex;
  }
  
  .items-center {
    align-items: center;
  }
  
  .justify-center {
    justify-content: center;
  }
  
  .text-center {
    text-align: center;
  }
  
  .text-4xl {
    font-size: 2.25rem;
    line-height: 2.5rem;
  }
  
  .mb-8 {
    margin-bottom: 2rem;
  }
  
  .text-gray-400 {
    color: rgb(156 163 175);
  }
  
  .mt-2 {
    margin-top: 0.5rem;
  }
  
  .justify-between {
    justify-content: space-between;
  }
  
  .gap-4 {
    gap: 1rem;
  }
  
  .bg-blue-600 {
    background-color: rgb(37 99 235);
  }
  
  .bg-red-600 {
    background-color: rgb(220 38 38);
  }
  
  .hover\:bg-blue-700:hover {
    background-color: rgb(29 78 216);
  }
  
  .hover\:bg-red-700:hover {
    background-color: rgb(185 28 28);
  }
  
  .text-left {
    text-align: left;
  }
</style>