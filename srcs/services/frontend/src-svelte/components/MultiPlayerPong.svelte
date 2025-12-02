<!--
  Multiplayer Pong game component for tournament matches.
  Handles real-time communication via Socket.IO.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import SocketIOService from '../shared/services/socketIOService';
  import { MatchHistoryService } from '../shared/services/matchHistoryService';
  import { _ } from 'svelte-i18n';

  export let roomId: string;
  export let playerSide: 'left' | 'right';
  export let user: any = null; // Add user prop
  export let gameSpeed: 'slow' | 'normal' | 'fast' = 'normal';

  // Internal playerSide that can be updated on reconnection
  let currentPlayerSide: 'left' | 'right' = playerSide;

  // Get speed values based on gameSpeed setting
  function getSpeedValues(gameSpeed: 'slow' | 'normal' | 'fast') {
    switch (gameSpeed) {
      case 'slow':
        return { ballSpeed: 3, paddleSpeed: 5 };
      case 'fast':
        return { ballSpeed: 7, paddleSpeed: 12 };
      case 'normal':
      default:
        return { ballSpeed: 5, paddleSpeed: 8 };
    }
  }

  const speedValues = getSpeedValues(gameSpeed);

  let canvasRef: HTMLCanvasElement;
  let socketService: SocketIOService | null = null;
  let gameState = {
    leftPaddle: { y: 200 },
    rightPaddle: { y: 200 },
    ball: { x: 400, y: 200, dx: speedValues.ballSpeed, dy: speedValues.ballSpeed * 0.6 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready' as 'ready' | 'playing' | 'paused' | 'finished',
    winner: undefined as 'left' | 'right' | undefined
  };
  let connected = false;
  let keys = new Set<string>();
  let gameEndMessage = '';
  let showGameEndMessage = false;
  let errorMessage = '';
  let showErrorMessage = false;
  let isSpectator = false; // Track if this player is a spectator

  const setConnected = (status: boolean) => {
    connected = status;
  };

  const setGameState = (newState: any) => {
    gameState = { ...gameState, ...newState };
    // Redraw canvas when game state changes
    if (canvasRef && newState.gameState) {
      drawGame(newState.gameState);
    }
  };

  // Draw game on canvas
  const drawGame = (gameData: any) => {
    if (!canvasRef) return;
    
    const ctx = canvasRef.getContext('2d');
    if (!ctx) return;

    const width = 800;
    const height = 400;
    const paddleWidth = 15;
    const paddleHeight = 80;
    const ballSize = 10;

    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = 'white';
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = 'white';
    ctx.fillRect(10, gameData.leftPaddle.y, paddleWidth, paddleHeight);
    ctx.fillRect(width - 20, gameData.rightPaddle.y, paddleWidth, paddleHeight);

    // Draw ball
    ctx.beginPath();
    ctx.arc(gameData.ball.x, gameData.ball.y, ballSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw scores
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameData.leftScore.toString(), width / 4, 60);
    ctx.fillText(gameData.rightScore.toString(), (3 * width) / 4, 60);
  };

  onMount(() => {
    // Validate roomId first
    if (!roomId || roomId.trim() === '') {
      console.error('❌ Empty roomId provided');
      return;
    }

    // Parse roomId format: "tournament-{id}-match-{matchId}" (e.g., "tournament-72-match-75") or simple number
    let tournamentId: string;
    let matchId: string;
    
    const tournamentMatch = roomId.match(/tournament-(\d+)-match-(\d+)/);
    if (tournamentMatch && tournamentMatch.length >= 3) {
      tournamentId = tournamentMatch[1];
      matchId = tournamentMatch[2];
      console.log('🔍 Tournament room detected:', roomId);
    } else {
      // Check if roomId is a simple number (for regular multiplayer)
      const simpleRoomMatch = roomId.match(/^\d+$/);
      if (simpleRoomMatch) {
        tournamentId = '0'; // Use 0 for non-tournament rooms
        matchId = roomId; // Use the roomId as matchId
        console.log('🔍 Simple multiplayer room detected:', roomId);
      } else {
        console.error('❌ Invalid roomId format:', roomId);
        console.log('Expected formats: "123" (simple number) or "tournament-{id}-match-{matchId}"');
        errorMessage = `Invalid Room ID format: "${roomId}". Please use a number (e.g., "123") or tournament format (e.g., "tournament-1-match-2")`;
        showErrorMessage = true;
        return;
      }
    }
    
    // Get user ID from authentication or use persistent guest ID
    let userId: string;
    let currentUserId: string; // Store userId for comparison in event handlers
    
    if (user?.id) {
      // Use authenticated user ID
      userId = user.id.toString();
      currentUserId = userId;
      console.log('🔍 Using authenticated user ID:', userId);
    } else {
      // Use persistent guest ID from localStorage
      const guestIdKey = 'pong_guest_id';
      let guestId = localStorage.getItem(guestIdKey);
      if (!guestId) {
        guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(guestIdKey, guestId);
        console.log('🔍 Created new guest ID:', guestId);
      } else {
        console.log('🔍 Using existing guest ID:', guestId);
      }
      userId = guestId;
      currentUserId = userId;
    }
    
    console.log('Connecting to Socket.IO server for room:', roomId);
    console.log('🔍 Parsed tournamentId:', tournamentId, 'matchId:', matchId);
    console.log('🔍 Using userId:', userId);
    console.log('🔍 User info:', user);
    
    // Disconnect any existing connection before creating a new one
    if (socketService) {
      console.log('⚠️ Disconnecting existing socket service before reconnecting');
      socketService.disconnect();
      socketService = null;
    }
    
    socketService = new SocketIOService();

    // Initialize currentPlayerSide from prop
    currentPlayerSide = playerSide;

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
      onGameStateUpdate: (data) => {
        // Game state updates are very frequent (30 FPS), so we don't log them
        // Uncomment the line below for debugging if needed
        // console.log('Received game state update:', data);
        try {
          if (data && data.gameState) {
            setGameState(prev => ({ 
              ...prev,
              leftPaddle: data.gameState.leftPaddle,
              rightPaddle: data.gameState.rightPaddle,
              ball: data.gameState.ball,
              leftScore: data.gameState.leftScore,
              rightScore: data.gameState.rightScore
              // Preserve status if it's already 'playing'
              // This ensures that if the game is playing, status remains 'playing'
            }));
            // Redraw canvas with updated game state
            try {
              if (canvasRef) {
                drawGame(data.gameState);
              }
            } catch (drawError) {
              console.error('Error drawing game state update:', drawError);
              // Continue even if drawing fails
            }
          }
        } catch (error) {
          console.error('Error processing game state update:', error);
          // Don't crash on state update errors
        }
      },
      onGameStart: () => {
        console.log('Game started!');
        setGameState(prev => ({ ...prev, status: 'ready' }));
      },
      onGamePause: () => {
        console.log('Game paused!');
        setGameState(prev => ({ ...prev, status: 'paused' }));
      },
      onGameReset: () => {
        console.log('Game reset!');
        setGameState({
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: speedValues.ballSpeed, dy: speedValues.ballSpeed * 0.6 },
          leftScore: 0,
          rightScore: 0,
          status: 'ready',
          winner: undefined
        });
        // Clear canvas
        if (canvasRef) {
          const ctx = canvasRef.getContext('2d');
          if (ctx) {
            ctx.fillStyle = 'black';
            ctx.fillRect(0, 0, 800, 400);
          }
        }
      },
      onGameEnd: async (data) => {
        console.log('🏁 Game ended:', data);
        
        // Extract game result from the data structure
        const gameResult = data.gameResult || data;
        const winner = gameResult.winner;
        const leftScore = gameResult.leftScore;
        const rightScore = gameResult.rightScore;
        
        setGameState(prev => ({ 
          ...prev, 
          status: 'finished', 
          winner: winner,
          leftScore: leftScore,
          rightScore: rightScore
        }));
        
        // Determine if user won
        const userWon = winner === currentPlayerSide;
        
        // Show game end message based on player's perspective
        if (winner) {
          if (userWon) {
            gameEndMessage = '🎉 Victory! You Won! 🎉';
          } else {
            gameEndMessage = '😞 Defeat! You Lost! 😞';
          }
        } else {
          gameEndMessage = '🤝 Game Ended! 🤝';
        }
        
        showGameEndMessage = true;
        
        // Note: Statistics are updated by backend (updateRegularMultiplayerStatistics or updateUserStatistics)
        // for both regular multiplayer and tournament games, so we don't need to call GameStatsService here
        const isTournament = roomId.includes('tournament');
        if (isTournament) {
          console.log('📊 Tournament match - statistics will be updated by backend');
        } else {
          console.log('📊 Regular multiplayer match - statistics will be updated by backend');
        }
        
        // Save match to localStorage
        try {
          const userScore = currentPlayerSide === 'left' ? leftScore : rightScore;
          const opponentScore = currentPlayerSide === 'left' ? rightScore : leftScore;
          
          // Try to get opponent name from game data or use generic name
          let opponentName = 'Opponent';
          if (data.player1Id && data.player2Id && user) {
            // Determine opponent ID
            const opponentId = currentPlayerSide === 'left' ? data.player2Id : data.player1Id;
            opponentName = `Player ${opponentId}`;
          }
          
          // Calculate approximate game duration (you can improve this by tracking actual time)
          const gameDuration = Math.max(leftScore, rightScore) * 30; // rough estimate: 30 seconds per point
          
          MatchHistoryService.saveMatch({
            opponentName,
            userScore,
            opponentScore,
            result: userWon ? 'win' : 'loss',
            gameMode: roomId.includes('tournament') ? 'tournament' : 'multiplayer',
            duration: gameDuration,
            playerSide: currentPlayerSide
          });
          
          console.log('✅ Match saved to localStorage:', {
            opponentName,
            userScore,
            opponentScore,
            result: userWon ? 'win' : 'loss'
          });
        } catch (error) {
          console.error('❌ Error saving match to localStorage:', error);
        }
        
        // Auto return to main menu after 5 seconds
        setTimeout(() => {
          // Dispatch event to parent component to return to main menu
          const event = new CustomEvent('returnToMain', {
            detail: {
              roomId,
              gameResult: {
                winner: winner,
                leftScore: leftScore,
                rightScore: rightScore,
                playerSide: currentPlayerSide
              }
            }
          });
          window.dispatchEvent(event);
        }, 5000);
      },
      onGamePlaying: (data) => {
        console.log('Game playing:', data);
        if (data.gameState) {
          console.log('Setting game state from game_playing:', data.gameState);
          setGameState({ 
            leftPaddle: data.gameState.leftPaddle,
            rightPaddle: data.gameState.rightPaddle,
            ball: data.gameState.ball,
            leftScore: data.gameState.leftScore,
            rightScore: data.gameState.rightScore,
            status: 'playing',
            winner: undefined
          });
          // Draw the initial game state
          if (canvasRef) {
            drawGame(data.gameState);
          }
        } else {
          // If no gameState provided, just set status to playing
          setGameState(prev => ({ ...prev, status: 'playing' }));
        }
      },
      onError: (error) => {
        console.error('Socket.IO error:', error);
      },
      onPlayerJoined: (data) => {
        console.log('Player joined:', data);
        // IMPORTANT: Only update isSpectator if this event is for the current player
        // Compare as strings to handle both number and string user IDs
        if (String(data.userId) === String(currentUserId)) {
          // This event is for the current player
          if (data.isSpectator || data.playerSide === 'spectator') {
            isSpectator = true;
            console.log('👁️ This player is in spectator mode');
          } else {
            // Ensure we're not in spectator mode if we're a participant
            isSpectator = false;
            console.log('✅ This player is a participant (not spectator)');
          }
          // If this is a reconnection event with playerSide, update currentPlayerSide
          if (data.playerSide && data.playerSide !== 'spectator') {
            console.log('🔍 Updating currentPlayerSide after reconnection:', data.playerSide, '(userId:', data.userId, 'currentUserId:', currentUserId, ')');
            currentPlayerSide = data.playerSide;
          }
        } else {
          // This event is for another player, ignore spectator status
          console.log('🔍 Player joined event for another player:', data.userId, '(current user:', currentUserId, ')');
        }
      },
      onSpectatorMode: (data) => {
        console.log('Spectator mode activated:', data);
        isSpectator = true;
      }
    });

    // Connect to the room
    console.log('🔍 MultiPlayerPong calling connect with:', {
      tournamentId: parseInt(tournamentId),
      matchId: parseInt(matchId),
      userId,
      roomId,
      playerSide,
      playerSideType: typeof playerSide
    });
    console.log('⚠️ IMPORTANT: playerSide being sent to server:', playerSide);
    
    socketService.connect(parseInt(tournamentId), parseInt(matchId), userId, roomId, playerSide, gameSpeed)
      .then(() => {
        console.log('Socket.IO connected successfully');
        setConnected(true);
      })
      .catch(error => {
        console.error('Socket.IO connection error:', error);
      });

    // Set up keyboard controls
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keys.add(key);
      
      // Handle spacebar for pause/resume
      if (key === ' ') {
        event.preventDefault();
        if (gameState.status === 'playing') {
          pauseGame();
        } else if (gameState.status === 'paused') {
          startGame(); // Resume game
        }
        return;
      }
      
      handleMovement();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.key.toLowerCase());
      handleMovement();
    };

    const handleMovement = () => {
      if (!socketService || !connected || gameState.status !== 'playing') return;

      const movement = getMovementFromKeys();
      if (movement !== 0) {
        console.log('Sending paddle movement:', movement);
        socketService.sendPaddleMovement(movement);
      }
    };

    const getMovementFromKeys = () => {
      // Spectators cannot control paddles
      if (isSpectator) {
        return 0;
      }
      // Use currentPlayerSide instead of playerSide prop
      if (currentPlayerSide === 'left') {
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
  
  <!-- Spectator Mode Indicator -->
  {#if isSpectator}
    <div class="mb-4 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
      <div class="flex items-center space-x-2">
        <span class="text-xl">👁️</span>
        <div>
          <div class="font-bold">観戦モード (Spectator Mode)</div>
          <div class="text-sm">この試合の参加者ではありません。観戦のみ可能です。</div>
          <div class="text-sm">You are not a participant in this match. You can only watch.</div>
        </div>
      </div>
    </div>
  {/if}
  
  <div class="mb-4 flex justify-center space-x-8">
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">{gameState.leftScore}</div>
      <div class="text-sm text-gray-600">
        {currentPlayerSide === 'left' ? $_('label.you') : $_('label.opponent')}
      </div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-red-600">{gameState.rightScore}</div>
      <div class="text-sm text-gray-600">
        {currentPlayerSide === 'right' ? $_('label.you') : $_('label.opponent')}
      </div>
    </div>
  </div>

  {#if showErrorMessage}
    <div class="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
      <div class="font-bold">❌ Error</div>
      <div>{errorMessage}</div>
      <button 
        on:click={() => { showErrorMessage = false; window.history.back(); }}
        class="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Back to Main Menu
      </button>
    </div>
  {/if}

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
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 rounded-lg">
        <div class="text-center">
          <div class="text-white text-2xl font-bold mb-2">
            {gameEndMessage}
          </div>
          <div class="text-white text-lg">
            Final Score: {gameState.leftScore} - {gameState.rightScore}
          </div>
          <div class="text-white text-sm mt-2">
            Returning to main menu in 5 seconds...
          </div>
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-4 flex space-x-4">
    <button
      on:click={startGame}
      disabled={isSpectator || gameState.status === 'playing' || gameState.status === 'ready' || !connected}
      class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {gameState.status === 'ready' ? 'Starting...' : $_('button.startgame')}
    </button>
    
    <button
      on:click={pauseGame}
      disabled={isSpectator || !connected || (gameState.status !== 'playing' && gameState.status !== 'paused')}
      class="px-4 py-2 {gameState.status === 'paused' ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'} text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {gameState.status === 'paused' ? $_('button.resume') : $_('button.pause')}
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
