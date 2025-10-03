<!--
  The Player vs. Player Pong game component.
  It assembles the core game engine with two human-controlled paddle controllers.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GameStatsService } from '../shared/services/gameStatsService';
  import { usePongEngine } from '../hooks/usePongEngine';
  import { useHumanController } from '../hooks/useHumanController';
  import { _ } from 'svelte-i18n';

  export let width: number = 800;
  export let height: number = 400;
  export let onGameEnd: ((winner: 'left' | 'right', leftScore: number, rightScore: number) => void) | undefined = undefined;

  let canvasRef: HTMLCanvasElement;
  let gameState: any;
  let controls: any;

  /**
   * Handle game end
   */
  const handleGameEnd = async (winner: 'left' | 'right', leftScore: number, rightScore: number) => {
    try {
      // Save game result for both players (assuming current user is left player)
      await GameStatsService.saveGameResultSimple(winner, leftScore, rightScore, 'single', 'left');
      console.log('Game result saved successfully');
      
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
    // Initialize the core game engine with canvas
    const engine = usePongEngine(canvasRef, width, height, handleGameEnd);
    gameState = engine.gameState;
    controls = engine.controls;
    
    // Initialize controllers for both paddles
    leftController = useHumanController(controls.setPaddleMovement, 'left');
    rightController = useHumanController(controls.setPaddleMovement, 'right');
    
    // Initialize the controllers
    leftController.initialize();
    rightController.initialize();
  });

  onDestroy(() => {
    // Cleanup controllers
    if (leftController) {
      leftController.cleanup();
    }
    if (rightController) {
      rightController.cleanup();
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
    
    {#if gameState?.gameStatus === 'paused'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">PAUSED</div>
      </div>
    {/if}
    
    {#if gameState?.gameStatus === 'ended'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">
          Game Over! Winner: {gameState?.winner === 'left' ? 'Player 1' : 'Player 2'}
        </div>
      </div>
    {/if}
  </div>

  <div class="mt-4 flex space-x-4">
    <button
      on:click={() => controls?.startGame()}
      disabled={gameState?.status === 'playing'}
      class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.start')}
    </button>
    
    <button
      on:click={() => controls?.pauseGame()}
      disabled={gameState?.status !== 'playing'}
      class="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {$_('button.pause')}
    </button>
    
    <button
      on:click={() => controls?.resetGame()}
      class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
    >
      {$_('button.reset')}
    </button>
  </div>

  <div class="mt-4 text-sm text-gray-600 text-center">
    <p>Player 1: Use W/S keys to move up/down</p>
    <p>Player 2: Use Arrow Up/Down keys to move up/down</p>
    <p>Press SPACE to start/pause the game</p>
  </div>
</div>
