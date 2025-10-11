<!--
  Delete Account Component
  
  Handles account deletion with confirmation dialog
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { AuthService } from '../shared/services/authService';
  import { _ } from 'svelte-i18n';

  export let user: any;

  const dispatch = createEventDispatcher();

  let loading = false;
  let error: string | null = null;
  let showConfirmation = false;
  let confirmationText = '';
  let isConfirmed = false;

  // Reactive statement to clear error when checkbox is checked
  $: if (isConfirmed) {
    error = null;
  }

  function handleBack() {
    dispatch('back');
  }

  function handleCancel() {
    showConfirmation = false;
    confirmationText = '';
    isConfirmed = false;
    error = null;
  }

  function handleConfirmDelete() {
    if (confirmationText.toLowerCase() === 'delete' && isConfirmed) {
      deleteAccount();
    } else {
      error = 'Please type "DELETE" and check the confirmation box';
    }
  }

  async function deleteAccount() {
    try {
      loading = true;
      error = null;

      // Call delete account API
      const response = await fetch('/api/auth/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      // Clear auth data and logout
      AuthService.clearAuthData();
      
      // Dispatch success event
      dispatch('deleted');
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete account';
    } finally {
      loading = false;
    }
  }


  function checkConfirmation() {
    if (confirmationText.toLowerCase() === 'delete') {
      error = null;
    }
  }
</script>

<div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
  <div class="text-center mb-6">
    <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
      </svg>
    </div>
    <h2 class="text-2xl font-bold text-gray-800">Delete Account</h2>
    <p class="text-gray-600 mt-2">This action cannot be undone</p>
  </div>

  {#if !showConfirmation}
    <!-- Initial Warning -->
    <div class="space-y-4">
      <div class="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-red-800 mb-2">This action is irreversible</h3>
        <ul class="text-sm text-red-700 space-y-1">
          <li>• Your account: {user?.username || 'Unknown'} ({user?.email || 'No email'})</li>
          <li>• All game data will be permanently deleted</li>
          <li>• All statistics and achievements will be lost</li>
          <li>• This action cannot be undone</li>
        </ul>
      </div>

      <div class="flex space-x-3">
        <button
          on:click={handleBack}
          class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        
        <button
          on:click={() => showConfirmation = true}
          class="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  {:else}
    <!-- Confirmation Step -->
    <div class="space-y-4">
      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      {/if}

      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 class="text-lg font-semibold text-yellow-800 mb-2">Final Confirmation</h3>
        <p class="text-yellow-700 text-sm mb-4">
          Account: {user?.username || 'Unknown'} ({user?.email || 'No email'})
        </p>
        
        <div class="space-y-3">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Type "DELETE" to confirm:
            </label>
            <input
              type="text"
              bind:value={confirmationText}
              on:input={checkConfirmation}
              placeholder="DELETE"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          <div class="flex items-center">
            <input
              type="checkbox"
              id="confirmDelete"
              bind:checked={isConfirmed}
              class="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <label for="confirmDelete" class="ml-2 block text-sm text-gray-700">
              I understand this action cannot be undone
            </label>
          </div>
        </div>
      </div>

      <div class="flex space-x-3">
        <button
          on:click={handleCancel}
          class="flex-1 bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          disabled={loading}
        >
          Cancel
        </button>
        
        <button
          on:click={handleConfirmDelete}
          class="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading || !isConfirmed || confirmationText.toLowerCase() !== 'delete'}
        >
          {#if loading}
            <span class="flex items-center justify-center">
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </span>
          {:else}
            Delete Account
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
