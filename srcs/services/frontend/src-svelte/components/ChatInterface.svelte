<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
  
  // Password modal for protected channels
  let showPasswordModal = false;
  let joiningChannelId = '';
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

  function initializeSocket() {
    const socketUrl = window.location.protocol + '//' + window.location.hostname + ':8000';
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
      console.log('New channel created:', data.channel);
      // Check if channel already exists to avoid duplicates
      const exists = channels.find(c => c.id === data.channel.id);
      if (!exists) {
        channels = [...channels, data.channel];
        console.log('Added new channel to list. Total channels:', channels.length);
      } else {
        console.log('Channel already exists, not adding duplicate');
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
      
      // Load user's channels (channels they've joined)
      const userChannelsResponse = await fetch('/api/chat/channels', {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      // Load all available channels (public + protected for discovery)
      const allChannelsResponse = await fetch('/api/chat/channels/all', {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (userChannelsResponse.ok && allChannelsResponse.ok) {
        const userData = await userChannelsResponse.json();
        const allData = await allChannelsResponse.json();
        
        const userChannels = userData.channels || [];
        const allChannels = allData.channels || [];
        
        // Merge and deduplicate channels by id
        const channelMap = new Map();
        [...userChannels, ...allChannels].forEach(channel => {
          channelMap.set(channel.id, channel);
        });
        
        channels = Array.from(channelMap.values());
        console.log('Loaded channels:', channels.length, 'channels');
      }
    } catch (err) {
      console.error('Failed to load channels:', err);
      error = 'Failed to load channels';
    } finally {
      isLoading = false;
    }
  }

  async function createChannel() {
    if (!newChannelName.trim()) return;
    
    try {
      isLoading = true;
      const response = await fetch('/api/chat/channels', {
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
        channels = [...channels, data.channel];
        newChannelName = '';
        newChannelPassword = '';
        isCreatingChannel = false;
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to create channel';
      }
    } catch (err) {
      error = 'Failed to create channel';
    } finally {
      isLoading = false;
    }
  }

  async function joinChannel(channelId: string, password?: string) {
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ password })
      });
      
      if (response.ok) {
        showPasswordModal = false;
        joinPassword = '';
        loadChannels();
        await loadChannelMessages(channelId);
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to join channel';
      }
    } catch (err) {
      error = 'Failed to join channel';
    }
  }
  
  async function handleChannelClick(channel: any) {
    console.log('🔍 Channel clicked:', channel);
    console.log('🔍 Channel type:', channel.type);
    
    if (channel.type === 'public') {
      // Public channel - can view messages directly
      console.log('✅ Opening public channel directly');
      await loadChannelMessages(channel.id);
    } else if (channel.type === 'protected') {
      // Protected channel - check if member by trying to load messages
      console.log('🔒 Protected channel - checking membership...');
      const canAccess = await tryLoadChannelMessages(channel.id);
      
      if (canAccess) {
        console.log('✅ Already a member, opening channel');
        // Messages already loaded by tryLoadChannelMessages
      } else {
        console.log('🔒 Not a member - showing password modal');
        joiningChannelId = channel.id;
        showPasswordModal = true;
        error = '';
      }
    } else {
      console.log('❌ Cannot access this channel');
      error = 'Cannot access this channel';
    }
  }
  
  async function tryLoadChannelMessages(channelId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/messages`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        messages = data.messages || [];
        currentChannel = channels.find(c => c.id === channelId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
  
  async function joinWithPassword() {
    if (!joinPassword.trim()) {
      error = 'Please enter a password';
      return;
    }
    await joinChannel(joiningChannelId, joinPassword);
  }

  async function loadChannelMessages(channelId: string) {
    try {
      const response = await fetch(`/api/chat/channels/${channelId}/messages`, {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        messages = data.messages || [];
        currentChannel = channels.find(c => c.id === channelId);
      } else if (response.status === 403) {
        // User is not a member, try to auto-join for public channels
        error = 'Not a member of this channel. Trying to join...';
        await joinChannel(channelId);
      }
    } catch (err) {
      error = 'Failed to load messages';
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
      const response = await fetch(`/api/chat/channels/${currentChannel.id}/messages`, {
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
      error = 'Failed to send message';
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

  <!-- Password Modal for Protected Channels -->
  {#if showPasswordModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-xl font-bold mb-4">🔒 Protected Channel</h3>
        <p class="text-gray-600 mb-4">This channel requires a password to join.</p>
        
        <input 
          type="password" 
          bind:value={joinPassword}
          placeholder="Enter channel password"
          class="w-full px-3 py-2 border rounded mb-4"
          on:keypress={(e) => e.key === 'Enter' && joinWithPassword()}
        />
        
        <div class="flex space-x-2">
          <button 
            on:click={joinWithPassword}
            class="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Join Channel
          </button>
          <button 
            on:click={() => { showPasswordModal = false; joinPassword = ''; error = ''; }}
            class="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  {/if}

  <div class="flex h-96">
    <!-- Channels Sidebar -->
    <div class="w-1/3 bg-gray-100 rounded-l-lg p-4">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">Channels</h3>
        <button 
          on:click={() => isCreatingChannel = !isCreatingChannel}
          class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {isCreatingChannel ? 'Cancel' : 'Create'}
        </button>
      </div>

      <!-- Create Channel Form -->
      {#if isCreatingChannel}
        <div class="bg-white p-3 rounded mb-4">
          <input 
            type="text" 
            bind:value={newChannelName}
            placeholder="Channel name"
            class="w-full px-3 py-2 border rounded mb-2"
          />
          <input 
            type="password" 
            bind:value={newChannelPassword}
            placeholder="Password (optional)"
            class="w-full px-3 py-2 border rounded mb-2"
          />
          <button 
            on:click={createChannel}
            disabled={isLoading}
            class="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      {/if}

      <!-- Channels List -->
      <div class="space-y-2">
        {#each channels as channel}
          <div 
            class="p-2 rounded cursor-pointer {currentChannel?.id === channel.id ? 'bg-blue-200' : 'bg-white hover:bg-gray-50'}"
            on:click={() => handleChannelClick(channel)}
          >
            <div class="font-semibold flex items-center">
              {#if channel.type === 'protected'}
                <span class="mr-2">🔒</span>
              {/if}
              #{channel.name}
            </div>
            <div class="text-sm text-gray-500">
              {channel.type} • {channel.memberCount || 0} members
            </div>
          </div>
        {/each}
        
        {#if channels.length === 0}
          <div class="text-center py-4 text-gray-500">
            No channels yet.
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
          <p class="text-sm text-gray-500">{currentChannel.description || 'No description'}</p>
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
                      {message.isPending ? 'Sending...' : new Date(message.created_at || message.createdAt).toLocaleTimeString()}
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
                No messages yet. Start the conversation!
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
              placeholder="Type a message..."
              class="flex-1 px-3 py-2 border rounded"
            />
            <button 
              on:click={sendMessage}
              disabled={!newMessage.trim()}
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      {:else}
        <div class="flex-1 flex items-center justify-center text-gray-500">
          Select a channel to start chatting
        </div>
      {/if}
    </div>
  </div>
</div>
