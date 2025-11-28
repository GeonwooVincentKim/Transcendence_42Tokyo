<!--
  Login Form Component (Svelte)
  
  Provides a form for user authentication with username and password fields.
  Includes form validation, error handling, and success callbacks.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { LoginRequest, AuthResponse } from '../shared/types/auth';
  import { _, locale } from 'svelte-i18n';
  import { get } from 'svelte/store';
  
  // Props
  export let onLoginSuccess: (authData: AuthResponse) => void;
  export let onSwitchToRegister: () => void;
  export let onSwitchToForgotUsername: () => void;
  export let onSwitchToForgotPassword: () => void;
  
  // State
  let formData: LoginRequest = {
    username: '',
    password: ''
  };
  let isLoading = false;
  let error: string | null = null;
  let requires2FA = false;
  let userId = '';
  let twoFactorCode = '';
  
  // Handle language change
  function handleLangChange(lang: string) {
    locale.set(lang);
    localStorage.setItem('locale', lang);
  }
  
  // Handle form input changes
  function handleInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const { name, value } = target;
    
    formData = {
      ...formData,
      [name]: value
    };
    
    // Clear error when user starts typing
    if (error) error = null;
  }
  
  // Handle form submission
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    // Validate form data
    if (!formData.username.trim() || !formData.password.trim()) {
      error = get(_)('error.fillallfields') || 'Please fill in all fields';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || get(_)('error.loginfailed') || 'Login failed');
      }

      const data = await response.json();
      
      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        requires2FA = true;
        userId = data.userId;
        isLoading = false;
        return;
      }
      
      // Store authentication data
      AuthService.storeAuthData(data);
      
      // Call success callback
      onLoginSuccess(data);
    } catch (err) {
      error = err instanceof Error ? err.message : get(_)('error.loginfailed') || 'Login failed';
    } finally {
      isLoading = false;
    }
  }
  
  // Handle 2FA verification
  async function handle2FASubmit(event: Event) {
    event.preventDefault();
    
    if (!twoFactorCode.trim()) {
      error = get(_)('error.entercode') || 'Please enter your 2FA code';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, token: twoFactorCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || get(_)('error.2faverificationfailed') || '2FA verification failed');
      }

      const authData = await response.json();
      
      // Store authentication data
      AuthService.storeAuthData(authData);
      
      // Call success callback
      onLoginSuccess(authData);
    } catch (err) {
      error = err instanceof Error ? err.message : get(_)('error.2faverificationfailed') || '2FA verification failed';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
    {requires2FA ? $_('label.twofactor') : $_('label.logintitle')}
  </h2>
  
  {#if requires2FA}
    <!-- 2FA Verification Form -->
    <form on:submit={handle2FASubmit} class="space-y-4">
      <div>
        <label for="twoFactorCode" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('msg.enterverificationcode')}
        </label>
        <input
          type="text"
          id="twoFactorCode"
          bind:value={twoFactorCode}
          maxlength="6"
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-wider"
          placeholder="000000"
          disabled={isLoading}
          required
        />
        <p class="mt-2 text-sm text-gray-500">
          {$_('msg.backupcodes')}
        </p>
      </div>

      <!-- Error Message -->
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      {/if}

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={isLoading}
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? $_('button.verifying') : $_('button.verify')}
      </button>
      
      <!-- Back Button -->
      <button
        type="button"
        on:click={() => { requires2FA = false; twoFactorCode = ''; error = null; }}
        class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        {$_('button.backtologin')}
      </button>
    </form>
  {:else}
    <!-- Standard Login Form -->
    <form on:submit={handleSubmit} class="space-y-4">
    <!-- Username Field -->
    <div>
      <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
        {$_('label.usrnm')}
      </label>
      <input
        type="text"
        id="username"
        name="username"
        bind:value={formData.username}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={$_('placeholder.username')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Password Field -->
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
        {$_('label.pw')}
      </label>
      <input
        type="password"
        id="password"
        name="password"
        bind:value={formData.password}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={$_('placeholder.password')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Error Message -->
    {#if error}
      <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    {/if}

    <!-- Submit Button -->
    <button
      type="submit"
      disabled={isLoading}
      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? $_('button.loggingin') : $_('button.login')}
    </button>
  </form>

  <!-- Switch to Register -->
  <div class="mt-4 text-center">
    <p class="text-gray-600">
      <button
        type="button"
        on:click={onSwitchToRegister}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        {$_('button.registeracct')}
      </button>
    </p>
  </div>

  <!-- Forgot Username/Password Links -->
  <div class="mt-2 text-center space-y-1">
    <p class="text-sm text-gray-600">
      <button
        type="button"
        on:click={onSwitchToForgotUsername}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        {$_('button.forgotusrnm')}
      </button>
      {' • '}
      <button
        type="button"
        on:click={onSwitchToForgotPassword}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        {$_('button.forgotpw')}
      </button>
    </p>
  </div>
  {/if}
  
  <!-- Language Selection -->
  <div class="mt-2 text-center space-y-1">
    <p class="text-sm text-gray-600">
      <button
        type="button"
        on:click={() => handleLangChange('en')}
        class="text-blue-600 hover:text-blue-800 font-medium mr-2"
      >
        English
      </button>
      <button
        type="button"
        on:click={() => handleLangChange('jp')}
        class="text-blue-600 hover:text-blue-800 font-medium mr-2"
      >
        日本語
      </button>
      <button
        type="button"
        on:click={() => handleLangChange('ko')}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        한국어
      </button>
    </p>
  </div>
</div>
