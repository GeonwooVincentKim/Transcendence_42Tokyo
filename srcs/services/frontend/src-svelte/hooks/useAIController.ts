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
  gameStateStore: any,
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
      setPaddleMovement('right', direction);
    }
  };

  let animationId: NodeJS.Timeout | null = null;
  let isInitialized = false;

  /**
   * Simple AI movement function
   */
  const moveAIPaddle = (currentState: any) => {
    if (!currentState.ball || !currentState.rightPaddle) {
      console.log('AI: No ball or paddle available');
      return;
    }

    const ball = currentState.ball;
    const paddle = currentState.rightPaddle;
    const paddleHeight = 80; // Match the actual paddle height

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
      const threshold = 5; // Minimum distance to move
      
      console.log('AI: Ball coming towards AI', {
        ballY: ball.y,
        targetY,
        distance,
        threshold
      });
      
      // Only move if distance is significant
      if (Math.abs(distance) > threshold) {
        const direction = distance > 0 ? 1 : -1;
        console.log('AI: Setting movement direction', direction, 'distance:', distance);
        setPaddleMovement('right', direction);
        
        // Force immediate update for debugging
        console.log('AI: Movement command sent', { side: 'right', direction });
      } else {
        console.log('AI: Distance too small, stopping movement');
        setPaddleMovement('right', 0);
      }
    } else {
      console.log('AI: Ball moving away, stopping movement');
      setPaddleMovement('right', 0);
    }

    // Update debug info
    if (onDebugInfo) {
      onDebugInfo({
        lastMove: ball.dx > 0 ? (ball.y > paddle.y ? 1 : -1) : 0,
        ballDirection: ball.dx > 0 ? 'right' : 'left',
        aiPosition: paddle.y,
        targetPosition: ball.y - paddleHeight / 2,
        isMoving: ball.dx > 0,
        consecutiveMisses,
        consecutiveHits,
        difficulty,
        prediction: null,
        ballPosition: { x: ball.x, y: ball.y },
        shouldMove: ball.dx > 0,
        reactionDelay: getDifficultySettings(difficulty).reactionDelay,
        movementDirection: ball.dx > 0 ? (ball.y > paddle.y ? 1 : -1) : 0,
        distance: Math.abs(ball.y - paddle.y),
        forceMovement: ball.x > 600
      });
    }
  };

  /**
   * Start AI movement loop
   */
  const startAI = () => {
    // Clean up existing interval
    if (animationId) {
      clearInterval(animationId);
      animationId = null;
    }

    console.log('AI: Starting movement loop');
    const config = getDifficultySettings(difficulty);
    
    // Use setInterval for more reliable timing
    animationId = setInterval(() => {
      gameStateStore.subscribe(currentState => {
        if (currentState.status === 'playing') {
          const now = Date.now();
          
          if (now - lastMoveTime >= config.reactionDelay) {
            console.log('AI: Movement loop tick');
            moveAIPaddle(currentState);
            lastMoveTime = now;
          }
        } else {
          console.log('AI: Game not playing, stopping movement');
          setPaddleMovement('right', 0);
        }
      })();
    }, 16); // 60 FPS
  };

  /**
   * Initialize AI controller
   */
  const initialize = () => {
    gameStateStore.subscribe(currentState => {
      console.log('AI: Initializing with gameState:', currentState.status);
      
      if (currentState.status === 'playing' && !isInitialized) {
        console.log('AI: Game started, initializing');
        isInitialized = true;
        consecutiveMisses = 0;
        consecutiveHits = 0;
        
        // Move AI paddle to center
        setTimeout(() => {
          console.log('AI: Moving to center');
          setPaddleMovement('right', 1);
          setTimeout(() => {
            setPaddleMovement('right', -1);
            setTimeout(() => {
              setPaddleMovement('right', 0);
              console.log('AI: Initialization complete');
            }, 300);
          }, 300);
        }, 100);
      }
      
      // Start AI loop
      startAI();
    })();
  };

  // Auto-start AI
  initialize();

  return {
    handleBallUpdate,
    getDifficultySettings,
    startAI,
    initialize,
    cleanup: () => {
      // AI controller cleanup
      if (animationId) {
        clearInterval(animationId);
        animationId = null;
      }
    }
  };
};
