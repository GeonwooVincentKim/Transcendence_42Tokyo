<!--
  The Player vs. AI Pong game component.
  It assembles the core game engine with one human controller and one AI controller.
  Features advanced AI with difficulty levels and adaptive behavior.
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { GameStatsService } from '../shared/services/gameStatsService';
  import { MatchHistoryService } from '../shared/services/matchHistoryService';
  import { usePongEngine } from '../hooks/usePongEngine';
  import { useHumanController } from '../hooks/useHumanController';
  import { useAIController, type AIDifficulty } from '../hooks/useAIController';
  import { _ } from 'svelte-i18n';

  let canvasRef: HTMLCanvasElement;
  let gameStateStore: any;
  let gameState: any;
  let controls: any;
  
  export let gameSpeed: 'slow' | 'normal' | 'fast' = 'normal';
  let aiDifficulty: AIDifficulty = 'medium';
  let showDebugInfo = false;
  let aiDebugInfo = {
    lastMove: 'none',
    ballDirection: 'left',
    aiPosition: 200,
    targetPosition: 200,
    isMoving: false,
    consecutiveMisses: 0,
    consecutiveHits: 0,
    difficulty: 'medium' as AIDifficulty,
    prediction: null as { x: number; y: number } | null,
    ballPosition: { x: 0, y: 0 },
    shouldMove: false,
    reactionDelay: 80,
    movementDirection: 0,
    distance: 0,
    forceMovement: false
  };

  let gameStartTime = Date.now();

  /**
   * Handle game end
   */
  const handleGameEnd = async (winner: 'left' | 'right', leftScore: number, rightScore: number) => {
    console.log(`AIPong: Game ended! Winner: ${winner}, Score: ${leftScore} - ${rightScore}`);
    try {
      // Save game result (current user is left player vs AI)
      await GameStatsService.saveGameResultSimple(winner, leftScore, rightScore, 'ai', 'left');
      console.log('AI game result saved successfully');
      
      // Save to match history
      const userWon = winner === 'left';
      const gameDuration = Math.floor((Date.now() - gameStartTime) / 1000);
      
      MatchHistoryService.saveMatch({
        opponentName: 'AI',
        userScore: leftScore,
        opponentScore: rightScore,
        result: userWon ? 'win' : 'loss',
        gameMode: 'ai',
        duration: gameDuration || Math.max(leftScore, rightScore) * 30, // fallback estimate
        playerSide: 'left'
      });
      
      console.log('✅ Match saved to match history');
    } catch (error) {
      console.error('Failed to save AI game result:', error);
    }
  };

  let humanController: any;
  let aiController: any;

  onMount(() => {
    // Wait for canvasRef to be properly bound
    const initGame = () => {
      if (canvasRef) {
        // Initialize the core game engine with canvas
        const engine = usePongEngine(canvasRef, 800, 400, handleGameEnd, gameSpeed);
        gameStateStore = engine.gameState;
        controls = engine.controls;
        
        // Subscribe to game state changes
        gameStateStore.subscribe(state => {
          gameState = state;
        });
        
        // Initialize human controller for left paddle
        humanController = useHumanController(controls.setPaddleMovement, 'left');
        humanController.initialize();
        
        // Initialize AI controller for right paddle
        aiController = useAIController(controls.setPaddleMovement, gameStateStore, aiDifficulty, (debugInfo) => {
          aiDebugInfo = debugInfo;
        });
        
        // Initialize AI controller
        if (aiController.initialize) {
          aiController.initialize();
        }
      } else {
        // Retry after a short delay
        setTimeout(initGame, 50);
      }
    };
    
    initGame();
  });

  onDestroy(() => {
    // Cleanup controllers
    if (humanController) {
      humanController.cleanup();
    }
    if (aiController) {
      aiController.cleanup();
    }
  });

  // Watch for game state changes to restart AI
  $: if (gameState?.status === 'playing' && aiController) {
    console.log('Game started, restarting AI');
    if (aiController.startAI) {
      aiController.startAI();
    }
  }

  // Watch for game state changes to stop AI
  $: if (gameState?.status === 'paused' && aiController) {
    console.log('Game paused, stopping AI');
    if (aiController.startAI) {
      aiController.startAI(); // This will stop the AI loop
    }
  }

  /**
   * Handle AI difficulty change
   */
  const handleDifficultyChange = (newDifficulty: AIDifficulty) => {
    aiDifficulty = newDifficulty;
    // Restart AI with new difficulty
    if (controls && gameStateStore) {
      // Clean up existing AI controller
      if (aiController && aiController.cleanup) {
        aiController.cleanup();
      }
      
      // Create new AI controller with new difficulty
      aiController = useAIController(controls.setPaddleMovement, gameStateStore, newDifficulty, (debugInfo) => {
        aiDebugInfo = debugInfo;
      });
      
      // Initialize new AI controller
      if (aiController.initialize) {
        aiController.initialize();
      }
    }
  };
</script>

<div class="flex flex-col items-center" data-testid="ai-game-container">
  <h2 class="text-2xl mb-4">Player vs. AI</h2>
  
  <!-- Difficulty Selection -->
  <div class="mb-4 flex space-x-4">
    <label class="text-sm font-medium text-gray-700">{$_('label.difficulty')}:</label>
    <select
      bind:value={aiDifficulty}
      on:change={() => handleDifficultyChange(aiDifficulty)}
      class="px-3 py-1 border border-gray-300 rounded-md text-sm"
    >
      <option value="easy">{$_('difficulty.easy')}</option>
      <option value="medium">{$_('difficulty.medium')}</option>
      <option value="hard">{$_('difficulty.hard')}</option>
      <option value="expert">{$_('difficulty.expert')}</option>
    </select>
    
    <button
      on:click={() => showDebugInfo = !showDebugInfo}
      class="px-3 py-1 bg-gray-600 text-white rounded-md text-sm hover:bg-gray-700"
    >
      {showDebugInfo ? $_('button.hidedebug') : $_('button.showdebug')}
    </button>
  </div>
  
  <div class="mb-4 flex justify-center space-x-8">
    <div class="text-center">
      <div class="text-2xl font-bold text-blue-600">{gameState?.leftScore || 0}</div>
      <div class="text-sm text-gray-600">{$_('label.player')}</div>
    </div>
    <div class="text-center">
      <div class="text-2xl font-bold text-red-600">{gameState?.rightScore || 0}</div>
      <div class="text-sm text-gray-600">{$_('label.ai')}</div>
    </div>
  </div>

  <div class="relative">
    <canvas
      bind:this={canvasRef}
      width={800}
      height={400}
      class="border-2 border-gray-300 rounded-lg bg-black"
    ></canvas>
    
    {#if gameState?.status === 'paused'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">PAUSED</div>
      </div>
    {/if}
    
    {#if gameState?.status === 'finished'}
      <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
        <div class="text-white text-xl font-bold">
          Game Over! Winner: {gameState?.winner === 'left' ? 'Player' : 'AI'}
        </div>
      </div>
    {/if}
  </div>

  <!-- Debug Info Panel -->
  {#if showDebugInfo}
    <div class="mt-4 p-4 bg-gray-100 rounded-lg text-sm">
      <h3 class="font-bold mb-2">{$_('label.aidebug')}</h3>
      <div class="grid grid-cols-2 gap-2">
        <div><strong>{$_('debug.lastmove')}:</strong> {aiDebugInfo.lastMove}</div>
        <div><strong>{$_('debug.ballpos')}:</strong> ({aiDebugInfo.ballPosition.x}, {aiDebugInfo.ballPosition.y})</div>
        <div><strong>{$_('debug.aipos')}:</strong> {aiDebugInfo.aiPosition}</div>
        <div><strong>{$_('debug.targetpos')}:</strong> {aiDebugInfo.targetPosition}</div>
        <div><strong>{$_('debug.ismoving')}:</strong> {aiDebugInfo.isMoving}</div>
        <div><strong>{$_('debug.distance')}:</strong> {aiDebugInfo.distance}</div>
        <div><strong>{$_('debug.hits')}:</strong> {aiDebugInfo.consecutiveHits}</div>
        <div><strong>{$_('debug.misses')}:</strong> {aiDebugInfo.consecutiveMisses}</div>
      </div>
    </div>
  {/if}

  <div class="mt-4 flex space-x-4">
    <button
      on:click={() => {
        gameStartTime = Date.now();
        controls?.startGame();
      }}
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
    <p>{$_('instruction.player1')}: {$_('instruction.wskeys')}</p>
    <p>{$_('instruction.space')}: {$_('instruction.startpause')}</p>
  </div>

  <!-- Debug Info -->
  <div class="mt-4 text-sm text-gray-400 text-center">
    <p>Controls: {controls ? 'Available' : 'Not Available'}</p>
    <p>Game Status: {gameState?.status || 'Unknown'}</p>
    <p>Pause Button Disabled: {(!controls || gameState?.status !== 'playing') ? 'Yes' : 'No'}</p>
  </div>
</div>
