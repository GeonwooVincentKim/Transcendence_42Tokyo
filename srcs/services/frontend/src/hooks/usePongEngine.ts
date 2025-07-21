import { useState, useRef, useEffect, useCallback } from 'react';

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
 * The core Pong game engine, encapsulated in a custom hook.
 * It handles all game state, physics, and the game loop with enhanced bounce physics.
 */
export const usePongEngine = (width = 800, height = 400) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused'>('ready');
  const [, setTick] = useState(0);

  const gameStateRef = useRef({
    leftPaddle: { y: height / 2 - 50 },
    rightPaddle: { y: height / 2 - 50 },
    ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
    leftScore: 0,
    rightScore: 0,
  });

  const movementRef = useRef({ left: 0, right: 0 });

  useEffect(() => {
    if (status !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const PADDLE_SPEED = 5;
    const PADDLE_HEIGHT = 100;
    const MAX_BALL_SPEED_X = 10;

    let lastScorer = 1;

    const gameLoop = () => {
      const state = gameStateRef.current;
      const movement = movementRef.current;

      // 1. EXECUTE MOVEMENT
      if (movement.left !== 0) state.leftPaddle.y += movement.left * PADDLE_SPEED;
      if (movement.right !== 0) state.rightPaddle.y += movement.right * PADDLE_SPEED;
      state.leftPaddle.y = Math.max(0, Math.min(state.leftPaddle.y, height - PADDLE_HEIGHT));
      state.rightPaddle.y = Math.max(0, Math.min(state.rightPaddle.y, height - PADDLE_HEIGHT));

      // 2. BALL PHYSICS
      state.ball.x += state.ball.dx;
      state.ball.y += state.ball.dy;
      if (state.ball.y <= 0 || state.ball.y >= height) {
        state.ball.dy *= -1;
      }

      // Enhanced Paddle Collision with Randomness and Speed-up
      const handlePaddleBounce = (paddle: { y: number }) => {
        state.ball.dx *= -1.05;
        if (Math.abs(state.ball.dx) > MAX_BALL_SPEED_X) {
          state.ball.dx = MAX_BALL_SPEED_X * Math.sign(state.ball.dx);
        }
        const paddleCenter = paddle.y + PADDLE_HEIGHT / 2;
        const relativeImpact = state.ball.y - paddleCenter;
        const normalizedImpact = relativeImpact / (PADDLE_HEIGHT / 2);
        const BOUNCE_FACTOR = 6;
        state.ball.dy = normalizedImpact * BOUNCE_FACTOR;
      };

      if (state.ball.dx < 0 && state.ball.x <= 20 && state.ball.x > 10 && state.ball.y >= state.leftPaddle.y && state.ball.y <= state.leftPaddle.y + PADDLE_HEIGHT) {
        handlePaddleBounce(state.leftPaddle);
      }
      if (state.ball.dx > 0 && state.ball.x >= width - 20 && state.ball.x < width - 10 && state.ball.y >= state.rightPaddle.y && state.ball.y <= state.rightPaddle.y + PADDLE_HEIGHT) {
        handlePaddleBounce(state.rightPaddle);
      }

      // 3. SCORING
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
        state.ball.x = width / 2;
        state.ball.y = height / 2;
        state.ball.dx = 0;
        state.ball.dy = 0;
        setTick(t => t + 1);
        setTimeout(() => {
          gameStateRef.current.ball.dx = 5 * lastScorer;
          gameStateRef.current.ball.dy = 3;
        }, 1000);
      }

      // 4. DRAWING
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, state.leftPaddle.y, 10, PADDLE_HEIGHT);
      ctx.fillRect(width - 20, state.rightPaddle.y, 10, PADDLE_HEIGHT);
      ctx.beginPath();
      ctx.arc(state.ball.x, state.ball.y, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      animationFrameId = requestAnimationFrame(gameLoop);
    };
    
    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status, width, height]);

  // --- PUBLIC API FOR CONTROLLING THE ENGINE ---

  const setPaddleMovement = useCallback((side: 'left' | 'right', direction: -1 | 0 | 1) => {
    movementRef.current[side] = direction;
  }, []);

  const startGame = useCallback(() => {
    if (status === 'ready') {
      setStatus('playing');
      setTimeout(() => {
           gameStateRef.current.ball.dx = 5;
           gameStateRef.current.ball.dy = 3;
      }, 1000);
    }
  }, [status]);

  const pauseGame = useCallback(() => setStatus('paused'), []);

  const resetGame = useCallback(() => {
    setStatus('ready');
    movementRef.current = { left: 0, right: 0 };
    gameStateRef.current = {
      leftPaddle: { y: height / 2 - 50 },
      rightPaddle: { y: height / 2 - 50 },
      ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
      leftScore: 0,
      rightScore: 0,
    };
    setTick(t => t + 1);
  }, [height, width]);

  return {
    canvasRef,
    gameState: {
      leftPaddle: gameStateRef.current.leftPaddle,
      rightPaddle: gameStateRef.current.rightPaddle,
      ball: gameStateRef.current.ball,
      leftScore: gameStateRef.current.leftScore,
      rightScore: gameStateRef.current.rightScore,
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