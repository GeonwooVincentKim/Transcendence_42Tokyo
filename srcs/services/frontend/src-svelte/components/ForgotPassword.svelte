<!--
  ForgotPassword.svelte
  
  Allows users to reset their password by entering their email address.
  Provides a two-step process: request reset token and set new password.
-->

<script lang="ts">
  import { AuthService } from '../shared/services/authService';
  import { _ } from 'svelte-i18n';
  
  export let onBackToLogin: () => void;
  
  let email = '';
  let resetToken = '';
  let newPassword = '';
  let confirmPassword = '';
  let step: 'email' | 'reset' = 'email';
  let isLoading = false;
  let error: string | null = null;
  let success: string | null = null;

  /**
   * Handle email submission for password reset request
   */
  async function handleEmailSubmit(e: Event) {
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

    try {
      const { resetToken: token } = await AuthService.requestPasswordReset(email);
      resetToken = token;
      step = 'reset';
      success = $_('msg.pwresetrqsuccess');
    } catch (err) {
      error = err instanceof Error ? err.message : $_('error.pwresetrqfailed');
    } finally {
      isLoading = false;
    }
  }

  /**
   * Handle password reset submission
   */
  async function handleResetSubmit(e: Event) {
    e.preventDefault();
    
    if (!resetToken.trim()) {
      error = $_('error.resettokenmissing');
      return;
    }

    if (!newPassword.trim()) {
      error = $_('error.newpwmissing');
      return;
    }

    if (newPassword.length < 6) {
      error = $_('error.invalidpw');
      return;
    }

    if (newPassword !== confirmPassword) {
      error = $_('error.pwmismatch');
      return;
    }

    isLoading = true;
    error = null;

    try {
      await AuthService.resetPassword(resetToken, newPassword);
      success = $_('msg.pwresetsuccess');
      setTimeout(() => {
        onBackToLogin();
      }, 2000);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('error.pwresetfailed');
    } finally {
      isLoading = false;
    }
  }

  /**
   * Handle input changes
   */
  function handleInputChange() {
    if (error) error = null;
    if (success) success = null;
  }

  /**
   * Go back to email step
   */
  function handleBackToEmail() {
    step = 'email';
    resetToken = '';
    newPassword = '';
    confirmPassword = '';
    error = null;
    success = null;
  }
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <h2 class="text-2xl font-bold text-center text-gray-800 mb-6">
    {$_('label.resetpw')}
  </h2>
  
  {#if step === 'email'}
    <form on:submit={handleEmailSubmit} class="space-y-4">
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

      <!-- Submit Button -->
      <button
        type="submit"
        disabled={isLoading}
        class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? $_('button.sendingresettkn') : $_('button.sendresettkn')}
      </button>
    </form>
  {:else}
    <form on:submit={handleResetSubmit} class="space-y-4">
      <!-- Reset Token Field -->
      <div>
        <label for="resetToken" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('label.resettkn')}
        </label>
        <input
          type="text"
          id="resetToken"
          name="resetToken"
          bind:value={resetToken}
          on:input={handleInputChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={$_('placeholder.resettkn')}
          disabled={isLoading}
          required
        />
      </div>

      <!-- New Password Field -->
      <div>
        <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">
          {$_('label.newpw')}
        </label>
        <input
          type="password"
          id="newPassword"
          name="newPassword"
          bind:value={newPassword}
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
          bind:value={confirmPassword}
          on:input={handleInputChange}
          class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={$_('placeholder.pwcnfm')}
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
        class="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? $_('button.resettingpw') : $_('button.resetpw')}
      </button>

      <!-- Back to Email -->
      <button
        type="button"
        on:click={handleBackToEmail}
        class="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
      >
        {$_('button.backtoemail')}
      </button>
    </form>
  {/if}

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
