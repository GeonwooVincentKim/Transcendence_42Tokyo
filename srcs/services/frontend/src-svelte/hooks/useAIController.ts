/**
 * Svelte version of the AI controller hook
 * Handles AI paddle movement with different difficulty levels
 */

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface AIDebugInfo {
  lastMove: string;
  ballDirection: string;
  aiPosition: number;
  targetPosition: number;
  isMoving: boolean;
  consecutiveMisses: number;
  consecutiveHits: number;
  difficulty: AIDifficulty;
  prediction: { x: number; y: number } | null;
  ballPosition: { x: number; y: number };
  shouldMove: boolean;
  reactionDelay: number;
  movementDirection: number;
  distance: number;
  forceMovement: boolean;
}

/**
 * AI controller for paddle movement
 */
export const useAIController = (
  setPaddleMovement: (side: 'left' | 'right', direction: number) => void,
  side: 'left' | 'right',
  difficulty: AIDifficulty = 'medium',
  onDebugInfo?: (info: AIDebugInfo) => void
) => {
  let lastMove = 'none';
  let consecutiveMisses = 0;
  let consecutiveHits = 0;
  let lastBallPosition = { x: 0, y: 0 };
  let lastMoveTime = 0;

  /**
   * Get difficulty settings
   */
  const getDifficultySettings = (diff: AIDifficulty) => {
    switch (diff) {
      case 'easy':
        return { reactionDelay: 200, accuracy: 0.6, speed: 0.7 };
      case 'medium':
        return { reactionDelay: 120, accuracy: 0.8, speed: 0.9 };
      case 'hard':
        return { reactionDelay: 80, accuracy: 0.9, speed: 1.0 };
      case 'expert':
        return { reactionDelay: 40, accuracy: 0.95, speed: 1.1 };
      default:
        return { reactionDelay: 120, accuracy: 0.8, speed: 0.9 };
    }
  };

  /**
   * Predict ball position
   */
  const predictBallPosition = (ball: { x: number; y: number; dx: number; dy: number }, paddleY: number) => {
    let x = ball.x;
    let y = ball.y;
    let dx = ball.dx;
    let dy = ball.dy;

    // Simulate ball movement until it reaches the paddle
    while (x > 0 && x < 800) {
      x += dx;
      y += dy;

      // Handle wall bounces
      if (y <= 5 || y >= 395) {
        dy = -dy;
      }
    }

    return { x, y };
  };

  /**
   * Calculate AI movement
   */
  const calculateMovement = (ball: { x: number; y: number; dx: number; dy: number }, paddleY: number) => {
    const settings = getDifficultySettings(difficulty);
    const currentTime = Date.now();

    // Check if enough time has passed since last move
    if (currentTime - lastMoveTime < settings.reactionDelay) {
      return 0;
    }

    // Predict ball position
    const prediction = predictBallPosition(ball, paddleY);
    const targetY = prediction.y - 40; // Center of paddle
    const distance = Math.abs(paddleY - targetY);
    const shouldMove = distance > 10;

    let direction = 0;
    if (shouldMove) {
      if (paddleY < targetY) {
        direction = 1;
        lastMove = 'down';
      } else {
        direction = -1;
        lastMove = 'up';
      }
    } else {
      lastMove = 'none';
    }

    // Apply accuracy factor
    if (Math.random() > settings.accuracy) {
      direction = Math.random() > 0.5 ? 1 : -1;
    }

    // Update debug info
    const debugInfo: AIDebugInfo = {
      lastMove,
      ballDirection: ball.dx > 0 ? 'right' : 'left',
      aiPosition: paddleY,
      targetPosition: targetY,
      isMoving: shouldMove,
      consecutiveMisses,
      consecutiveHits,
      difficulty,
      prediction,
      ballPosition: ball,
      shouldMove,
      reactionDelay: settings.reactionDelay,
      movementDirection: direction,
      distance,
      forceMovement: false
    };

    if (onDebugInfo) {
      onDebugInfo(debugInfo);
    }

    lastMoveTime = currentTime;
    return direction;
  };

  /**
   * Handle ball position updates
   */
  const handleBallUpdate = (ball: { x: number; y: number; dx: number; dy: number }, paddleY: number) => {
    const direction = calculateMovement(ball, paddleY);
    if (direction !== 0) {
      setPaddleMovement(side, direction);
    }
  };

  return {
    handleBallUpdate,
    getDifficultySettings,
    cleanup: () => {
      // AI controller cleanup (no event listeners to remove)
    }
  };
};
