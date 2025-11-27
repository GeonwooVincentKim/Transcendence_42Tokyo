<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { _, t } from 'svelte-i18n';
  import { AuthService } from '../shared/services/authService';
  import io from 'socket.io-client';

  export let user: any;
  export let onBack: () => void;

  let socket: any = null;
  let channels: any[] = [];
  let currentChannel: any = null;
  let messages: any[] = [];
  let newMessage = '';
  let newChannelName = '';
  let newChannelPassword = '';
  let isCreatingChannel = false;
  let isLoading = false;
  let error = '';
  let joinPasswordPrompt: { channelId: string; channelName: string } | null = null;
  let joinPassword = '';

  onMount(() => {
    initializeSocket();
    loadChannels();
  });

  onDestroy(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  // Get API base URL dynamically
  function getApiBaseUrl(): string {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    return `${protocol}//${hostname}:8000`;
  }

  function initializeSocket() {
    const socketUrl = getApiBaseUrl();
    
    socket = io(socketUrl, {
      auth: {
        token: AuthService.getToken()
      }
    });

    socket.on('connect', () => {
      console.log('Connected to chat server');
    });

    socket.on('message', (message: any) => {
      messages = [...messages, message];
    });

    socket.on('channel_created', (data: { channel: any }) => {
      console.log('🔔 Socket: channel_created event received:', data.channel);
      // Check if channel already exists to avoid duplicates
      const exists = channels.find(c => c.id === data.channel.id);
      if (!exists) {
        channels = [...channels, data.channel];
        console.log('✅ Added new channel to list. Total channels:', channels.length);
      } else {
        console.log('⚠️ Channel already exists in list, not adding duplicate');
      }
    });

    socket.on('channel_updated', (data: { channel: any }) => {
      console.log('Channel updated:', data.channel);
      // Update existing channel in the list
      channels = channels.map(ch => 
        ch.id === data.channel.id ? data.channel : ch
      );
    });

    socket.on('channel_message', (data: { channelId: string, message: any, timestamp: string }) => {
      console.log('New message received:', data.message);
      // Add message to current channel if it matches
      if (currentChannel && currentChannel.id === data.channelId) {
        messages = [...messages, data.message];
      }
    });

    socket.on('error', (err: any) => {
      error = err.message || 'Socket error';
    });
  }

  async function loadChannels() {
    try {
      isLoading = true;
      const apiUrl = getApiBaseUrl();
      console.log('📡 Loading all channels (public + protected) from:', `${apiUrl}/api/chat/channels/all`);
      
      // Use /api/chat/channels/all to get all public and protected channels
      const response = await fetch(`${apiUrl}/api/chat/channels/all`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        channels = data.channels || [];
        console.log('✅ Loaded channels (public + protected):', channels.length);
      } else {
        console.error('❌ Failed to load channels:', response.status, response.statusText);
      }
    } catch (err) {
      console.error('❌ Error loading channels:', err);
      error = get(t)('error.loadchannelsfailed');
    } finally {
      isLoading = false;
    }
  }

  async function createChannel() {
    if (!newChannelName.trim()) return;
    
    try {
      isLoading = true;
      const apiUrl = getApiBaseUrl();
      console.log('📡 Creating channel:', newChannelName);
      
      const response = await fetch(`${apiUrl}/api/chat/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({
          name: newChannelName,
          type: newChannelPassword ? 'protected' : 'public',
          password: newChannelPassword || undefined
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Channel created:', data.channel);
        // Don't add manually here, let socket.io event handle it to avoid duplicates
        // The channel_created event will add it to the list
        newChannelName = '';
        newChannelPassword = '';
        isCreatingChannel = false;
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to create channel';
        console.error('❌ Failed to create channel:', errorData);
      }
    } catch (err) {
      error = get(t)('error.createchannelfailed');
      console.error('❌ Error creating channel:', err);
    } finally {
      isLoading = false;
    }
  }

  async function joinChannel(channelId: string, password?: string) {
    try {
      const apiUrl = getApiBaseUrl();
      console.log('📡 Joining channel:', channelId, password ? '(with password)' : '(public)');
      
      const response = await fetch(`${apiUrl}/api/chat/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ password: password || undefined })
      });
      
      if (response.ok) {
        console.log('✅ Successfully joined channel');
        joinPasswordPrompt = null;
        joinPassword = '';
        loadChannels();
        loadChannelMessages(channelId);
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to join channel';
        console.error('❌ Failed to join channel:', errorData);
      }
    } catch (err) {
      error = get(t)('error.joinchannelfailed');
      console.error('❌ Error joining channel:', err);
    }
  }
  
  function promptForPassword(channel: any) {
    console.log('🔑 Prompting for password for channel:', channel);
    joinPasswordPrompt = { channelId: channel.id, channelName: channel.name };
    joinPassword = '';
    error = ''; // Clear any previous errors
  }
  
  function cancelPasswordPrompt() {
    joinPasswordPrompt = null;
    joinPassword = '';
  }
  
  function submitJoinPassword() {
    console.log('🔑 Submitting password for channel:', joinPasswordPrompt?.channelId);
    if (joinPasswordPrompt) {
      if (!joinPassword) {
        error = get(t)('error.passwordrequired');
        return;
      }
      joinChannel(joinPasswordPrompt.channelId, joinPassword);
    }
  }

  async function loadChannelMessages(channelId: string) {
    try {
      const apiUrl = getApiBaseUrl();
      console.log('📡 Loading messages for channel:', channelId);
      
      // Clear password prompt when switching channels
      const previousChannel = currentChannel;
      const channel = channels.find(c => c.id === channelId);
      
      // If switching to a different channel, clear password prompt
      if (previousChannel && previousChannel.id !== channelId) {
        joinPasswordPrompt = null;
        joinPassword = '';
      }
      
      const response = await fetch(`${apiUrl}/api/chat/channels/${channelId}/messages`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      console.log('📡 Messages response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        messages = data.messages || [];
        currentChannel = channel;
        // Clear password prompt on successful load
        joinPasswordPrompt = null;
        joinPassword = '';
        console.log('✅ Loaded messages:', messages.length);
      } else if (response.status === 403) {
        // User is not a member, check channel type
        console.log('🔒 Not a member of channel:', channel);
        
        if (channel && channel.type === 'protected') {
          // Prompt for password
          console.log('🔑 Protected channel, prompting for password');
          promptForPassword(channel);
        } else if (channel && channel.type === 'public') {
          // Try to auto-join for public channels
          console.log('📢 Public channel, auto-joining...');
          error = get(t)('msg.tryingtojoin');
          await joinChannel(channelId);
        } else {
          error = get(t)('error.notmember');
        }
      } else {
        const errorData = await response.json();
        error = errorData.error || get(t)('error.loadmessagesfailed');
        console.error('❌ Failed to load messages:', errorData);
      }
    } catch (err) {
      error = get(t)('error.loadmessagesfailed');
      console.error('❌ Error loading messages:', err);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !currentChannel) return;
    
    const messageText = newMessage.trim();
    const tempMessage = {
      id: `temp-${Date.now()}`,
      message: messageText,
      user_id: user?.id || 'unknown',
      username: user?.username || 'unknown',
      created_at: new Date().toISOString(),
      isPending: true
    };
    
    // Clear input immediately for better UX
    newMessage = '';
    
    // Add temporary message to UI immediately
    messages = [...messages, tempMessage];
    
    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/chat/channels/${currentChannel.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ message: messageText })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Remove temp message and add real message (Socket.IO will handle this)
        messages = messages.filter(m => m.id !== tempMessage.id);
      } else {
        // Remove temp message on error
        messages = messages.filter(m => m.id !== tempMessage.id);
        const errorData = await response.json();
        error = errorData.error || 'Failed to send message';
        // Restore message to input on error
        newMessage = messageText;
      }
    } catch (err) {
      // Remove temp message on error
      messages = messages.filter(m => m.id !== tempMessage.id);
      error = get(t)('error.sendmessagefailed');
      // Restore message to input on error
      newMessage = messageText;
    }
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="max-w-6xl mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold">Chat</h2>
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

  <!-- Password Prompt Modal -->
  {#if joinPasswordPrompt}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" on:click={cancelPasswordPrompt}>
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4" on:click|stopPropagation>
        <h3 class="text-xl font-bold text-gray-800 mb-4">🔒 {$_('label.protectedchannel')}</h3>
        <p class="text-gray-600 mb-4">
          {$_('label.enterpassword')} <strong class="text-blue-600">#{joinPasswordPrompt.channelName}</strong>
        </p>
        <input
          type="password"
          bind:value={joinPassword}
          placeholder={$_('placeholder.channelpassword')}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:keypress={(e) => e.key === 'Enter' && submitJoinPassword()}
          autofocus
        />
        {#if error}
          <div class="text-red-600 text-sm mb-3">{error}</div>
        {/if}
        <div class="flex space-x-3">
          <button
            on:click={submitJoinPassword}
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {$_('button.joinchannel')}
          </button>
          <button
            on:click={cancelPasswordPrompt}
            class="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            {$_('button.cancel')}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="flex h-96">
    <!-- Channels Sidebar -->
    <div class="w-1/3 bg-gray-100 rounded-l-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">{$_('label.channels')}</h3>
        <button 
          on:click={() => isCreatingChannel = !isCreatingChannel}
          class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isCreatingChannel ? $_('button.cancel') : $_('button.create')}
        </button>
      </div>

      <!-- Create Channel Form -->
      {#if isCreatingChannel}
        <div class="bg-white p-3 rounded mb-4">
          <input 
            type="text" 
            bind:value={newChannelName}
            placeholder={$_('placeholder.channelname')}
            class="w-full px-3 py-2 border rounded mb-2"
          />
          <input 
            type="password" 
            bind:value={newChannelPassword}
            placeholder={$_('placeholder.channelpassword')}
            class="w-full px-3 py-2 border rounded mb-2"
          />
          <button 
            on:click={createChannel}
            disabled={isLoading}
            class="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? $_('label.creating') : $_('button.createchannel')}
          </button>
        </div>
      {/if}

      <!-- Channels List -->
      <div class="space-y-2">
        {#each channels as channel}
          <div 
            class="p-2 rounded cursor-pointer {currentChannel?.id === channel.id ? 'bg-blue-200' : 'bg-white hover:bg-gray-50'}"
            on:click={() => loadChannelMessages(channel.id)}
          >
            <div class="font-semibold">#{channel.name}</div>
            <div class="text-sm text-gray-500">
              {channel.type === 'public' ? $_('label.public') : channel.type === 'protected' ? $_('label.protected') : $_('label.private')} • {channel.memberCount || 0} {$_('label.members')}
            </div>
          </div>
        {/each}
        
        {#if channels.length === 0}
          <div class="text-center py-4 text-gray-500">
            {$_('msg.nochannels')}
          </div>
        {/if}
      </div>
    </div>

    <!-- Chat Area -->
    <div class="flex-1 bg-white rounded-r-lg flex flex-col">
      {#if currentChannel}
        <!-- Channel Header -->
        <div class="p-4 border-b">
          <h3 class="text-lg font-semibold">#{currentChannel.name}</h3>
          <p class="text-sm text-gray-500">{currentChannel.description || $_('label.nodescription')}</p>
        </div>

        <!-- Messages -->
        <div class="flex-1 p-4 overflow-y-auto">
          <div class="space-y-2">
            {#each messages as message}
              <div class="flex items-start space-x-2 {message.isPending ? 'opacity-60' : ''}">
                <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                  {message.username.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="font-semibold text-sm">{message.username}</span>
                    <span class="text-xs text-gray-500">
                      {message.isPending ? $_('button.sending') : new Date(message.created_at || message.createdAt).toLocaleTimeString()}
                    </span>
                    {#if message.isPending}
                      <span class="text-xs text-blue-500">●</span>
                    {/if}
                  </div>
                  <div class="text-sm">{message.message}</div>
                </div>
              </div>
            {/each}
            
            {#if messages.length === 0}
              <div class="text-center py-8 text-gray-500">
                {$_('msg.nomessages')}
              </div>
            {/if}
          </div>
        </div>

        <!-- Message Input -->
        <div class="p-4 border-t">
          <div class="flex space-x-2">
            <input 
              type="text" 
              bind:value={newMessage}
              on:keypress={handleKeyPress}
              placeholder={$_('placeholder.message')}
              class="flex-1 px-3 py-2 border rounded"
            />
            <button 
              on:click={sendMessage}
              disabled={!newMessage.trim()}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {$_('button.send')}
            </button>
          </div>
        </div>
      {:else}
        <div class="flex-1 flex items-center justify-center text-gray-500">
          {$_('msg.selectchannel')}
        </div>
      {/if}
    </div>
  </div>
</div>
