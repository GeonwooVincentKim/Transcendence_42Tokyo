<!--
  Register Form Component (Svelte)
  
  Provides a form for user registration with username, email, and password fields.
  Includes form validation, password confirmation, error handling, and success callbacks.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { RegisterRequest, AuthResponse } from '../shared/types/auth';
  import { onMount } from 'svelte';
  
  // Props
  export let onRegisterSuccess: (authData: AuthResponse) => void;
  export let onSwitchToLogin: () => void;
  
  // State
  let formData: RegisterRequest & { confirmPassword: string } = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
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
      const response = await fetch(`/src-svelte/shared/locales/${currentLanguage}/translations.json`);
      translations = await response.json();
    } catch (err) {
      console.error('Failed to load translations:', err);
      // Fallback to English
      translations = {
        'label.registeracct': 'Create Account',
        'label.usrnm': 'Username',
        'label.email': 'Email',
        'label.pw': 'Password',
        'label.confirmpw': 'Confirm Password',
        'placeholder.newusername': 'Enter your username',
        'placeholder.newemail': 'Enter your email',
        'placeholder.newpw': 'Enter your password',
        'placeholder.newpwcnfm': 'Confirm your password',
        'button.registeracct': 'Create Account',
        'button.login': 'Login',
        'label.returntologin': 'Already have an account?',
        'error.missingfield': 'Please fill in all fields',
        'error.usrnmlen': 'Username must be 3-20 characters',
        'error.invalidemail': 'Please enter a valid email',
        'error.invalidpw': 'Password must be at least 6 characters',
        'error.pwmismatch': 'Passwords do not match',
        'error.regfailed': 'Registration failed'
      };
    }
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
  
  // Validate form data
  function validateForm(): boolean {
    // Check if all fields are filled
    if (!formData.username.trim() || !formData.email.trim() || !formData.password.trim()) {
      error = t('error.missingfield');
      return false;
    }

    // Validate username length
    if (formData.username.length < 3 || formData.username.length > 20) {
      error = t('error.usrnmlen');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      error = t('error.invalidemail');
      return false;
    }

    // Validate password length
    if (formData.password.length < 6) {
      error = t('error.invalidpw');
      return false;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      error = t('error.pwmismatch');
      return false;
    }

    return true;
  }
  
  // Handle form submission
  async function handleSubmit(event: Event) {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    isLoading = true;
    error = null;

    try {
      const { confirmPassword, ...registerData } = formData;
      const authData = await AuthService.register(registerData);
      
      // Store authentication data
      AuthService.storeAuthData(authData);
      
      // Call success callback
      onRegisterSuccess(authData);
    } catch (err) {
      error = err instanceof Error ? err.message : t('error.regfailed');
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
    {t('label.registeracct')}
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
        placeholder={t('placeholder.newusername')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Email Field -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
        {t('label.email')}
      </label>
      <input
        type="email"
        id="email"
        name="email"
        bind:value={formData.email}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={t('placeholder.newemail')}
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
        placeholder={t('placeholder.newpw')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Confirm Password Field -->
    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
        {t('label.confirmpw')}
      </label>
      <input
        type="password"
        id="confirmPassword"
        name="confirmPassword"
        bind:value={formData.confirmPassword}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={t('placeholder.newpwcnfm')}
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
      class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? 'Creating Account...' : t('button.registeracct')}
    </button>
  </form>

  <!-- Switch to Login -->
  <div class="mt-4 text-center">
    <p class="text-gray-600">
      {t('label.returntologin')}{' '}
      <button
        type="button"
        on:click={onSwitchToLogin}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
        {t('button.login')}
      </button>
    </p>
  </div>
</div>
