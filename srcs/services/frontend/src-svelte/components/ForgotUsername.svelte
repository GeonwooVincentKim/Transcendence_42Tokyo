<!--
  ForgotUsername.svelte
  
  Allows users to find their username by entering their email address.
  Provides form validation and error handling.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { _ } from 'svelte-i18n';
  
  export let onBackToLogin: () => void;
  
  let email = '';
  let isLoading = false;
  let error: string | null = null;
  let success: string | null = null;

  /**
   * Handle form submission
   */
  async function handleSubmit(e: Event) {
    e.preventDefault();
    
    if (!email.trim()) {
      error = $_('error.emailmissing');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      error = $_('error.invalidemail');
      return;
    }

    isLoading = true;
    error = null;
    success = null;

    try {
      const username = await AuthService.findUsernameByEmail(email);
      success = `Your username is: ${username}`;
    } catch (err) {
      error = err instanceof Error ? err.message : $_('error.findusrnmfailed');
    } finally {
      isLoading = false;
    }
  }

  /**
   * Handle input change
   */
  function handleInputChange() {
    if (error) error = null;
    if (success) success = null;
  }
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
    {$_('label.findusrnm')}
  </h2>
  
  <form on:submit={handleSubmit} class="space-y-4">
    <!-- Email Field -->
    <div>
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
        {$_('label.email')}
      </label>
      <input
        type="email"
        id="email"
        name="email"
        bind:value={email}
        on:input={handleInputChange}
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={$_('placeholder.newemail')}
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

    <!-- Success Message -->
    {#if success}
      <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
        {success}
      </div>
    {/if}

    <!-- Submit Button -->
    <button
      type="submit"
      disabled={isLoading}
      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? $_('button.findingusrnm') : $_('button.findusrnm')}
    </button>
  </form>

  <!-- Back to Login -->
  <div class="mt-4 text-center">
    <button
      type="button"
      on:click={onBackToLogin}
      class="text-blue-600 hover:text-blue-800 font-medium"
    >
      {$_('button.backtologin')}
    </button>
  </div>
</div>
