<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { AuthService } from '../shared/services/authService';
  import io from 'socket.io-client';

  export let user: any;
  export let onBack: () => void;

  let friends: any[] = [];
  let pendingRequests: any[] = [];
  let sentRequests: any[] = [];
  let blockedUsers: any[] = [];
  let isLoading = false;
  let error = '';
  let activeTab: 'friends' | 'requests' | 'blocked' = 'friends';
  let newFriendUsername = '';
  let socket: any = null;

  onMount(() => {
    loadFriends();
    loadPendingRequests();
    loadBlockedUsers();
    initializeSocket();
  });

  onDestroy(() => {
    if (socket) {
      socket.disconnect();
    }
  });

  function initializeSocket() {
    try {
      socket = io('http://localhost:8000', {
        transports: ['websocket', 'polling']
      });

      socket.on('connect', () => {
        console.log('Socket connected for friends list');
        // Notify server that user is online
        if (user?.id) {
          socket.emit('user_online', { userId: user.id });
        }
      });

      socket.on('user_status_changed', (data: { userId: string, status: string }) => {
        console.log('User status changed:', data);
        // Update friend status in real-time
        friends = friends.map(friend => {
          if (friend.id === data.userId) {
            return { ...friend, onlineStatus: data.status };
          }
          return friend;
        });
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }

  async function loadFriends() {
    try {
      isLoading = true;
      const response = await fetch('/api/users/friends', {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        friends = data.friends || [];
      }
    } catch (err) {
      error = 'Failed to load friends';
    } finally {
      isLoading = false;
    }
  }

  async function loadPendingRequests() {
    try {
      const response = await fetch('/api/users/friends/requests', {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        pendingRequests = data.requests || [];
      }
    } catch (err) {
      console.error('Failed to load pending requests:', err);
    }
  }

  async function loadBlockedUsers() {
    try {
      const response = await fetch('/api/users/blocked', {
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        blockedUsers = data.blocked || [];
      }
    } catch (err) {
      console.error('Failed to load blocked users:', err);
    }
  }

  async function sendFriendRequest() {
    if (!newFriendUsername.trim()) return;
    
    try {
      isLoading = true;
      const response = await fetch('/api/users/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ username: newFriendUsername })
      });
      
      if (response.ok) {
        newFriendUsername = '';
        loadPendingRequests();
      } else {
        const errorData = await response.json();
        error = errorData.error || 'Failed to send friend request';
      }
    } catch (err) {
      error = 'Failed to send friend request';
    } finally {
      isLoading = false;
    }
  }

  async function acceptRequest(requestId: string) {
    try {
      const response = await fetch(`/api/users/friends/accept/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        loadFriends();
        loadPendingRequests();
      }
    } catch (err) {
      error = 'Failed to accept request';
    }
  }

  async function rejectRequest(requestId: string) {
    try {
      const response = await fetch(`/api/users/friends/reject/${requestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        loadPendingRequests();
      }
    } catch (err) {
      error = 'Failed to reject request';
    }
  }

  async function removeFriend(friendId: string) {
    try {
      const response = await fetch(`/api/users/friends/${friendId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        loadFriends();
      }
    } catch (err) {
      error = 'Failed to remove friend';
    }
  }

  async function blockUser(username: string) {
    try {
      const response = await fetch('/api/users/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        body: JSON.stringify({ username })
      });
      
      if (response.ok) {
        loadBlockedUsers();
      }
    } catch (err) {
      error = 'Failed to block user';
    }
  }

  async function unblockUser(blockedUserId: string) {
    try {
      const response = await fetch(`/api/users/block/${blockedUserId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${AuthService.getToken()}`
        }
      });
      
      if (response.ok) {
        loadBlockedUsers();
      }
    } catch (err) {
      error = 'Failed to unblock user';
    }
  }
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <h2 class="text-2xl font-bold">Friends</h2>
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

  <!-- Tabs -->
  <div class="flex space-x-1 mb-6">
    <button 
      on:click={() => activeTab = 'friends'}
      class="px-4 py-2 rounded {activeTab === 'friends' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
    >
      Friends ({friends.length})
    </button>
    <button 
      on:click={() => activeTab = 'requests'}
      class="px-4 py-2 rounded {activeTab === 'requests' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
    >
      Requests ({pendingRequests.length})
    </button>
    <button 
      on:click={() => activeTab = 'blocked'}
      class="px-4 py-2 rounded {activeTab === 'blocked' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}"
    >
      Blocked ({blockedUsers.length})
    </button>
  </div>

  <!-- Friends Tab -->
  {#if activeTab === 'friends'}
    <!-- Add Friend -->
    <div class="bg-gray-100 p-4 rounded mb-4">
      <h3 class="text-lg font-semibold mb-2">Add Friend</h3>
      <div class="flex space-x-2">
        <input 
          type="text" 
          bind:value={newFriendUsername}
          placeholder="Enter username"
          class="flex-1 px-3 py-2 border rounded"
        />
        <button 
          on:click={sendFriendRequest}
          disabled={isLoading}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </div>

    <!-- Friends List -->
    <div class="space-y-2">
      {#each friends as friend}
        <div class="flex items-center justify-between p-3 bg-gray-100 rounded">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white">
              {friend.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-semibold">{friend.username}</div>
              <div class="text-sm text-gray-500">
                {friend.onlineStatus === 'online' ? '🟢 Online' : 
                 friend.onlineStatus === 'in_game' ? '🎮 In Game' : 
                 '⚫ Offline'}
              </div>
            </div>
          </div>
          <button 
            on:click={() => removeFriend(friend.id)}
            class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      {/each}
      
      {#if friends.length === 0}
        <div class="text-center py-8 text-gray-500">
          No friends yet. Send a friend request to get started!
        </div>
      {/if}
    </div>
  {/if}

  <!-- Requests Tab -->
  {#if activeTab === 'requests'}
    <div class="space-y-2">
      {#each pendingRequests as request}
        <div class="flex items-center justify-between p-3 bg-yellow-100 rounded">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white">
              {request.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-semibold">{request.username}</div>
              <div class="text-sm text-gray-500">Wants to be friends</div>
            </div>
          </div>
          <div class="flex space-x-2">
            <button 
              on:click={() => acceptRequest(request.id)}
              class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Accept
            </button>
            <button 
              on:click={() => rejectRequest(request.id)}
              class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reject
            </button>
          </div>
        </div>
      {/each}
      
      {#if pendingRequests.length === 0}
        <div class="text-center py-8 text-gray-500">
          No pending friend requests.
        </div>
      {/if}
    </div>
  {/if}

  <!-- Blocked Tab -->
  {#if activeTab === 'blocked'}
    <div class="space-y-2">
      {#each blockedUsers as blocked}
        <div class="flex items-center justify-between p-3 bg-red-100 rounded">
          <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white">
              {blocked.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <div class="font-semibold">{blocked.username}</div>
              <div class="text-sm text-gray-500">Blocked</div>
            </div>
          </div>
          <button 
            on:click={() => unblockUser(blocked.id)}
            class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Unblock
          </button>
        </div>
      {/each}
      
      {#if blockedUsers.length === 0}
        <div class="text-center py-8 text-gray-500">
          No blocked users.
        </div>
      {/if}
    </div>
  {/if}
</div>
