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
 * 
 * Key Features:
 * - Ball trajectory prediction with configurable accuracy
 * - Adaptive difficulty levels (easy, medium, hard)
 * - Human-like reaction delays and error rates
 * - Strategic positioning and movement
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
  const lastPrediction = useRef<{ x: number; y: number } | null>(null);

  // AI configuration based on difficulty
  const getAIConfig = useCallback((diff: AIDifficulty): AIConfig => {
    const baseConfig = {
      easy: {
        difficulty: 'easy' as const,
        reactionDelay: 150,
        predictionAccuracy: 0.6,
        maxSpeed: 3,
        errorRate: 0.3
      },
      medium: {
        difficulty: 'medium' as const,
        reactionDelay: 80,
        predictionAccuracy: 0.8,
        maxSpeed: 5,
        errorRate: 0.15
      },
      hard: {
        difficulty: 'hard' as const,
        reactionDelay: 30,
        predictionAccuracy: 0.95,
        maxSpeed: 7,
        errorRate: 0.05
      }
    };

    return baseConfig[diff];
  }, []);

  // Adaptive difficulty adjustment
  const getAdaptiveConfig = useCallback((baseConfig: AIConfig): AIConfig => {
    const adaptiveConfig = { ...baseConfig };
    
    // Adjust based on consecutive misses (make AI easier)
    if (consecutiveMisses.current > 3) {
      adaptiveConfig.reactionDelay += 20;
      adaptiveConfig.errorRate += 0.05;
      adaptiveConfig.predictionAccuracy -= 0.05;
    }
    
    // Adjust based on consecutive hits (make AI harder)
    if (consecutiveHits.current > 3) {
      adaptiveConfig.reactionDelay = Math.max(20, adaptiveConfig.reactionDelay - 10);
      adaptiveConfig.errorRate = Math.max(0.02, adaptiveConfig.errorRate - 0.02);
      adaptiveConfig.predictionAccuracy = Math.min(0.98, adaptiveConfig.predictionAccuracy + 0.02);
    }

    return adaptiveConfig;
  }, []);

  useEffect(() => {
    if (!gameState || !gameState.ball || !gameState.rightPaddle) return;

    const now = Date.now();
    const config = getAIConfig(difficulty);
    const adaptiveConfig = getAdaptiveConfig(config);

    // Fast reaction delay
    const actualReactionDelay = 10; // 10ms for responsive AI
    
    // Only move if enough time has passed
    if (now - lastMoveTime.current < actualReactionDelay) {
      return;
    }

    const ball = gameState.ball;
    const aiPaddle = gameState.rightPaddle;
    const paddleHeight = 80;
    const canvasHeight = 400;
    const canvasWidth = 800;

    // Calculate AI paddle center
    const aiPaddleCenter = aiPaddle.y + paddleHeight / 2;
    let targetY = canvasHeight / 2; // Default center position
    let movementDirection = 0;

    // AI Logic: Track the ball intelligently
    if (ball.dx > 0) {
      // Ball is moving towards AI - predict where it will be
      const timeToReachAI = (canvasWidth - ball.x) / ball.dx;
      if (timeToReachAI > 0) {
        // Predict ball Y position when it reaches AI
        let predictedY = ball.y + (ball.dy * timeToReachAI);
        
        // Account for wall bounces
        while (predictedY < 0 || predictedY > canvasHeight) {
          if (predictedY < 0) {
            predictedY = -predictedY;
          } else if (predictedY > canvasHeight) {
            predictedY = 2 * canvasHeight - predictedY;
          }
        }
        
        // Add some prediction error based on difficulty
        const errorRange = (1 - adaptiveConfig.predictionAccuracy) * 50;
        const predictionError = (Math.random() - 0.5) * errorRange;
        predictedY += predictionError;
        
        // Ensure prediction is within paddle reach
        const minY = paddleHeight / 2;
        const maxY = canvasHeight - paddleHeight / 2;
        targetY = Math.max(minY, Math.min(maxY, predictedY));
        
        lastPrediction.current = { x: canvasWidth - 10, y: targetY };
      }
    } else if (ball.dx < 0) {
      // Ball moving away from AI - return to center
      targetY = canvasHeight / 2;
    } else {
      // Ball not moving - stay in center
      targetY = canvasHeight / 2;
    }

    // Calculate movement direction
    const distance = targetY - aiPaddleCenter;
    const threshold = 3; // Small threshold for precise movement

    if (Math.abs(distance) > threshold) {
      movementDirection = distance > 0 ? 1 : -1;
      
      // Add some randomness based on difficulty
      if (Math.random() < adaptiveConfig.errorRate) {
        // AI makes a mistake - move in wrong direction sometimes
        movementDirection = Math.random() > 0.7 ? -movementDirection : movementDirection;
      }
      
      setPaddleMovement('right', movementDirection as -1 | 0 | 1);
    } else {
      // Close enough to target, stop moving
      movementDirection = 0;
      setPaddleMovement('right', 0);
    }

    lastMoveTime.current = now;

    // Update debug info
    if (onDebugInfo) {
      onDebugInfo({
        difficulty,
        prediction: lastPrediction.current,
        currentY: aiPaddleCenter,
        targetY,
        consecutiveMisses: consecutiveMisses.current,
        consecutiveHits: consecutiveHits.current,
        lastMove: now,
        config: adaptiveConfig,
        ballDirection: ball.dx > 0 ? 'right' : ball.dx < 0 ? 'left' : 'none',
        ballPosition: { x: ball.x, y: ball.y },
        shouldMove: Math.abs(distance) > threshold,
        reactionDelay: actualReactionDelay,
        movementDirection,
        distance: Math.abs(distance),
        forceMovement: false
      });
    }
  }, [gameState, difficulty, setPaddleMovement, getAIConfig, getAdaptiveConfig, onDebugInfo]);

  // Track AI performance
  useEffect(() => {
    if (!gameState) return;

    // Check if AI missed the ball
    if (gameState.ball && gameState.ball.x > 800 && gameState.ball.dx > 0) {
      consecutiveMisses.current++;
      consecutiveHits.current = 0;
    }
    
    // Check if AI hit the ball
    if (gameState.ball && gameState.ball.dx < 0 && gameState.ball.x < 750) {
      consecutiveHits.current++;
      consecutiveMisses.current = 0;
    }
  }, [gameState]);

  // Reset counters when game resets
  useEffect(() => {
    if (gameState && gameState.leftScore === 0 && gameState.rightScore === 0) {
      consecutiveMisses.current = 0;
      consecutiveHits.current = 0;
    }
  }, [gameState]);

  return {
    difficulty,
    consecutiveMisses: consecutiveMisses.current,
    consecutiveHits: consecutiveHits.current,
    lastPrediction: lastPrediction.current
  };
};