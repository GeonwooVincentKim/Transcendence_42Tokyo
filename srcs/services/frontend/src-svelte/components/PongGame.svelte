<!--
  The Player vs. Player Pong game component.
  It assembles the core game engine with two human-controlled paddle controllers.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GameStatsService } from '../shared/services/gameStatsService';
  import { MatchHistoryService } from '../shared/services/matchHistoryService';
  import { usePongEngine } from '../hooks/usePongEngine';
  import { useHumanController } from '../hooks/useHumanController';
  import { _ } from 'svelte-i18n';

  export let width: number = 800;
  export let height: number = 400;
  export let onGameEnd: ((winner: 'left' | 'right', leftScore: number, rightScore: number) => void) | undefined = undefined;
  export let gameSpeed: 'slow' | 'normal' | 'fast' = 'normal';

  let canvasRef: HTMLCanvasElement;
  let gameStateStore: any;
  let gameState: any;
  let controls: any;
  let gameStartTime: number | null = null;

  /**
   * Handle game end
   */
  const handleGameEnd = async (winner: 'left' | 'right', leftScore: number, rightScore: number) => {
    try {
      // Save game result for both players (assuming current user is left player)
      await GameStatsService.saveGameResultSimple(winner, leftScore, rightScore, 'single', 'left');
      console.log('Game result saved successfully');
      
      // Save to match history
      const userWon = winner === 'left';
      const gameDuration = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 1000) : Math.max(leftScore, rightScore) * 30;
      
      MatchHistoryService.saveMatch({
        opponentName: 'Player 2',
        userScore: leftScore,
        opponentScore: rightScore,
        result: userWon ? 'win' : 'loss',
        gameMode: 'single',
        duration: gameDuration || Math.max(leftScore, rightScore) * 30, // fallback estimate
        playerSide: 'left'
      });
      
      console.log('✅ Match saved to match history');
      
      // Call the onGameEnd callback if provided
      if (onGameEnd) {
        onGameEnd(winner, leftScore, rightScore);
      }
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  };

  let leftController: any;
  let rightController: any;

  onMount(() => {
    // Wait for canvasRef to be properly bound
    const initGame = () => {
      if (canvasRef) {
        // Initialize the core game engine with canvas
        const engine = usePongEngine(canvasRef, width, height, handleGameEnd, gameSpeed);
        gameStateStore = engine.gameState;
        controls = engine.controls;
        
        // Subscribe to game state changes
        gameStateStore.subscribe(state => {
          gameState = state;
        });
        
        // Initialize controllers for both paddles
        leftController = useHumanController(controls.setPaddleMovement, 'left');
        rightController = useHumanController(controls.setPaddleMovement, 'right');
        
        // Initialize the controllers
        leftController.initialize();
        rightController.initialize();
      } else {
        // Retry after a short delay
        setTimeout(initGame, 50);
      }
    };
    
    initGame();
  });

  onDestroy(() => {
    // Cleanup controllers
    if (leftController) {
      leftController.cleanup();
    }
    if (rightController) {
      rightController.cleanup();
    }
    // Cleanup game engine
    if (controls) {
      controls.cleanup();
    }
  });
</script>

<div class="flex flex-col items-center" data-testid="game-container">
  <h2 class="text-2xl mb-4">{$_('label.playervsplayer')}</h2>
  
  <div class="mb-4 flex justify-center space-x-8">
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">{gameState?.leftScore || 0}</div>
      <div class="text-sm text-gray-600">{$_('label.player1')}</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-red-600">{gameState?.rightScore || 0}</div>
      <div class="text-sm text-gray-600">Player 2</div>
    </div>
  </div>

  <div class="relative">
    <canvas
      bind:this={canvasRef}
      width={width}
      height={height}
      class="border-2 border-gray-300 rounded-lg bg-black"
      style="image-rendering: pixelated;"
    ></canvas>
    
    {#if gameState?.status === 'paused'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">PAUSED</div>
      </div>
    {/if}
    
    {#if gameState?.status === 'finished'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">
          Game Over! Winner: {gameState?.winner === 'left' ? 'Player 1' : 'Player 2'}
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-4 flex space-x-4">
    <button
      on:click={() => {
        if (gameState?.status === 'ready') {
          gameStartTime = Date.now();
        }
        console.log('Start clicked, controls:', controls, 'gameState:', gameState);
        controls?.startGame();
      }}
      disabled={!controls || gameState?.status === 'playing'}
      class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.start')}
    </button>
    
    <button
      on:click={() => {
        console.log('Pause clicked, controls:', controls, 'gameState:', gameState);
        controls?.pauseGame();
      }}
      disabled={!controls || gameState?.status !== 'playing'}
      class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.pause')}
    </button>
    
    <button
      on:click={() => {
        console.log('Reset clicked, controls:', controls, 'gameState:', gameState);
        controls?.resetGame();
      }}
      disabled={!controls}
      class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.reset')}
    </button>
  </div>

  <!-- Debug Info -->
  <div class="mt-4 text-sm text-gray-400 text-center">
    <p>Controls: {controls ? 'Available' : 'Not Available'}</p>
    <p>Game Status: {gameState?.status || 'Unknown'}</p>
    <p>Pause Button Disabled: {(!controls || gameState?.status !== 'playing') ? 'Yes' : 'No'}</p>
  </div>

  <div class="mt-4 text-sm text-gray-600 text-center">
    <p>Player 1: Use W/S keys to move up/down</p>
    <p>Player 2: Use Arrow Up/Down keys to move up/down</p>
    <p>Press SPACE to start/pause the game</p>
  </div>
</div>
