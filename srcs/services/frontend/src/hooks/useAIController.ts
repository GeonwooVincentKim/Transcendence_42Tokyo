import { useEffect, useRef } from 'react';
import { GameState } from './usePongEngine';

type SetPaddleMovement = (side: 'left' | 'right', direction: -1 | 0 | 1) => void;

/**
 * AI Controller for Pong Game
 * 
 * Requirements:
 * - Can only refresh view once per second
 * - Must simulate keyboard input (human behavior)
 * - Cannot use A* algorithm
 * - Must use power-ups if available
 * - Must be able to win occasionally
 */
export const useAIController = (setPaddleMovement: SetPaddleMovement, gameState: GameState) => {
  const lastUpdateTime = useRef<number>(0);
  const aiDecision = useRef<{ direction: -1 | 0 | 1; confidence: number }>({ direction: 0, confidence: 0 });
  const predictionBuffer = useRef<{ x: number; y: number; time: number }[]>([]);
  
  // AI personality traits (simulates human behavior)
  const aiPersonality = useRef({
    reactionDelay: Math.random() * 200 + 100, // 100-300ms reaction delay
    predictionAccuracy: 0.7 + Math.random() * 0.2, // 70-90% accuracy
    aggressiveness: Math.random() * 0.5 + 0.3, // 30-80% aggressiveness
    mistakeRate: Math.random() * 0.15 + 0.05, // 5-20% mistake rate
  });

  useEffect(() => {
    const currentTime = Date.now();
    
    // Only update AI decision once per second (1000ms)
    if (currentTime - lastUpdateTime.current < 1000) {
      return;
    }
    
    lastUpdateTime.current = currentTime;
    
    // Simulate human reaction delay
    setTimeout(() => {
      makeAIDecision();
    }, aiPersonality.current.reactionDelay);
    
  }, [gameState]);

  /**
   * Predict ball trajectory based on current state
   * This simulates human prediction ability
   */
  const predictBallTrajectory = () => {
    const ball = gameState.ball;
    const canvasHeight = 400;
    const canvasWidth = 800;
    
    if (ball.dx <= 0) {
      // Ball is moving away from AI, no need to predict
      return null;
    }
    
    // Calculate time to reach AI paddle
    const distanceToAI = canvasWidth - ball.x;
    const timeToReach = distanceToAI / Math.abs(ball.dx);
    
    // Predict final Y position
    let predictedY = ball.y + (ball.dy * timeToReach);
    
    // Account for wall bounces
    while (predictedY < 0 || predictedY > canvasHeight) {
      if (predictedY < 0) {
        predictedY = -predictedY;
      } else if (predictedY > canvasHeight) {
        predictedY = 2 * canvasHeight - predictedY;
      }
    }
    
    // Add prediction error (simulates human prediction mistakes)
    const predictionError = (Math.random() - 0.5) * 50 * (1 - aiPersonality.current.predictionAccuracy);
    predictedY += predictionError;
    
    return {
      y: Math.max(0, Math.min(canvasHeight - 100, predictedY)), // Keep within paddle bounds
      time: timeToReach,
      confidence: aiPersonality.current.predictionAccuracy
    };
  };

  /**
   * Make AI decision based on current game state
   * Simulates human decision-making process
   */
  const makeAIDecision = () => {
    const aiPaddle = gameState.rightPaddle;
    const ball = gameState.ball;
    const aiPaddleCenter = aiPaddle.y + 50; // Assuming paddle height is 100
    
    // Only act if ball is moving towards AI
    if (ball.dx <= 0) {
      // Simulate human behavior: sometimes make mistakes even when ball is away
      if (Math.random() < aiPersonality.current.mistakeRate) {
        const randomDirection = Math.random() < 0.5 ? -1 : 1;
        aiDecision.current = { direction: randomDirection, confidence: 0.1 };
      } else {
        aiDecision.current = { direction: 0, confidence: 1.0 };
      }
      return;
    }
    
    // Predict ball trajectory
    const prediction = predictBallTrajectory();
    
    if (!prediction) {
      aiDecision.current = { direction: 0, confidence: 0 };
      return;
    }
    
    // Calculate optimal paddle position
    const targetY = prediction.y - 50; // Center paddle on predicted ball position
    const currentY = aiPaddle.y;
    const distance = targetY - currentY;
    
    // Add some randomness to simulate human imperfection
    const humanError = (Math.random() - 0.5) * 20;
    const adjustedDistance = distance + humanError;
    
    // Determine movement direction
    let direction: -1 | 0 | 1 = 0;
    let confidence = prediction.confidence;
    
    if (Math.abs(adjustedDistance) > 10) {
      direction = adjustedDistance > 0 ? 1 : -1;
    }
    
    // Sometimes make mistakes (simulates human errors)
    if (Math.random() < aiPersonality.current.mistakeRate) {
      direction = direction === 0 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      confidence *= 0.5;
    }
    
    // Add aggressiveness factor (sometimes move even when not necessary)
    if (direction === 0 && Math.random() < aiPersonality.current.aggressiveness * 0.3) {
      direction = Math.random() < 0.5 ? -1 : 1;
      confidence *= 0.7;
    }
    
    aiDecision.current = { direction, confidence };
    
    // Simulate keyboard input by calling setPaddleMovement
    // This mimics how a human would press W/S keys
    setPaddleMovement('right', direction);
  };

  /**
   * Continuous movement simulation
   * This runs more frequently to simulate smooth human movement
   */
  useEffect(() => {
    const movementInterval = setInterval(() => {
      // Apply the current AI decision with some variation
      if (aiDecision.current.confidence > 0.3) {
        // Sometimes add small variations to movement
        const variation = Math.random() < 0.1 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        const finalDirection = aiDecision.current.direction + variation;
        
        // Clamp to valid values
        const clampedDirection = Math.max(-1, Math.min(1, finalDirection)) as -1 | 0 | 1;
        setPaddleMovement('right', clampedDirection);
      }
    }, 50); // Update movement 20 times per second for smooth motion
    
    return () => clearInterval(movementInterval);
  }, [setPaddleMovement]);

  // Cleanup function
  useEffect(() => {
    return () => {
      // Ensure AI stops moving when component unmounts
      setPaddleMovement('right', 0);
    };
  }, [setPaddleMovement]);
};