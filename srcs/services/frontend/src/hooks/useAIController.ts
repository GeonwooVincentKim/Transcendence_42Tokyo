import { useEffect, useRef, useCallback } from 'react';
import { GameState } from './usePongEngine';

type SetPaddleMovement = (side: 'left' | 'right', direction: -1 | 0 | 1) => void;

/**
 * AI Difficulty Levels
 */
export type AIDifficulty = 'easy' | 'medium' | 'hard';

/**
 * AI Controller Configuration
 */
interface AIConfig {
  difficulty: AIDifficulty;
  reactionDelay: number;
  predictionAccuracy: number;
  maxSpeed: number;
  errorRate: number;
}

/**
 * AI Controller Hook
 * 
 * Provides intelligent AI behavior for the right paddle in Pong games.
 * The AI tracks the ball position and moves the paddle to intercept it.
 */
export const useAIController = (
  setPaddleMovement: SetPaddleMovement, 
  gameState: GameState,
  difficulty: AIDifficulty = 'medium',
  onDebugInfo?: (info: any) => void
) => {
  const lastMoveTime = useRef(0);
  const consecutiveMisses = useRef(0);
  const consecutiveHits = useRef(0);
  const isInitialized = useRef(false);
  const lastDifficulty = useRef(difficulty);
  const lastGameStatus = useRef(gameState.status);
  const animationId = useRef<NodeJS.Timeout | null>(null);

  console.log('AI Controller initialized with:', { difficulty, gameState: gameState.status });

  // AI configuration based on difficulty
  const getAIConfig = useCallback((diff: AIDifficulty): AIConfig => {
    const baseConfig = {
      easy: {
        difficulty: 'easy' as const,
        reactionDelay: 50,
        predictionAccuracy: 0.7,
        maxSpeed: 4,
        errorRate: 0.25
      },
      medium: {
        difficulty: 'medium' as const,
        reactionDelay: 30,
        predictionAccuracy: 0.85,
        maxSpeed: 6,
        errorRate: 0.12
      },
      hard: {
        difficulty: 'hard' as const,
        reactionDelay: 15,
        predictionAccuracy: 0.95,
        maxSpeed: 8,
        errorRate: 0.05
      }
    };

    return baseConfig[diff];
  }, []);

  // Reset AI when difficulty changes
  useEffect(() => {
    if (lastDifficulty.current !== difficulty) {
      console.log('AI: Difficulty changed, resetting', { from: lastDifficulty.current, to: difficulty });
      isInitialized.current = false;
      consecutiveMisses.current = 0;
      consecutiveHits.current = 0;
      lastMoveTime.current = 0;
      lastDifficulty.current = difficulty;
      
      // Force AI paddle to center
      setPaddleMovement('right', 0);
    }
  }, [difficulty, setPaddleMovement]);

  // Reset AI when game status changes
  useEffect(() => {
    if (lastGameStatus.current !== gameState.status) {
      console.log('AI: Game status changed', { from: lastGameStatus.current, to: gameState.status });
      
      if (gameState.status === 'ready') {
        isInitialized.current = false;
        consecutiveMisses.current = 0;
        consecutiveHits.current = 0;
        lastMoveTime.current = 0;
        setPaddleMovement('right', 0);
      }
      
      lastGameStatus.current = gameState.status;
    }
  }, [gameState.status, setPaddleMovement]);

  // Simple AI movement function
  const moveAIPaddle = useCallback(() => {
    if (!gameState.ball || !gameState.rightPaddle) {
      console.log('AI: No ball or paddle available');
      return;
    }

    const ball = gameState.ball;
    const paddle = gameState.rightPaddle;
    const paddleHeight = 100;

    console.log('AI: Processing movement', {
      ballX: ball.x,
      ballY: ball.y,
      ballDx: ball.dx,
      paddleY: paddle.y,
      difficulty
    });

    // Always move towards the ball when it's coming towards AI
    if (ball.dx > 0) {
      const targetY = ball.y - paddleHeight / 2;
      const distance = targetY - paddle.y;
      
      console.log('AI: Ball coming towards AI', {
        targetY,
        distance,
        threshold: 2
      });
      
      // Always move for testing - remove threshold check
      const direction = distance > 0 ? 1 : -1;
      console.log('AI: Setting movement direction', direction, 'distance:', distance);
      setPaddleMovement('right', direction);
      
      // Force immediate update for debugging
      console.log('AI: Movement command sent', { side: 'right', direction });
    } else {
      console.log('AI: Ball moving away, stopping movement');
      setPaddleMovement('right', 0);
    }

    // Update debug info
    if (onDebugInfo) {
      onDebugInfo({
        lastMove: ball.dx > 0 ? (ball.y > paddle.y ? 1 : -1) : 0,
        prediction: null,
        consecutiveMisses: consecutiveMisses.current,
        consecutiveHits: consecutiveHits.current,
        difficulty,
        ballPosition: { x: ball.x, y: ball.y },
        shouldMove: ball.dx > 0,
        reactionDelay: getAIConfig(difficulty).reactionDelay,
        movementDirection: ball.dx > 0 ? (ball.y > paddle.y ? 1 : -1) : 0,
        distance: Math.abs(ball.y - paddle.y),
        forceMovement: ball.x > 600,
        isInitialized: isInitialized.current,
        lastMoveTime: lastMoveTime.current
      });
    }
  }, [gameState.ball, gameState.rightPaddle, setPaddleMovement, difficulty, onDebugInfo, getAIConfig]);

  // Auto-initialization when game starts
  useEffect(() => {
    if (gameState.status === 'playing' && !isInitialized.current) {
      console.log('AI: Game started, initializing');
      isInitialized.current = true;
      consecutiveMisses.current = 0;
      consecutiveHits.current = 0;
      
      // Move AI paddle to center
      setTimeout(() => {
        console.log('AI: Moving to center');
        setPaddleMovement('right', 1);
        setTimeout(() => {
          setPaddleMovement('right', 0);
          console.log('AI: Initialization complete');
        }, 300);
      }, 100);
    }
  }, [gameState.status, setPaddleMovement]);

  // Main AI movement loop - using setInterval for more reliable timing
  useEffect(() => {
    if (gameState.status !== 'playing') {
      console.log('AI: Game not playing, stopping movement');
      setPaddleMovement('right', 0);
      if (animationId.current) {
        clearInterval(animationId.current);
        animationId.current = null;
      }
      return;
    }

    console.log('AI: Starting movement loop');
    const config = getAIConfig(difficulty);
    
    // Use setInterval for more reliable timing
    animationId.current = setInterval(() => {
      const now = Date.now();
      
      if (now - lastMoveTime.current >= config.reactionDelay) {
        console.log('AI: Movement loop tick');
        moveAIPaddle();
        lastMoveTime.current = now;
      }
    }, 16); // 60 FPS

    // Cleanup
    return () => {
      if (animationId.current) {
        clearInterval(animationId.current);
        animationId.current = null;
      }
    };
  }, [gameState.status, difficulty, getAIConfig, moveAIPaddle, setPaddleMovement]);

  // Track AI performance
  useEffect(() => {
    if (!gameState || !gameState.ball) return;

    const ball = gameState.ball;
    const aiPaddle = gameState.rightPaddle;
    
    if (!aiPaddle) return;

    // Check if AI missed the ball
    if (ball.x > 800 && ball.dx > 0) {
      consecutiveMisses.current++;
      consecutiveHits.current = 0;
    }
    
    // Check if AI hit the ball
    if (ball.dx < 0 && ball.x < 750 && ball.x > 720) {
      const paddleTop = aiPaddle.y;
      const paddleBottom = aiPaddle.y + 100;
      const ballY = ball.y;
      
      if (ballY >= paddleTop - 10 && ballY <= paddleBottom + 10) {
        consecutiveHits.current++;
        consecutiveMisses.current = 0;
      }
    }
  }, [gameState]);

  return {
    difficulty,
    consecutiveMisses: consecutiveMisses.current,
    consecutiveHits: consecutiveHits.current,
    isInitialized: isInitialized.current
  };
};