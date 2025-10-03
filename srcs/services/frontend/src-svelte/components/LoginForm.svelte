<!--
  Login Form Component (Svelte)
  
  Provides a form for user authentication with username and password fields.
  Includes form validation, error handling, and success callbacks.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { LoginRequest, AuthResponse } from '../shared/types/auth';
  import { onMount } from 'svelte';
  
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
  
  // i18n state
  let currentLanguage = 'en';
  let translations: any = {};
  
  // Load translations
  onMount(async () => {
    await loadTranslations();
  });
  
  async function loadTranslations() {
    try {
      const response = await fetch(`/locales/${currentLanguage}/translations.json`);
      translations = await response.json();
    } catch (err) {
      console.error('Failed to load translations:', err);
      // Fallback to English
      translations = {
        'label.logintitle': 'Login to Pong Game',
        'label.usrnm': 'Username',
        'label.pw': 'Password',
        'placeholder.username': 'Enter your username',
        'placeholder.password': 'Enter your password',
        'button.login': 'Login',
        'button.loggingin': 'Logging in...',
        'button.registeracct': "Don't have an account? Register here",
        'button.forgotusrnm': 'Forgot Username?',
        'button.forgotpw': 'Forgot Password?'
      };
    }
  }
  
  // Handle language change
  async function handleLangChange(lang: string) {
    currentLanguage = lang;
    await loadTranslations();
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
  
  // Helper function to get translation
  function t(key: string): string {
    return translations[key] || key;
  }
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
    {t('label.logintitle')}
  </h2>
  
  <form on:submit={handleSubmit} class="space-y-4">
    <!-- Username Field -->
    <div>
      <label for="username" class="block text-sm font-medium text-gray-700 mb-1">
        {t('label.usrnm')}
      </label>
      <input
        type="text"
        id="username"
        name="username"
        bind:value={formData.username}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={t('placeholder.username')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Password Field -->
    <div>
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
        {t('label.pw')}
      </label>
      <input
        type="password"
        id="password"
        name="password"
        bind:value={formData.password}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={t('placeholder.password')}
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
      {isLoading ? t('button.loggingin') : t('button.login')}
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
        {t('button.registeracct')}
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
        {t('button.forgotusrnm')}
      </button>
      {' • '}
      <button
        type="button"
        on:click={onSwitchToForgotPassword}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        {t('button.forgotpw')}
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
