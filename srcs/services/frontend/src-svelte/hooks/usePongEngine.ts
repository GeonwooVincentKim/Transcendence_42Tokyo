/**
 * Svelte version of the Pong game engine
 * Converts React hooks to Svelte-compatible functions
 */

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

  // Game state
  let gameState: GameState = {
    leftPaddle: { y: height / 2 - defaultSettings.paddleHeight / 2 },
    rightPaddle: { y: height / 2 - defaultSettings.paddleHeight / 2 },
    ball: { x: width / 2, y: height / 2, dx: defaultSettings.ballSpeed, dy: 0 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready',
  };

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
        draw(ctx);
      }
    }
  };

  /**
   * Draw the game
   */
  const draw = (ctx: CanvasRenderingContext2D) => {
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
    ctx.fillRect(10, gameState.leftPaddle.y, defaultSettings.paddleWidth, defaultSettings.paddleHeight);
    ctx.fillRect(width - 20, gameState.rightPaddle.y, defaultSettings.paddleWidth, defaultSettings.paddleHeight);

    // Draw ball
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, defaultSettings.ballSize / 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw scores
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(gameState.leftScore.toString(), width / 4, 60);
    ctx.fillText(gameState.rightScore.toString(), (3 * width) / 4, 60);
  };

  /**
   * Update game state
   */
  const update = (deltaTime: number) => {
    if (gameState.status !== 'playing') return;

    // Update ball position
    gameState.ball.x += gameState.ball.dx;
    gameState.ball.y += gameState.ball.dy;

    // Ball collision with top/bottom walls
    if (gameState.ball.y <= defaultSettings.ballSize / 2 || gameState.ball.y >= height - defaultSettings.ballSize / 2) {
      gameState.ball.dy = -gameState.ball.dy;
    }

    // Ball collision with paddles
    if (gameState.ball.x <= GAME_CONFIG.PADDLE_COLLISION_LEFT + defaultSettings.paddleWidth &&
        gameState.ball.y >= gameState.leftPaddle.y &&
        gameState.ball.y <= gameState.leftPaddle.y + defaultSettings.paddleHeight) {
      gameState.ball.dx = Math.abs(gameState.ball.dx);
      gameState.ball.dy = (gameState.ball.y - (gameState.leftPaddle.y + defaultSettings.paddleHeight / 2)) * GAME_CONFIG.BOUNCE_FACTOR / defaultSettings.paddleHeight;
    }

    if (gameState.ball.x >= width - GAME_CONFIG.PADDLE_COLLISION_RIGHT - defaultSettings.paddleWidth &&
        gameState.ball.y >= gameState.rightPaddle.y &&
        gameState.ball.y <= gameState.rightPaddle.y + defaultSettings.paddleHeight) {
      gameState.ball.dx = -Math.abs(gameState.ball.dx);
      gameState.ball.dy = (gameState.ball.y - (gameState.rightPaddle.y + defaultSettings.paddleHeight / 2)) * GAME_CONFIG.BOUNCE_FACTOR / defaultSettings.paddleHeight;
    }

    // Ball out of bounds
    if (gameState.ball.x < 0) {
      gameState.rightScore++;
      resetBall();
    } else if (gameState.ball.x > width) {
      gameState.leftScore++;
      resetBall();
    }

    // Check for winner
    if (gameState.leftScore >= GAME_CONFIG.WINNING_SCORE || gameState.rightScore >= GAME_CONFIG.WINNING_SCORE) {
      gameState.status = 'finished';
      gameState.winner = gameState.leftScore >= GAME_CONFIG.WINNING_SCORE ? 'left' : 'right';
      if (onGameEnd) {
        onGameEnd(gameState.winner, gameState.leftScore, gameState.rightScore);
      }
    }
  };

  /**
   * Reset ball to center
   */
  const resetBall = () => {
    gameState.ball.x = width / 2;
    gameState.ball.y = height / 2;
    gameState.ball.dx = defaultSettings.ballSpeed * (Math.random() > 0.5 ? 1 : -1);
    gameState.ball.dy = (Math.random() - 0.5) * defaultSettings.ballSpeed * GAME_CONFIG.BALL_VERTICAL_FACTOR;
  };

  /**
   * Game loop
   */
  const gameLoop = (currentTime: number) => {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;

    update(deltaTime);

    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }

    if (gameState.status === 'playing') {
      animationId = requestAnimationFrame(gameLoop);
    }
  };

  /**
   * Start the game
   */
  const startGame = () => {
    if (gameState.status === 'ready' || gameState.status === 'paused') {
      gameState.status = 'playing';
      lastTime = performance.now();
      animationId = requestAnimationFrame(gameLoop);
    }
  };

  /**
   * Pause the game
   */
  const pauseGame = () => {
    if (gameState.status === 'playing') {
      gameState.status = 'paused';
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
    gameState.status = 'ready';
    gameState.leftScore = 0;
    gameState.rightScore = 0;
    gameState.winner = undefined;
    
    // Reset paddles to center position
    gameState.leftPaddle.y = height / 2 - defaultSettings.paddleHeight / 2;
    gameState.rightPaddle.y = height / 2 - defaultSettings.paddleHeight / 2;
    
    resetBall();
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Redraw the canvas immediately
    if (canvasRef) {
      const ctx = canvasRef.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }
  };

  /**
   * Set paddle movement
   */
  const setPaddleMovement = (side: 'left' | 'right', direction: number) => {
    if (gameState.status !== 'playing') return;

    const paddle = side === 'left' ? gameState.leftPaddle : gameState.rightPaddle;
    paddle.y += direction * defaultSettings.paddleSpeed;
    
    // Keep paddle within bounds
    paddle.y = Math.max(0, Math.min(height - defaultSettings.paddleHeight, paddle.y));
  };

  // Initialize if canvas is provided
  if (canvasRef) {
    initialize();
  }

  return {
    gameState,
    controls: {
      startGame,
      pauseGame,
      resetGame,
      setPaddleMovement,
    }
  };
};
