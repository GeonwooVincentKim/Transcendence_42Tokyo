<script lang="ts">
  import { onMount } from 'svelte';
  import { AuthService } from '../shared/services/authService';

  export let user: any;
  export let onBack: () => void;

  let isEnabled = false;
  let isSettingUp = false;
  let qrCodeUrl = '';
  let secret = '';
  let backupCodes: string[] = [];
  let setupToken = '';
  let isLoading = false;
  let error = '';
  let success = '';

  onMount(() => {
    check2FAStatus();
  });

  async function check2FAStatus() {
    try {
      const response = await fetch('/api/auth/2fa/status', {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        isEnabled = data.enabled;
      }
    } catch (err) {
      error = 'Failed to check 2FA status';
    }
  }

  async function setup2FA() {
    try {
      isLoading = true;
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        qrCodeUrl = data.qrCode;
        secret = data.secret;
        backupCodes = data.backupCodes;
        isSettingUp = true;
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to setup 2FA';
      }
    } catch (err) {
      error = 'Failed to setup 2FA';
    } finally {
      isLoading = false;
    }
  }

  async function enable2FA() {
    if (!setupToken.trim()) return;
    
    try {
      isLoading = true;
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ token: setupToken })
      });
      
      if (response.ok) {
        isEnabled = true;
        isSettingUp = false;
        success = '2FA enabled successfully!';
        setupToken = '';
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to enable 2FA';
      }
    } catch (err) {
      error = 'Failed to enable 2FA';
    } finally {
      isLoading = false;
    }
  }

  async function disable2FA() {
    if (!setupToken.trim()) return;
    
    try {
      isLoading = true;
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ token: setupToken })
      });
      
      if (response.ok) {
        isEnabled = false;
        success = '2FA disabled successfully!';
        setupToken = '';
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to disable 2FA';
      }
    } catch (err) {
      error = 'Failed to disable 2FA';
    } finally {
      isLoading = false;
    }
  }

  async function regenerateBackupCodes() {
    if (!setupToken.trim()) return;
    
    try {
      isLoading = true;
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ token: setupToken })
      });
      
      if (response.ok) {
        const data = await response.json();
        backupCodes = data.backupCodes;
        success = 'Backup codes regenerated!';
        setupToken = '';
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to regenerate backup codes';
      }
    } catch (err) {
      error = 'Failed to regenerate backup codes';
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold">Two-Factor Authentication</h2>
    <button 
      on:click={onBack}
      class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
    >
      Back to Profile
    </button>
  </div>

  {#if error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {success}
    </div>
  {/if}

  <!-- Current Status -->
  <div class="bg-gray-100 p-4 rounded mb-6">
    <h3 class="text-lg font-semibold mb-2">Current Status</h3>
    <div class="flex items-center space-x-2">
      <div class="w-3 h-3 rounded-full {isEnabled ? 'bg-green-500' : 'bg-red-500'}"></div>
      <span class="font-medium">
        {isEnabled ? '2FA is enabled' : '2FA is disabled'}
      </span>
    </div>
  </div>

  {#if !isEnabled && !isSettingUp}
    <!-- Setup 2FA -->
    <div class="bg-blue-50 p-6 rounded mb-6">
      <h3 class="text-lg font-semibold mb-2">Enable Two-Factor Authentication</h3>
      <p class="text-gray-600 mb-4">
        Add an extra layer of security to your account by enabling 2FA. 
        You'll need an authenticator app like Google Authenticator or Authy.
      </p>
      <button 
        on:click={setup2FA}
        disabled={isLoading}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Setting up...' : 'Setup 2FA'}
      </button>
    </div>
  {/if}

  {#if isSettingUp}
    <!-- Setup Instructions -->
    <div class="bg-yellow-50 p-6 rounded mb-6">
      <h3 class="text-lg font-semibold mb-4">Setup Instructions</h3>
      
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold mb-2">1. Scan QR Code</h4>
          <p class="text-sm text-gray-600 mb-2">
            Open your authenticator app and scan this QR code:
          </p>
          {#if qrCodeUrl}
            <div class="flex justify-center">
              <img src={qrCodeUrl} alt="2FA QR Code" class="w-48 h-48 border rounded" />
            </div>
          {/if}
        </div>

        <div>
          <h4 class="font-semibold mb-2">2. Manual Entry (Alternative)</h4>
          <p class="text-sm text-gray-600 mb-2">
            If you can't scan the QR code, enter this secret key manually:
          </p>
          <div class="bg-gray-100 p-2 rounded font-mono text-sm break-all">
            {secret}
          </div>
        </div>

        <div>
          <h4 class="font-semibold mb-2">3. Enter Verification Code</h4>
          <p class="text-sm text-gray-600 mb-2">
            Enter the 6-digit code from your authenticator app:
          </p>
          <div class="flex space-x-2">
            <input 
              type="text" 
              bind:value={setupToken}
              placeholder="123456"
              maxlength="6"
              class="flex-1 px-3 py-2 border rounded"
            />
            <button 
              on:click={enable2FA}
              disabled={isLoading || setupToken.length !== 6}
              class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Enabling...' : 'Enable 2FA'}
            </button>
          </div>
        </div>

        <div>
          <h4 class="font-semibold mb-2">4. Backup Codes</h4>
          <p class="text-sm text-gray-600 mb-2">
            Save these backup codes in a safe place. You can use them if you lose access to your authenticator:
          </p>
          <div class="bg-gray-100 p-3 rounded">
            <div class="grid grid-cols-2 gap-2 text-sm font-mono">
              {#each backupCodes as code}
                <div class="p-2 bg-white rounded border">{code}</div>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}

  {#if isEnabled}
    <!-- 2FA Management -->
    <div class="space-y-6">
      <!-- Disable 2FA -->
      <div class="bg-red-50 p-6 rounded">
        <h3 class="text-lg font-semibold mb-2">Disable 2FA</h3>
        <p class="text-gray-600 mb-4">
          If you want to disable 2FA, enter a code from your authenticator app:
        </p>
        <div class="flex space-x-2">
          <input 
            type="text" 
            bind:value={setupToken}
            placeholder="123456"
            maxlength="6"
            class="flex-1 px-3 py-2 border rounded"
          />
          <button 
            on:click={disable2FA}
            disabled={isLoading || setupToken.length !== 6}
            class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      </div>

      <!-- Regenerate Backup Codes -->
      <div class="bg-yellow-50 p-6 rounded">
        <h3 class="text-lg font-semibold mb-2">Regenerate Backup Codes</h3>
        <p class="text-gray-600 mb-4">
          Generate new backup codes. Your old codes will no longer work:
        </p>
        <div class="flex space-x-2">
          <input 
            type="text" 
            bind:value={setupToken}
            placeholder="123456"
            maxlength="6"
            class="flex-1 px-3 py-2 border rounded"
          />
          <button 
            on:click={regenerateBackupCodes}
            disabled={isLoading || setupToken.length !== 6}
            class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {isLoading ? 'Regenerating...' : 'Regenerate Codes'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
