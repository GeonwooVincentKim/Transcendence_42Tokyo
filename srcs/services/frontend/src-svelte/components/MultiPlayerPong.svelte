<!--
  Multiplayer Pong game component for tournament matches.
  Handles real-time communication via Socket.IO.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import SocketIOService from '../shared/services/socketIOService';
  import { _ } from 'svelte-i18n';

  export let roomId: string;
  export let playerSide: 'left' | 'right';

  let canvasRef: HTMLCanvasElement;
  let socketService: SocketIOService | null = null;
  let gameState = {
    leftPaddle: { y: 200 },
    rightPaddle: { y: 200 },
    ball: { x: 400, y: 200, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready' as 'ready' | 'playing' | 'paused' | 'finished',
    winner: undefined as 'left' | 'right' | undefined
  };
  let connected = false;
  let keys = new Set<string>();

  onMount(() => {
    // Parse roomId format: "tournament-{id}-match-{matchId}" (e.g., "tournament-72-match-75")
    const match = roomId.match(/tournament-(\d+)-match-(\d+)/);
    if (!match || match.length < 3) {
      console.error('❌ Invalid roomId format:', roomId);
      return;
    }
    
    const tournamentId = match[1];
    const matchId = match[2];
    // Generate unique userId for each connection to avoid conflicts
    const userId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Connecting to Socket.IO server for room:', roomId);
    console.log('🔍 Parsed tournamentId:', tournamentId, 'matchId:', matchId);
    
    socketService = new SocketIOService();

    // Set up event handlers
    socketService.setEventHandlers({
      onConnected: (data) => {
        console.log('Socket.IO connected:', data);
        setConnected(true);
      },
      onDisconnected: () => {
        console.log('Socket.IO disconnected');
        setConnected(false);
      },
      onGameState: (data) => {
        console.log('Received game state:', data);
        setGameState(data);
      },
      onGameStart: () => {
        console.log('Game started!');
        setGameState(prev => ({ ...prev, status: 'playing' }));
      },
      onGameEnd: (data) => {
        console.log('Game ended:', data);
        setGameState(prev => ({ 
          ...prev, 
          status: 'finished', 
          winner: data.winner,
          leftScore: data.leftScore,
          rightScore: data.rightScore
        }));
      },
      onError: (error) => {
        console.error('Socket.IO error:', error);
      }
    });

    // Connect to the room
    socketService.connectToRoom(roomId, userId);

    // Set up keyboard controls
    const handleKeyDown = (event: KeyboardEvent) => {
      keys.add(event.key.toLowerCase());
      handleMovement();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
      handleMovement();
    };

    const handleMovement = () => {
      if (!socketService || !connected) return;

      const movement = getMovementFromKeys();
      if (movement !== 0) {
        socketService.sendPaddleMovement(movement);
      }
    };

    const getMovementFromKeys = () => {
      if (playerSide === 'left') {
        if (keys.has('w') || keys.has('arrowup')) return -1;
        if (keys.has('s') || keys.has('arrowdown')) return 1;
      } else {
        if (keys.has('w') || keys.has('arrowup')) return -1;
        if (keys.has('s') || keys.has('arrowdown')) return 1;
      }
      return 0;
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (socketService) {
        socketService.disconnect();
      }
    };
  });

  onDestroy(() => {
    if (socketService) {
      socketService.disconnect();
    }
  });

  /**
   * Start the game
   */
  const startGame = () => {
    if (socketService && connected) {
      socketService.startGame();
    }
  };

  /**
   * Pause the game
   */
  const pauseGame = () => {
    if (socketService && connected) {
      socketService.pauseGame();
    }
  };

  /**
   * Reset the game
   */
  const resetGame = () => {
    if (socketService && connected) {
      socketService.resetGame();
    }
  };
</script>

<div class="flex flex-col items-center" data-testid="multiplayer-game-container">
  <h2 class="text-2xl mb-4">{$_('label.multiplayer')} - {$_('label.room')}: {roomId}</h2>
  
  <!-- Connection Status -->
  <div class="mb-4 flex items-center space-x-2">
    <div class="w-3 h-3 rounded-full {connected ? 'bg-green-500' : 'bg-red-500'}"></div>
    <span class="text-sm {connected ? 'text-green-600' : 'text-red-600'}">
      {connected ? $_('label.connected') : $_('label.disconnected')}
    </span>
  </div>
  
  <div class="mb-4 flex justify-center space-x-8">
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">{gameState.leftScore}</div>
      <div class="text-sm text-gray-600">
        {playerSide === 'left' ? $_('label.you') : $_('label.opponent')}
      </div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-red-600">{gameState.rightScore}</div>
      <div class="text-sm text-gray-600">
        {playerSide === 'right' ? $_('label.you') : $_('label.opponent')}
      </div>
    </div>
  </div>

  <div class="relative">
    <canvas
      bind:this={canvasRef}
      width={800}
      height={400}
      class="border-2 border-gray-300 rounded-lg bg-black"
    ></canvas>
    
    {#if gameState.status === 'paused'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">{$_('label.paused')}</div>
      </div>
    {/if}
    
    {#if gameState.status === 'finished'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">
          {$_('label.gameover')}! {$_('label.winner')}: {gameState.winner === playerSide ? $_('label.you') : $_('label.opponent')}
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-4 flex space-x-4">
    <button
      on:click={startGame}
      disabled={gameState.status === 'playing' || !connected}
      class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.startgame')}
    </button>
    
    <button
      on:click={pauseGame}
      disabled={gameState.status !== 'playing' || !connected}
      class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.pause')}
    </button>
    
    <button
      on:click={resetGame}
      disabled={!connected}
      class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.reset')}
    </button>
  </div>

  <div class="mt-4 text-sm text-gray-600 text-center">
    <p>{$_('instruction.player')}: {$_('instruction.wskeys')}</p>
    <p>{$_('instruction.space')}: {$_('instruction.startpause')}</p>
  </div>
</div>
