<!--
  Register Form Component (Svelte)
  
  Provides a form for user registration with username, email, and password fields.
  Includes form validation, password confirmation, error handling, and success callbacks.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { RegisterRequest, AuthResponse } from '../shared/types/auth';
  import { _, locale } from 'svelte-i18n';
  
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
      error = $_('error.missingfield');
      return false;
    }

    // Validate username length
    if (formData.username.length < 3 || formData.username.length > 20) {
      error = $_('error.usrnmlen');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      error = $_('error.invalidemail');
      return false;
    }

    // Validate password length
    if (formData.password.length < 6) {
      error = $_('error.invalidpw');
      return false;
    }

    // Check password confirmation
    if (formData.password !== formData.confirmPassword) {
      error = $_('error.pwmismatch');
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
      error = err instanceof Error ? err.message : $_('error.regfailed');
    } finally {
      isLoading = false;
    }
  }
  
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
   {$_('label.registeracct')}
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
        placeholder={$_('placeholder.newusername')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Email Field -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
       {$_('label.email')}
      </label>
      <input
        type="email"
        id="email"
        name="email"
        bind:value={formData.email}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={$_('placeholder.newemail')}
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
        placeholder={$_('placeholder.newpw')}
        disabled={isLoading}
        required
      />
    </div>

    <!-- Confirm Password Field -->
    <div>
      <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">
       {$_('label.confirmpw')}
      </label>
      <input
        type="password"
        id="confirmPassword"
        name="confirmPassword"
        bind:value={formData.confirmPassword}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={$_('placeholder.newpwcnfm')}
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
      {isLoading ? 'Creating Account...' : $_('button.registeracct')}
    </button>
  </form>

  <!-- Switch to Login -->
  <div class="mt-4 text-center">
    <p class="text-gray-600">
     {$_('label.returntologin')}{' '}
      <button
        type="button"
        on:click={onSwitchToLogin}
        class="text-blue-600 hover:text-blue-800 font-medium"
      >
       {$_('button.login')}
      </button>
    </p>
  </div>
</div>
