import { useState, useRef, useEffect, useCallback } from 'react';
import { useGameSettings } from '../contexts/GameSettingsContext';

/**
 * Defines the shape of the game's state that components will use for rendering.
 */
export interface GameState {
  leftPaddle: { y: number };
  rightPaddle: { y: number };
  ball: { x: number; y: number; dx: number; dy: number; };
  leftScore: number;
  rightScore: number;
  status: 'ready' | 'playing' | 'paused';
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
} as const;

/**
 * The core Pong game engine, encapsulated in a custom hook.
 * It handles all game state, physics, and the game loop with enhanced bounce physics.
 */
export const usePongEngine = (width: number = GAME_CONFIG.WIDTH, height: number = GAME_CONFIG.HEIGHT) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused'>('ready');
  const { settings } = useGameSettings();
  
  // Calculate initial positions based on settings
  const getInitialState = useCallback(() => ({
    leftPaddle: { y: height / 2 - (settings.paddleHeight / 2) },
    rightPaddle: { y: height / 2 - (settings.paddleHeight / 2) },
    ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
    leftScore: 0,
    rightScore: 0,
  }), [height, width, settings.paddleHeight]);

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
    const maxSpeed = settings.ballSpeed * GAME_CONFIG.MAX_BALL_SPEED_MULTIPLIER;
    if (Math.abs(state.ball.dx) > maxSpeed) {
      state.ball.dx = maxSpeed * Math.sign(state.ball.dx);
    }
    
    const paddleCenter = paddle.y + settings.paddleHeight / 2;
    const relativeImpact = state.ball.y - paddleCenter;
    const normalizedImpact = relativeImpact / (settings.paddleHeight / 2);
    state.ball.dy = normalizedImpact * GAME_CONFIG.BOUNCE_FACTOR;
  }, [settings.ballSpeed, settings.paddleHeight]);

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
      gameStateRef.current.ball.dx = settings.ballSpeed * lastScorer;
      gameStateRef.current.ball.dy = settings.ballSpeed * GAME_CONFIG.BALL_VERTICAL_FACTOR;
    }, GAME_CONFIG.BALL_RESTART_DELAY);
  }, [width, height, settings.ballSpeed]);

  /**
   * Draw the game on canvas
   */
  const drawGame = useCallback((ctx: CanvasRenderingContext2D, state: any) => {
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    
    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(GAME_CONFIG.PADDLE_WIDTH, state.leftPaddle.y, GAME_CONFIG.PADDLE_WIDTH, settings.paddleHeight);
    ctx.fillRect(width - GAME_CONFIG.PADDLE_WIDTH * 2, state.rightPaddle.y, GAME_CONFIG.PADDLE_WIDTH, settings.paddleHeight);
    
    // Draw ball
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, settings.ballSize, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw center line
    ctx.setLineDash(GAME_CONFIG.CENTER_LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  }, [width, height, settings.paddleHeight, settings.ballSize]);

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
        state.leftPaddle.y += movement.left * settings.paddleSpeed;
      }
      if (movement.right !== 0) {
        state.rightPaddle.y += movement.right * settings.paddleSpeed;
      }
      
      // Constrain paddles to canvas
      state.leftPaddle.y = Math.max(0, Math.min(state.leftPaddle.y, height - settings.paddleHeight));
      state.rightPaddle.y = Math.max(0, Math.min(state.rightPaddle.y, height - settings.paddleHeight));

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
          state.ball.y <= state.leftPaddle.y + settings.paddleHeight) {
        handlePaddleBounce(state.leftPaddle, state);
      }
      
      if (state.ball.dx > 0 && 
          state.ball.x >= width - GAME_CONFIG.PADDLE_COLLISION_LEFT && 
          state.ball.x < width - GAME_CONFIG.PADDLE_COLLISION_RIGHT && 
          state.ball.y >= state.rightPaddle.y && 
          state.ball.y <= state.rightPaddle.y + settings.paddleHeight) {
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

      if (scoreChanged) {
        resetBall(lastScorer);
      }

      // Draw everything
      drawGame(ctx, state);

      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, width, height, settings.paddleSpeed, settings.paddleHeight, settings.ballSpeed, settings.ballSize, handlePaddleBounce, resetBall, drawGame]);

  // --- PUBLIC API FOR CONTROLLING THE ENGINE ---

  const setPaddleMovement = useCallback((side: 'left' | 'right', direction: -1 | 0 | 1) => {
    movementRef.current[side] = direction;
  }, []);

  const startGame = useCallback(() => {
    if (status === 'ready') {
      setStatus('playing');
      setTimeout(() => {
        gameStateRef.current.ball.dx = settings.ballSpeed;
        gameStateRef.current.ball.dy = settings.ballSpeed * GAME_CONFIG.BALL_VERTICAL_FACTOR;
      }, GAME_CONFIG.BALL_RESTART_DELAY);
    }
  }, [status, settings.ballSpeed]);

  const pauseGame = useCallback(() => setStatus('paused'), []);

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