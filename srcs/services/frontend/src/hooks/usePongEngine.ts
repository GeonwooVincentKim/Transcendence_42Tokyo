import { useState, useRef, useEffect, useCallback } from 'react';
// import { useGameSettings } from '../contexts/GameSettingsContext';

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
 * The core Pong game engine, encapsulated in a custom hook.
 * It handles all game state, physics, and the game loop with enhanced bounce physics.
 */
export const usePongEngine = (
  width: number = GAME_CONFIG.WIDTH, 
  height: number = GAME_CONFIG.HEIGHT,
  onGameEnd?: (winner: 'left' | 'right', leftScore: number, rightScore: number) => void
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'finished'>('ready');
  
  // Use default game settings instead of context
  const defaultSettings = {
    paddleHeight: 80,
    paddleWidth: 15,
    ballSize: 10,
    paddleSpeed: 5,
    ballSpeed: 4,
    winningScore: 5
  };
  
  // Calculate initial positions based on default settings
  const getInitialState = useCallback((): GameState => ({
    leftPaddle: { y: height / 2 - (defaultSettings.paddleHeight / 2) },
    rightPaddle: { y: height / 2 - (defaultSettings.paddleHeight / 2) },
    ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready',
  }), [height, width, defaultSettings.paddleHeight]);

  const [gameState, setGameState] = useState(getInitialState);
  const gameStateRef = useRef(gameState);
  const movementRef = useRef({ left: 0, right: 0 });

  // Update ref when state changes
  gameStateRef.current = gameState;

  /**
   * Handle paddle collision with enhanced physics
   */
  const handlePaddleBounce = useCallback((paddle: { y: number }, state: any) => {
    state.ball.dx *= -1.05;
    const maxSpeed = defaultSettings.ballSpeed * GAME_CONFIG.MAX_BALL_SPEED_MULTIPLIER;
    if (Math.abs(state.ball.dx) > maxSpeed) {
      state.ball.dx = maxSpeed * Math.sign(state.ball.dx);
    }
    
    const paddleCenter = paddle.y + defaultSettings.paddleHeight / 2;
    const relativeImpact = state.ball.y - paddleCenter;
    const normalizedImpact = relativeImpact / (defaultSettings.paddleHeight / 2);
    state.ball.dy = normalizedImpact * GAME_CONFIG.BOUNCE_FACTOR;
  }, [defaultSettings.ballSpeed, defaultSettings.paddleHeight]);

  /**
   * Check if game should end
   */
  const checkGameEnd = useCallback((leftScore: number, rightScore: number) => {
    console.log(`Checking game end: ${leftScore} - ${rightScore}, winning score: ${GAME_CONFIG.WINNING_SCORE}`);
    if (leftScore >= GAME_CONFIG.WINNING_SCORE || rightScore >= GAME_CONFIG.WINNING_SCORE) {
      const winner = leftScore >= GAME_CONFIG.WINNING_SCORE ? 'left' : 'right';
      console.log(`Game ended! Winner: ${winner}, Final score: ${leftScore} - ${rightScore}`);
      setStatus('finished');
      setGameState(prev => ({ ...prev, status: 'finished', winner }));
      
      // Call the game end callback if provided
      if (onGameEnd) {
        console.log('Calling onGameEnd callback...');
        onGameEnd(winner, leftScore, rightScore);
      }
      
      return true;
    }
    return false;
  }, [onGameEnd]);

  /**
   * Reset ball to center with delay
   */
  const resetBall = useCallback((lastScorer: number) => {
    const state = gameStateRef.current;
    state.ball.x = width / 2;
    state.ball.y = height / 2;
    state.ball.dx = 0;
    state.ball.dy = 0;
    setGameState({ ...state });
    
    setTimeout(() => {
      gameStateRef.current.ball.dx = defaultSettings.ballSpeed * lastScorer;
      gameStateRef.current.ball.dy = defaultSettings.ballSpeed * GAME_CONFIG.BALL_VERTICAL_FACTOR;
    }, GAME_CONFIG.BALL_RESTART_DELAY);
  }, [width, height, defaultSettings.ballSpeed]);

  /**
   * Draw the game on canvas
   */
  const drawGame = useCallback((ctx: CanvasRenderingContext2D, state: any) => {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(GAME_CONFIG.PADDLE_WIDTH, state.leftPaddle.y, GAME_CONFIG.PADDLE_WIDTH, defaultSettings.paddleHeight);
    ctx.fillRect(width - GAME_CONFIG.PADDLE_WIDTH * 2, state.rightPaddle.y, GAME_CONFIG.PADDLE_WIDTH, defaultSettings.paddleHeight);
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, defaultSettings.ballSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw center line
    ctx.setLineDash(GAME_CONFIG.CENTER_LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }, [width, height, defaultSettings.paddleHeight, defaultSettings.ballSize]);

  // Main game loop
  useEffect(() => {
    if (status !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastScorer = 1;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const movement = movementRef.current;

      // Update paddle positions
      if (movement.left !== 0) {
        state.leftPaddle.y += movement.left * defaultSettings.paddleSpeed;
      }
      if (movement.right !== 0) {
        state.rightPaddle.y += movement.right * defaultSettings.paddleSpeed;
      }
      
      // Constrain paddles to canvas
      state.leftPaddle.y = Math.max(0, Math.min(state.leftPaddle.y, height - defaultSettings.paddleHeight));
      state.rightPaddle.y = Math.max(0, Math.min(state.rightPaddle.y, height - defaultSettings.paddleHeight));

      // Update ball position
      state.ball.x += state.ball.dx;
      state.ball.y += state.ball.dy;
      
      // Ball wall collision
      if (state.ball.y <= 0 || state.ball.y >= height) {
        state.ball.dy *= -1;
      }

      // Paddle collision detection
      if (state.ball.dx < 0 && 
          state.ball.x <= GAME_CONFIG.PADDLE_COLLISION_LEFT && 
          state.ball.x > GAME_CONFIG.PADDLE_COLLISION_RIGHT && 
          state.ball.y >= state.leftPaddle.y && 
          state.ball.y <= state.leftPaddle.y + defaultSettings.paddleHeight) {
        handlePaddleBounce(state.leftPaddle, state);
      }
      
      if (state.ball.dx > 0 && 
          state.ball.x >= width - GAME_CONFIG.PADDLE_COLLISION_LEFT && 
          state.ball.x < width - GAME_CONFIG.PADDLE_COLLISION_RIGHT && 
          state.ball.y >= state.rightPaddle.y && 
          state.ball.y <= state.rightPaddle.y + defaultSettings.paddleHeight) {
        handlePaddleBounce(state.rightPaddle, state);
      }

      // Scoring
      let scoreChanged = false;
      if (state.ball.x <= 0) {
        state.rightScore++;
        lastScorer = 1;
        scoreChanged = true;
      } else if (state.ball.x >= width) {
        state.leftScore++;
        lastScorer = -1;
        scoreChanged = true;
      }

      // Check if game should end (check every frame, not just when score changes)
      if (checkGameEnd(state.leftScore, state.rightScore)) {
        return; // Stop the game loop if game ended
      }

      if (scoreChanged) {
        resetBall(lastScorer);
      }

      // Draw everything
      drawGame(ctx, state);

      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, width, height, defaultSettings.paddleSpeed, defaultSettings.paddleHeight, defaultSettings.ballSpeed, defaultSettings.ballSize, handlePaddleBounce, resetBall, drawGame, checkGameEnd]);

  // --- PUBLIC API FOR CONTROLLING THE ENGINE ---

  const setPaddleMovement = useCallback((side: 'left' | 'right', direction: -1 | 0 | 1) => {
    movementRef.current[side] = direction;
  }, []);

  const startGame = useCallback(() => {
    console.log('Start game called, current status:', status);
    
    if (status === 'ready') {
      console.log('Starting new game');
      setStatus('playing');
      setTimeout(() => {
        gameStateRef.current.ball.dx = defaultSettings.ballSpeed;
        gameStateRef.current.ball.dy = defaultSettings.ballSpeed * GAME_CONFIG.BALL_VERTICAL_FACTOR;
      }, GAME_CONFIG.BALL_RESTART_DELAY);
    } else if (status === 'paused') {
      console.log('Resuming paused game');
      setStatus('playing');
      // Don't reset ball position, just resume the game
    }
  }, [status, defaultSettings.ballSpeed]);

  const pauseGame = useCallback(() => {
    console.log('Pause game called, current status:', status);
    if (status === 'playing') {
      console.log('Pausing game');
      setStatus('paused');
    }
  }, [status]);

  const resetGame = useCallback(() => {
    setStatus('ready');
    movementRef.current = { left: 0, right: 0 };
    
    const resetState = getInitialState();
    gameStateRef.current = { ...resetState };
    setGameState(resetState);
    
    // Force immediate canvas redraw
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        drawGame(ctx, resetState);
      }
    });
  }, [getInitialState, drawGame]);

  return {
    canvasRef,
    gameState: {
      ...gameState,
      status: status,
    },
    controls: {
      setPaddleMovement,
      start: startGame,
      pause: pauseGame,
      reset: resetGame,
    },
  };
};