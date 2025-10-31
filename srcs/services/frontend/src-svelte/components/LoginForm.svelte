<!--
  Login Form Component (Svelte)
  
  Provides a form for user authentication with username and password fields.
  Includes form validation, error handling, and success callbacks.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { LoginRequest, AuthResponse } from '../shared/types/auth';
  import { _, locale } from 'svelte-i18n';
  
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
  
  // Handle language change
  async function handleLangChange(lang: string) {
	locale.set(lang);
	const titleLabel = document.getElementById("title");
	const subtitleLabel = document.getElementById("subtitle");
	const loginTitleLabel = document.getElementById("logintitle");
	const usernameLabel = document.getElementById("usernameLabel");
	const passwordLabel = document.getElementById("passwordLabel");
	const submitButton = document.getElementById("submitButton");
	const registerButton = document.getElementById("registerButton");
	const forgotusrnmButton = document.getElementById("forgotusrnmButton");
	const forgotpwButton = document.getElementById("forgotpwButton");
	if (titleLabel)
		titleLabel.innerHTML = $_('label.title');
	if (subtitleLabel)
		subtitleLabel.innerHTML = $_('label.signintoplay');
	if (loginTitleLabel)
		loginTitleLabel.innerHTML = $_('label.logintitle');
	if (usernameLabel)
		usernameLabel.innerHTML = $_('label.usrnm');
	if (passwordLabel)
		passwordLabel.innerHTML = $_('label.pw');
	if (submitButton)
		submitButton.innerHTML = $_('button.login');
	if (registerButton)
		registerButton.innerHTML = $_('button.registeracct');
	if (forgotusrnmButton)
		forgotusrnmButton.innerHTML = $_('button.forgotusrnm');
	if (forgotpwButton)
		forgotpwButton.innerHTML = $_('button.forgotpw');
  }

  locale.subscribe((lng) => handleLangChange(lng))
  
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
      error = 'Please fill in all fields';
      return;
    }
    
    isLoading = true;
    error = null;
    
    try {
      const authData = await AuthService.login(formData);
      
      // Store authentication data
      AuthService.storeAuthData(authData);
      
      // Call success callback
      onLoginSuccess(authData);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Login failed';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
    {$_('label.logintitle')}
  </h2>
  
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
