<script lang="ts">
  import { onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { _, t } from 'svelte-i18n';
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
      error = get(t)('error.check2fastatusfailed');
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
        error = errorData.error || get(t)('error.setup2fafailed');
      }
    } catch (err) {
      error = get(t)('error.setup2fafailed');
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
        success = get(t)('msg.2faenabledsuccess');
        setupToken = '';
      } else {
        const errorData = await response.json();
        error = errorData.error || get(t)('error.enable2fafailed');
      }
    } catch (err) {
      error = get(t)('error.enable2fafailed');
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
        success = get(t)('msg.2fadisabledsuccess');
        setupToken = '';
      } else {
        const errorData = await response.json();
        error = errorData.error || get(t)('error.disable2fafailed');
      }
    } catch (err) {
      error = get(t)('error.disable2fafailed');
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
        success = get(t)('msg.backupcodesregenerated');
        setupToken = '';
      } else {
        const errorData = await response.json();
        error = errorData.error || get(t)('error.regeneratebackupcodesfailed');
      }
    } catch (err) {
      error = get(t)('error.regeneratebackupcodesfailed');
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold">{$_('label.twofactor')}</h2>
    <button 
      on:click={onBack}
      class="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
    >
      {$_('button.backtoprofile')}
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
    <h3 class="text-lg font-semibold mb-2">{$_('label.currentstatus')}</h3>
    <div class="flex items-center space-x-2">
      <div class="w-3 h-3 rounded-full {isEnabled ? 'bg-green-500' : 'bg-red-500'}"></div>
      <span class="font-medium">
        {isEnabled ? $_('label.2faenabled') : $_('label.2fadisabled')}
      </span>
    </div>
  </div>

  {#if !isEnabled && !isSettingUp}
    <!-- Setup 2FA -->
    <div class="bg-blue-50 p-6 rounded mb-6">
      <h3 class="text-lg font-semibold mb-2">{$_('label.enable2fa')}</h3>
      <p class="text-gray-600 mb-4">
        {$_('msg.2fadescription')}
      </p>
      <button 
        on:click={setup2FA}
        disabled={isLoading}
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? $_('button.settingup') : $_('button.setup2fa')}
      </button>
    </div>
  {/if}

  {#if isSettingUp}
    <!-- Setup Instructions -->
    <div class="bg-yellow-50 p-6 rounded mb-6">
      <h3 class="text-lg font-semibold mb-4">{$_('label.setupinstructions')}</h3>
      
      <div class="space-y-4">
        <div>
          <h4 class="font-semibold mb-2">{$_('label.scanqrcode')}</h4>
          <p class="text-sm text-gray-600 mb-2">
            {$_('msg.scanqrcode')}
          </p>
          {#if qrCodeUrl}
            <div class="flex justify-center">
              <img src={qrCodeUrl} alt="2FA QR Code" class="w-48 h-48 border rounded" />
            </div>
          {/if}
        </div>

        <div>
          <h4 class="font-semibold mb-2">{$_('label.manualentry')}</h4>
          <p class="text-sm text-gray-600 mb-2">
            {$_('msg.manualentry')}
          </p>
          <div class="bg-gray-100 p-2 rounded font-mono text-sm break-all">
            {secret}
          </div>
        </div>

        <div>
          <h4 class="font-semibold mb-2">{$_('label.enterverificationcode')}</h4>
          <p class="text-sm text-gray-600 mb-2">
            {$_('msg.enterverificationcode')}
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
              {isLoading ? $_('button.enabling') : $_('button.enable2fa')}
            </button>
          </div>
        </div>

        <div>
          <h4 class="font-semibold mb-2">{$_('label.backupcodes')}</h4>
          <p class="text-sm text-gray-600 mb-2">
            {$_('msg.backupcodes')}
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
        <h3 class="text-lg font-semibold mb-2">{$_('label.disable2fa')}</h3>
        <p class="text-gray-600 mb-4">
          {$_('msg.disable2fa')}
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
            {isLoading ? $_('button.disabling') : $_('button.disable2fa')}
          </button>
        </div>
      </div>

      <!-- Regenerate Backup Codes -->
      <div class="bg-yellow-50 p-6 rounded">
        <h3 class="text-lg font-semibold mb-2">{$_('label.regeneratebackupcodes')}</h3>
        <p class="text-gray-600 mb-4">
          {$_('msg.regeneratebackupcodes')}
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
            {isLoading ? $_('button.regenerating') : $_('button.regeneratecodes')}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
