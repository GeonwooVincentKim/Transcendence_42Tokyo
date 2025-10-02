<script lang="ts">
  import { onMount } from 'svelte';
  import LoginForm from './components/LoginForm.svelte';
  import RegisterForm from './components/RegisterForm.svelte';
  import UserProfile from './components/UserProfile.svelte';
  import PongGame from './components/PongGame.svelte';
  import AIPong from './components/AIPong.svelte';
  import MultiPlayerPong from './components/MultiPlayerPong.svelte';
  import { _ } from 'svelte-i18n';
  import { authStore, currentViewStore, gameStateStore, authActions, gameActions } from './lib/stores';
  import { router } from './lib/router';

  let currentView = 'welcome';
  let isConnected = false;
  let backendStatus = 'checking';
  let user: any = null;
  let gameState: any = null;

  // Subscribe to stores
  authStore.subscribe(store => {
    user = store.user;
    if (store.isAuthenticated) {
      currentView = 'dashboard';
    } else {
      currentView = 'welcome';
    }
  });

  currentViewStore.subscribe(view => {
    currentView = view;
  });

  gameStateStore.subscribe(state => {
    gameState = state;
  });

  onMount(async () => {
    // Initialize router
    router.init();
    
    // Check backend connection
    try {
      const response = await fetch('/api/ping');
      if (response.ok) {
        isConnected = true;
        backendStatus = 'connected';
      } else {
        backendStatus = 'error';
      }
    } catch (error) {
      console.error('Backend connection failed:', error);
      backendStatus = 'error';
    }
  });

  const showLogin = () => {
    currentView = 'login';
  };

  const showRegister = () => {
    currentView = 'register';
  };

  const backToWelcome = () => {
    currentView = 'welcome';
  };

  const handleLogin = (userData: any, token: string) => {
    authActions.login(userData, token);
    currentView = 'dashboard';
  };

  const handleLogout = () => {
    authActions.logout();
    currentView = 'welcome';
  };

  const startPongGame = () => {
    gameActions.startGame('pong');
    currentView = 'pong-game';
  };

  const startAIGame = () => {
    gameActions.startGame('ai');
    currentView = 'ai-game';
  };

  const startMultiplayerGame = (roomId: string, playerSide: 'left' | 'right') => {
    gameActions.startGame('multiplayer', roomId, playerSide);
    currentView = 'multiplayer-game';
  };

  const backToDashboard = () => {
    gameActions.endGame();
    currentView = 'dashboard';
  };

  const showUserProfile = () => {
    currentView = 'profile';
  };

  const handleDeleteAccount = () => {
    // Handle account deletion
    authActions.logout();
    currentView = 'welcome';
  };
</script>

<main>
  <div class="container">
    {#if currentView === 'welcome'}
      <h1>🏓 ft_transcendence Pong</h1>
      <p class="subtitle">Svelte Version (In Development)</p>
      
      <div class="status {backendStatus === 'connected' ? 'success' : backendStatus === 'error' ? 'error' : 'loading'}">
        {#if backendStatus === 'connected'}
          ✅ Backend Connected!
        {:else if backendStatus === 'error'}
          ❌ Backend Connection Failed
        {:else}
          ⏳ Checking Backend...
        {/if}
      </div>
      
      <div class="info">
        <h2>Project Status:</h2>
        <ul>
          <li>✅ Svelte setup complete</li>
          <li>✅ TypeScript configured</li>
          <li>✅ Shared services copied</li>
          <li>✅ LoginForm migrated to Svelte</li>
          <li>✅ RegisterForm migrated to Svelte</li>
          <li>✅ UserProfile migrated to Svelte</li>
          <li>✅ Game components migrated to Svelte</li>
          <li>✅ Routing system implemented</li>
          <li>✅ State management with stores</li>
        </ul>
      </div>
      
      <div class="actions">
        <button on:click={showLogin} class="btn btn-primary">
          Login
        </button>
        <button on:click={showRegister} class="btn btn-secondary">
          Register
        </button>
      </div>
      
      <div class="note">
        <p><strong>Note:</strong> This is the Svelte version running on port 3001.</p>
        <p>The original React version is still available on port 3000.</p>
      </div>
      
    {:else if currentView === 'login'}
      <div class="login-container">
        <button on:click={backToWelcome} class="btn btn-secondary mb-4">
          ← Back to Welcome
        </button>
        <LoginForm 
          onLoginSuccess={handleLogin}
          onSwitchToRegister={showRegister}
          onSwitchToForgotUsername={() => {}}
          onSwitchToForgotPassword={() => {}}
        />
      </div>
      
    {:else if currentView === 'register'}
      <div class="login-container">
        <button on:click={backToWelcome} class="btn btn-secondary mb-4">
          ← Back to Welcome
        </button>
        <RegisterForm 
          onRegisterSuccess={handleLogin}
          onSwitchToLogin={showLogin}
        />
      </div>
      
    {:else if currentView === 'dashboard'}
      <div class="dashboard">
        <h1>Welcome, {user?.username}!</h1>
        <div class="dashboard-actions">
          <button on:click={startPongGame} class="btn btn-primary">
            🎮 Player vs Player
          </button>
          <button on:click={startAIGame} class="btn btn-primary">
            🤖 Player vs AI
          </button>
          <button on:click={showUserProfile} class="btn btn-secondary">
            👤 Profile
          </button>
          <button on:click={handleLogout} class="btn btn-danger">
            🚪 Logout
          </button>
        </div>
      </div>
      
    {:else if currentView === 'profile'}
      <div class="profile-container">
        <button on:click={backToDashboard} class="btn btn-secondary mb-4">
          ← Back to Dashboard
        </button>
        <UserProfile 
          {user}
          onLogout={handleLogout}
          onBackToGame={backToDashboard}
          onDeleteAccount={handleDeleteAccount}
        />
      </div>
      
    {:else if currentView === 'pong-game'}
      <div class="game-container">
        <button on:click={backToDashboard} class="btn btn-secondary mb-4">
          ← Back to Dashboard
        </button>
        <PongGame />
      </div>
      
    {:else if currentView === 'ai-game'}
      <div class="game-container">
        <button on:click={backToDashboard} class="btn btn-secondary mb-4">
          ← Back to Dashboard
        </button>
        <AIPong />
      </div>
      
    {:else if currentView === 'multiplayer-game'}
      <div class="game-container">
        <button on:click={backToDashboard} class="btn btn-secondary mb-4">
          ← Back to Dashboard
        </button>
        <MultiPlayerPong 
          roomId={gameState?.roomId || 'tournament-1-match-1'}
          playerSide={gameState?.playerSide || 'left'}
        />
      </div>
    {/if}
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
  }
  
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 2rem;
  }
  
  .container {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 800px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  }
  
  h1 {
    color: #667eea;
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;
    text-align: center;
  }
  
  .subtitle {
    color: #666;
    text-align: center;
    margin: 0 0 2rem 0;
  }
  
  .status {
    padding: 1rem;
    border-radius: 0.5rem;
    margin: 1rem 0;
    text-align: center;
    font-weight: bold;
  }
  
  .status.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  .status.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  .status.loading {
    background: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
  }
  
  .info {
    margin: 2rem 0;
  }
  
  .info h2 {
    color: #333;
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
  
  .info ul {
    list-style: none;
    padding: 0;
  }
  
  .info li {
    padding: 0.5rem 0;
    border-bottom: 1px solid #eee;
  }
  
  .info li:last-child {
    border-bottom: none;
  }
  
  .note {
    background: #e7f3ff;
    border-left: 4px solid #2196F3;
    padding: 1rem;
    margin-top: 2rem;
  }
  
  .note p {
    margin: 0.5rem 0;
    color: #0d47a1;
  }
  
  .actions {
    margin: 2rem 0;
    text-align: center;
  }
  
  .dashboard {
    text-align: center;
  }
  
  .dashboard-actions {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin: 2rem 0;
  }
  
  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    border: none;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    margin: 0.5rem;
  }
  
  .btn-primary {
    background: #3b82f6;
    color: white;
  }
  
  .btn-primary:hover {
    background: #2563eb;
  }
  
  .btn-secondary {
    background: #6b7280;
    color: white;
  }
  
  .btn-secondary:hover {
    background: #4b5563;
  }
  
  .btn-danger {
    background: #dc2626;
    color: white;
  }
  
  .btn-danger:hover {
    background: #b91c1c;
  }
  
  .login-container, .profile-container, .game-container {
    max-width: 600px;
    margin: 0 auto;
  }
  
  .mb-4 {
    margin-bottom: 1rem;
  }
</style>