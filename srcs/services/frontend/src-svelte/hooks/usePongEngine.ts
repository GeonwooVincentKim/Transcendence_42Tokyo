/**
 * Svelte version of the Pong game engine
 * Converts React hooks to Svelte-compatible functions
 */

import { writable } from 'svelte/store';

/**
 * Defines the shape of the game's state that components will use for rendering.
 */
export interface GameState {
  leftPaddle: { y: number };
  rightPaddle: { y: number };
  ball: { x: number; y: number; dx: number; dy: number; };
  leftScore: number;
  rightScore: number;
  status: 'ready' | 'playing' | 'paused' | 'finished';
  winner?: 'left' | 'right';
}

/**
 * Game constants and configuration
 */
const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 400,
  PADDLE_WIDTH: 10,
  CENTER_LINE_DASH: [5, 15],
  BALL_RESTART_DELAY: 1000,
  BALL_VERTICAL_FACTOR: 0.6,
  MAX_BALL_SPEED_MULTIPLIER: 2,
  BOUNCE_FACTOR: 6,
  PADDLE_COLLISION_LEFT: 20,
  PADDLE_COLLISION_RIGHT: 10,
  WINNING_SCORE: 10, // Game ends when a player reaches this score
} as const;

/**
 * The core Pong game engine for Svelte
 */
export const usePongEngine = (
  canvasElement: HTMLCanvasElement | null = null,
  width: number = GAME_CONFIG.WIDTH, 
  height: number = GAME_CONFIG.HEIGHT,
  onGameEnd?: (winner: 'left' | 'right', leftScore: number, rightScore: number) => void
) => {
  let canvasRef: HTMLCanvasElement | null = canvasElement;
  let status: 'ready' | 'playing' | 'paused' | 'finished' = 'ready';
  
  // Use default game settings
  const defaultSettings = {
    paddleHeight: 80,
    paddleWidth: 15,
    ballSize: 10,
    ballSpeed: 5,
    paddleSpeed: 8,
  };

  // Game state using Svelte store for reactivity
  const gameState = writable<GameState>({
    leftPaddle: { y: height / 2 - defaultSettings.paddleHeight / 2 },
    rightPaddle: { y: height / 2 - defaultSettings.paddleHeight / 2 },
    ball: { x: width / 2, y: height / 2, dx: defaultSettings.ballSpeed, dy: 0 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready',
  });

  let animationId: number | null = null;
  let lastTime = 0;

  /**
   * Initialize the game engine
   */
  const initialize = () => {
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        // Set up canvas
        canvasRef.width = width;
        canvasRef.height = height;
        // Draw initial state
        gameState.subscribe(state => {
          draw(ctx, state);
          return () => {}; // Return unsubscribe function
        })();
      }
    }
  };

  /**
   * Draw the game
   */
  const draw = (ctx: CanvasRenderingContext2D, currentState: GameState) => {
    // Clear canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    // Draw center line
    ctx.strokeStyle = 'white';
    ctx.setLineDash(GAME_CONFIG.CENTER_LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = 'white';
    ctx.fillRect(10, currentState.leftPaddle.y, defaultSettings.paddleWidth, defaultSettings.paddleHeight);
    ctx.fillRect(width - 20, currentState.rightPaddle.y, defaultSettings.paddleWidth, defaultSettings.paddleHeight);

    // Draw ball
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(currentState.ball.x, currentState.ball.y, defaultSettings.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw scores
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentState.leftScore.toString(), width / 4, 60);
    ctx.fillText(currentState.rightScore.toString(), (3 * width) / 4, 60);
  };

  /**
   * Update game state
   */
  const update = (deltaTime: number, currentState: GameState) => {
    if (currentState.status !== 'playing') return;

    // Create a new state object for updates
    const newState = { ...currentState };
    newState.ball = { ...currentState.ball };
    newState.leftPaddle = { ...currentState.leftPaddle };
    newState.rightPaddle = { ...currentState.rightPaddle };

    // Update ball position
    newState.ball.x += newState.ball.dx;
    newState.ball.y += newState.ball.dy;

    // Ball collision with top/bottom walls
    if (newState.ball.y <= defaultSettings.ballSize / 2 || newState.ball.y >= height - defaultSettings.ballSize / 2) {
      newState.ball.dy = -newState.ball.dy;
    }

    // Ball collision with paddles
    if (newState.ball.x <= GAME_CONFIG.PADDLE_COLLISION_LEFT + defaultSettings.paddleWidth &&
        newState.ball.y >= newState.leftPaddle.y &&
        newState.ball.y <= newState.leftPaddle.y + defaultSettings.paddleHeight) {
      newState.ball.dx = Math.abs(newState.ball.dx);
      newState.ball.dy = (newState.ball.y - (newState.leftPaddle.y + defaultSettings.paddleHeight / 2)) * GAME_CONFIG.BOUNCE_FACTOR / defaultSettings.paddleHeight;
    }

    if (newState.ball.x >= width - GAME_CONFIG.PADDLE_COLLISION_RIGHT - defaultSettings.paddleWidth &&
        newState.ball.y >= newState.rightPaddle.y &&
        newState.ball.y <= newState.rightPaddle.y + defaultSettings.paddleHeight) {
      newState.ball.dx = -Math.abs(newState.ball.dx);
      newState.ball.dy = (newState.ball.y - (newState.rightPaddle.y + defaultSettings.paddleHeight / 2)) * GAME_CONFIG.BOUNCE_FACTOR / defaultSettings.paddleHeight;
    }

    // Ball out of bounds
    if (newState.ball.x < 0) {
      newState.rightScore++;
      resetBall(newState);
    } else if (newState.ball.x > width) {
      newState.leftScore++;
      resetBall(newState);
    }

    // Check for winner
    if (newState.leftScore >= GAME_CONFIG.WINNING_SCORE || newState.rightScore >= GAME_CONFIG.WINNING_SCORE) {
      newState.status = 'finished';
      newState.winner = newState.leftScore >= GAME_CONFIG.WINNING_SCORE ? 'left' : 'right';
      if (onGameEnd) {
        onGameEnd(newState.winner, newState.leftScore, newState.rightScore);
      }
    }

    // Update the store
    gameState.set(newState);
  };

  /**
   * Reset ball to center
   */
  const resetBall = (currentState: GameState) => {
    currentState.ball.x = width / 2;
    currentState.ball.y = height / 2;
    currentState.ball.dx = defaultSettings.ballSpeed * (Math.random() > 0.5 ? 1 : -1);
    currentState.ball.dy = (Math.random() - 0.5) * defaultSettings.ballSpeed * GAME_CONFIG.BALL_VERTICAL_FACTOR;
  };

  // Store current state for game loop
  let currentGameState: GameState;

  // Subscribe to state changes once
  gameState.subscribe(state => {
    currentGameState = state;
  });

  /**
   * Game loop
   */
  const gameLoop = (currentTime: number) => {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    if (currentGameState && currentGameState.status === 'playing') {
      update(deltaTime, currentGameState);
      
      if (canvasRef) {
        const ctx = canvasRef.getContext('2d');
        if (ctx) {
          draw(ctx, currentGameState);
        }
      }

      animationId = requestAnimationFrame(gameLoop);
    }
  };

  /**
   * Start the game
   */
  const startGame = () => {
    if (currentGameState && (currentGameState.status === 'ready' || currentGameState.status === 'paused')) {
      const newState = { ...currentGameState, status: 'playing' as const };
      gameState.set(newState);
      lastTime = performance.now();
      animationId = requestAnimationFrame(gameLoop);
    }
  };

  /**
   * Pause the game
   */
  const pauseGame = () => {
    if (currentGameState && currentGameState.status === 'playing') {
      const newState = { ...currentGameState, status: 'paused' as const };
      gameState.set(newState);
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
  };

  /**
   * Reset the game
   */
  const resetGame = () => {
    const newState: GameState = {
      leftPaddle: { y: height / 2 - defaultSettings.paddleHeight / 2 },
      rightPaddle: { y: height / 2 - defaultSettings.paddleHeight / 2 },
      ball: { x: width / 2, y: height / 2, dx: defaultSettings.ballSpeed, dy: 0 },
      leftScore: 0,
      rightScore: 0,
      status: 'ready',
    };
    
    gameState.set(newState);
    
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Redraw the canvas immediately
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        draw(ctx, newState);
      }
    }
  };

  /**
   * Set paddle movement
   */
  const setPaddleMovement = (side: 'left' | 'right', direction: number) => {
    if (currentGameState && currentGameState.status === 'playing') {
      const newState = { ...currentGameState };
      newState.leftPaddle = { ...currentGameState.leftPaddle };
      newState.rightPaddle = { ...currentGameState.rightPaddle };

      const paddle = side === 'left' ? newState.leftPaddle : newState.rightPaddle;
      paddle.y += direction * defaultSettings.paddleSpeed;
      
      // Keep paddle within bounds
      paddle.y = Math.max(0, Math.min(height - defaultSettings.paddleHeight, paddle.y));
      
      gameState.set(newState);
    }
  };


  /**
   * Handle keyboard events for game control
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Space') {
      event.preventDefault();
      if (currentGameState) {
        if (currentGameState.status === 'ready' || currentGameState.status === 'paused') {
          startGame();
        } else if (currentGameState.status === 'playing') {
          pauseGame();
        }
      }
    }
  };

  // Always add keyboard event listener for space key
  window.addEventListener('keydown', handleKeyDown);
  
  // Initialize if canvas is provided
  if (canvasRef) {
    initialize();
  }

  /**
   * Cleanup function to remove event listeners
   */
  const cleanup = () => {
    window.removeEventListener('keydown', handleKeyDown);
  };

  return {
    gameState,
    controls: {
      startGame,
      pauseGame,
      resetGame,
      setPaddleMovement,
      cleanup
    }
  };
};
