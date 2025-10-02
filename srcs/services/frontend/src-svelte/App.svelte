<script lang="ts">
  import { onMount } from 'svelte';
  import LoginForm from './components/LoginForm.svelte';
  import RegisterForm from './components/RegisterForm.svelte';
  import { AuthResponse } from '@shared/types/auth';
  
  let message = 'Hello from Svelte!';
  let isReady = false;
  let showLoginForm = false;
  let currentView = 'welcome';
  
  onMount(() => {
    console.log('Svelte app mounted successfully!');
    isReady = true;
  });
  
  function handleLoginSuccess(authData: AuthResponse) {
    console.log('Login successful:', authData);
    currentView = 'success';
  }
  
  function handleSwitchToRegister() {
    console.log('Switch to register');
    currentView = 'register';
  }
  
  function handleRegisterSuccess(authData: AuthResponse) {
    console.log('Register successful:', authData);
    currentView = 'success';
  }
  
  function handleSwitchToForgotUsername() {
    console.log('Switch to forgot username');
    // TODO: Implement forgot username
  }
  
  function handleSwitchToForgotPassword() {
    console.log('Switch to forgot password');
    // TODO: Implement forgot password
  }
  
  function showLogin() {
    showLoginForm = true;
    currentView = 'login';
  }
</script>

<main>
  <div class="container">
    {#if currentView === 'welcome'}
      <h1>🏓 ft_transcendence Pong</h1>
      <p class="subtitle">Svelte Version (In Development)</p>
      
      {#if isReady}
        <div class="status success">
          ✅ Svelte is working!
        </div>
      {:else}
        <div class="status loading">
          ⏳ Loading...
        </div>
      {/if}
      
      <div class="info">
        <h2>Project Status:</h2>
        <ul>
          <li>✅ Svelte setup complete</li>
          <li>✅ TypeScript configured</li>
          <li>✅ Shared services copied</li>
          <li>✅ LoginForm migrated to Svelte</li>
          <li>🚧 More components migration in progress</li>
          <li>⏳ React version still available (port 3000)</li>
        </ul>
      </div>
      
      <div class="actions">
        <button on:click={showLogin} class="btn btn-primary">
          Test Login Form
        </button>
        <button on:click={() => currentView = 'register'} class="btn btn-secondary">
          Test Register Form
        </button>
      </div>
      
      <div class="note">
        <p><strong>Note:</strong> This is the Svelte version running on port 3001.</p>
        <p>The original React version is still available on port 3000.</p>
      </div>
    {:else if currentView === 'login'}
      <div class="login-container">
        <button on:click={() => currentView = 'welcome'} class="btn btn-secondary mb-4">
          ← Back to Welcome
        </button>
        <LoginForm 
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={handleSwitchToRegister}
          onSwitchToForgotUsername={handleSwitchToForgotUsername}
          onSwitchToForgotPassword={handleSwitchToForgotPassword}
        />
      </div>
    {:else if currentView === 'register'}
      <div class="login-container">
        <button on:click={() => currentView = 'welcome'} class="btn btn-secondary mb-4">
          ← Back to Welcome
        </button>
        <RegisterForm 
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => currentView = 'login'}
        />
      </div>
    {:else if currentView === 'success'}
      <div class="success-container">
        <h1>🎉 Authentication Successful!</h1>
        <p>LoginForm.svelte and RegisterForm.svelte are working perfectly!</p>
        <button on:click={() => currentView = 'welcome'} class="btn btn-primary">
          Back to Welcome
        </button>
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
    max-width: 600px;
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
  
  .login-container {
    max-width: 500px;
    margin: 0 auto;
  }
  
  .success-container {
    text-align: center;
    padding: 2rem;
  }
  
  .success-container h1 {
    color: #10b981;
    margin-bottom: 1rem;
  }
</style>

