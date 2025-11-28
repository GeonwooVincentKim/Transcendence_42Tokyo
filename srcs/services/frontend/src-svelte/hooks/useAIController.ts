/**
 * Svelte version of the AI controller hook
 * Handles AI paddle movement with different difficulty levels
 * 
 * Requirements:
 * - AI can only refresh its view of the game once per second (1000ms)
 * - AI must simulate keyboard input (like human behavior)
 * - AI must predict bounces and other actions
 * - AI must be capable of winning occasionally
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
  lastViewUpdate: number;
  timeSinceLastUpdate: number;
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
  // AI can only refresh its view of the game once per second (1000ms)
  let lastViewUpdateTime = Date.now(); // Initialize to current time to allow immediate first update
  const VIEW_UPDATE_INTERVAL = 1000; // 1 second as per requirements
  let cachedGameState: any = null;

  /**
   * Get difficulty settings
   * Note: reactionDelay is now used for internal movement decisions,
   * but view updates are always limited to 1 second as per requirements
   * AI must be capable of winning occasionally, so higher difficulties need better accuracy
   * Note: Paddle speed is the same for both user and AI (controlled by gameSpeed setting)
   */
  const getDifficultySettings = (diff: AIDifficulty) => {
    switch (diff) {
      case 'easy':
        return { reactionDelay: 200, accuracy: 0.65, predictionAccuracy: 0.7 };
      case 'medium':
        return { reactionDelay: 100, accuracy: 0.85, predictionAccuracy: 0.85 };
      case 'hard':
        return { reactionDelay: 60, accuracy: 0.92, predictionAccuracy: 0.92 };
      case 'expert':
        return { reactionDelay: 30, accuracy: 0.97, predictionAccuracy: 0.97 };
      default:
        return { reactionDelay: 100, accuracy: 0.85, predictionAccuracy: 0.85 };
    }
  };

  /**
   * Simulate keyboard input (as per requirements: AI must replicate human behavior)
   * This simulates pressing/releasing arrow keys like a human player would
   * Keep the key pressed for continuous movement (like a human would)
   */
  let lastKeyboardDirection = 0;
  const simulateKeyboardInput = (direction: number) => {
    // Only update if direction changed (simulate key press/release)
    if (direction !== lastKeyboardDirection) {
      // Simulate keyboard input by calling setPaddleMovement
      // This mimics human behavior where keyboard events trigger paddle movement
      // The AI acts as if it's pressing ArrowUp (direction: -1) or ArrowDown (direction: 1) keys
      if (direction !== 0) {
        setPaddleMovement('right', direction);
        lastKeyboardDirection = direction;
      } else {
        // Simulate releasing the key (stop movement)
        setPaddleMovement('right', 0);
        lastKeyboardDirection = 0;
      }
    } else if (direction !== 0) {
      // Keep the key pressed for continuous movement
      setPaddleMovement('right', direction);
    }
  };

  /**
   * Physics-based ball trajectory calculation
   * Uses mathematical formulas instead of iterative simulation
   * AI must anticipate bounces and other actions (requirement)
   */
  const calculateBallTrajectory = (
    ball: { x: number; y: number; dx: number; dy: number },
    targetX: number,
    gameWidth: number = 800,
    gameHeight: number = 400
  ): { x: number; y: number; timeToReach: number } => {
    if (ball.dx === 0) {
      // Ball not moving horizontally, return current position
      return { x: ball.x, y: ball.y, timeToReach: Infinity };
    }

    if (ball.dx < 0 && targetX > ball.x) {
      // Ball moving away from target, return current position
      return { x: ball.x, y: ball.y, timeToReach: Infinity };
    }

    if (ball.dx > 0 && targetX < ball.x) {
      // Ball already past target, return current position
      return { x: ball.x, y: ball.y, timeToReach: 0 };
    }

    // Calculate time to reach target X position
    const distanceX = Math.abs(targetX - ball.x);
    const timeToReachX = distanceX / Math.abs(ball.dx);

    // Calculate final Y position considering wall bounces
    // Use physics formula: y = y0 + vy*t + (1/2)*a*t^2
    // In Pong, there's no gravity, so: y = y0 + vy*t
    let finalY = ball.y + (ball.dy * timeToReachX);

    // Calculate number of wall bounces
    const wallTop = 5;
    const wallBottom = gameHeight - 5;
    const wallHeight = wallBottom - wallTop;

    // If ball will hit walls, calculate bounces
    if (ball.dy !== 0) {
      // Calculate how many bounces will occur
      let remainingTime = timeToReachX;
      let currentY = ball.y;
      let currentDy = ball.dy;

      while (remainingTime > 0.001) {
        // Calculate time to next wall collision
        let timeToWall: number;
        if (currentDy > 0) {
          // Moving down
          timeToWall = (wallBottom - currentY) / currentDy;
        } else {
          // Moving up
          timeToWall = (wallTop - currentY) / currentDy;
        }

        if (timeToWall > remainingTime) {
          // No more bounces, final position
          currentY += currentDy * remainingTime;
          break;
        } else {
          // Hit wall, bounce
          currentY += currentDy * timeToWall;
          currentDy = -currentDy;
          remainingTime -= timeToWall;
        }
      }

      finalY = currentY;
    }

    // Clamp to valid range
    finalY = Math.max(wallTop, Math.min(wallBottom, finalY));

    return {
      x: targetX,
      y: finalY,
      timeToReach: timeToReachX
    };
  };

  /**
   * Predict ball position using physics-based trajectory calculation
   * AI must anticipate bounces and other actions (requirement)
   */
  const predictBallPosition = (ball: { x: number; y: number; dx: number; dy: number }, paddleY: number) => {
    const settings = getDifficultySettings(difficulty);
    const paddleX = 790; // Right paddle X position
    const gameWidth = 800;
    const gameHeight = 400;

    // Use physics-based trajectory calculation
    const trajectory = calculateBallTrajectory(ball, paddleX, gameWidth, gameHeight);

    // Apply prediction accuracy based on difficulty
    // Higher difficulty = more accurate prediction
    const predictionError = (1 - settings.predictionAccuracy) * 15; // Max 15 pixels error
    const errorY = (Math.random() - 0.5) * predictionError;

    return {
      x: trajectory.x,
      y: Math.max(5, Math.min(395, trajectory.y + errorY)) // Clamp to valid Y range
    };
  };

  /**
   * Calculate AI movement
   * AI can only refresh its view of the game once per second (1000ms)
   * But can make movement decisions more frequently based on cached/predicted state
   */
  const calculateMovement = (ball: { x: number; y: number; dx: number; dy: number }, paddleY: number, forceUpdate: boolean = false) => {
    const settings = getDifficultySettings(difficulty);
    const currentTime = Date.now();

    // REQUIREMENT: AI can only refresh its view of the game once per second
    // Check if 1 second has passed since last view update
    const timeSinceLastViewUpdate = currentTime - lastViewUpdateTime;
    let useCachedState = false;
    let timeSinceViewUpdate = 0;
    
    if (!forceUpdate && timeSinceLastViewUpdate < VIEW_UPDATE_INTERVAL) {
      // Use cached game state if available
      if (cachedGameState && cachedGameState.ball) {
        // Use physics-based trajectory calculation to predict current ball position
        timeSinceViewUpdate = timeSinceLastViewUpdate;
        const millisecondsElapsed = timeSinceViewUpdate;
        // At 60 FPS, 1 frame = 16.67ms, so calculate frames elapsed
        const framesElapsed = millisecondsElapsed / 16.67;
        
        // Calculate predicted position using physics formula
        // dx and dy are in pixels per frame, so we multiply by frames elapsed
        let predictedX = cachedGameState.ball.x + (cachedGameState.ball.dx * framesElapsed);
        let predictedY = cachedGameState.ball.y + (cachedGameState.ball.dy * framesElapsed);
        let predictedDx = cachedGameState.ball.dx;
        let predictedDy = cachedGameState.ball.dy;
        
        // Handle wall bounces in prediction
        const wallTop = 5;
        const wallBottom = 395;
        
        // Calculate wall bounces (in frame units)
        if (predictedDy !== 0) {
          let remainingFrames = framesElapsed;
          let currentY = cachedGameState.ball.y;
          let currentDy = cachedGameState.ball.dy;
          
          while (remainingFrames > 0.01) {
            let framesToWall: number;
            if (currentDy > 0) {
              framesToWall = (wallBottom - currentY) / currentDy;
            } else {
              framesToWall = (wallTop - currentY) / currentDy;
            }
            
            if (framesToWall > remainingFrames || framesToWall <= 0) {
              currentY += currentDy * remainingFrames;
              break;
            } else {
              currentY += currentDy * framesToWall;
              currentDy = -currentDy;
              remainingFrames -= framesToWall;
            }
          }
          
          predictedY = currentY;
          predictedDy = currentDy;
        }
        
        // Clamp to valid range
        predictedY = Math.max(wallTop, Math.min(wallBottom, predictedY));
        
        // Update ball with predicted position
        ball = {
          x: predictedX,
          y: predictedY,
          dx: predictedDx,
          dy: predictedDy
        };
        useCachedState = true;
      } else {
        // If no cached state and not enough time has passed, use current state
        // (This allows AI to work even on first frame)
        cachedGameState = { ball: { ...ball } };
        lastViewUpdateTime = currentTime;
      }
    } else {
      // Update view (once per second)
      lastViewUpdateTime = currentTime;
      cachedGameState = { ball: { ...ball } };
      timeSinceViewUpdate = 0;
    }

    // Check if enough time has passed since last move (for internal movement decisions)
    // Use shorter delay for more responsive AI
    const movementDelay = Math.max(16, settings.reactionDelay / 2); // At least 1 frame, but half of reaction delay
    if (currentTime - lastMoveTime < movementDelay) {
      return lastKeyboardDirection; // Continue current movement
    }

    let direction = 0;
    let targetY = paddleY;
    let shouldMove = false;
    let prediction: { x: number; y: number } | null = null;
    let distance = 0; // Initialize distance variable

    // Only react if ball is moving towards AI (right side)
    if (ball.dx <= 0) {
      // Ball is moving away, move to center position for better defense
      const centerY = 200 - 40; // Center of screen minus half paddle height
      targetY = centerY;
      distance = Math.abs(paddleY - centerY);
      shouldMove = distance > 3;
      if (shouldMove) {
        direction = paddleY < centerY ? 1 : -1;
        lastMove = direction > 0 ? 'down' : 'up';
      } else {
        direction = 0;
        lastMove = 'none';
      }
    } else {
      // Ball is moving towards AI, predict and react
      // Predict ball position (AI must anticipate bounces and other actions)
      prediction = predictBallPosition(ball, paddleY);
      const paddleHeight = 80;
      targetY = prediction.y - paddleHeight / 2; // Center of paddle
      distance = Math.abs(paddleY - targetY);
      shouldMove = distance > 2; // Very small threshold for precise movement

    if (shouldMove) {
      if (paddleY < targetY) {
        direction = 1;
        lastMove = 'down';
      } else {
        direction = -1;
        lastMove = 'up';
      }
    } else {
        direction = 0;
      lastMove = 'none';
    }

      // Apply accuracy factor (for difficulty variation)
      // Lower difficulties make more mistakes, higher difficulties are more accurate
      // But reduce mistakes for hard/expert to allow AI to win
    if (Math.random() > settings.accuracy) {
        // Make a mistake: move in wrong direction or don't move
        // But for hard/expert, mistakes should be smaller
        if (difficulty === 'hard' || difficulty === 'expert') {
          // Small mistakes only (slight delay or small direction error)
          if (Math.random() > 0.7) {
            direction = 0; // Small delay
          }
        } else {
          // More significant mistakes for easy/medium
          if (Math.random() > 0.3) {
            direction = direction === 0 ? (Math.random() > 0.5 ? 1 : -1) : -direction;
          } else {
            direction = 0; // Sometimes don't move at all
          }
        }
      }
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
      forceMovement: false,
      lastViewUpdate: lastViewUpdateTime,
      timeSinceLastUpdate: timeSinceLastViewUpdate
    };

    if (onDebugInfo) {
      onDebugInfo(debugInfo);
    }

    lastMoveTime = currentTime;
    
    // Debug logging (can be removed later)
    if (direction !== 0) {
      console.log(`AI Movement: direction=${direction}, paddleY=${paddleY.toFixed(1)}, targetY=${targetY.toFixed(1)}, distance=${Math.abs(paddleY - targetY).toFixed(1)}`);
    }
    
    return direction;
  };

  /**
   * Handle ball position updates
   * REQUIREMENT: AI must simulate keyboard input (replicate human behavior)
   */
  const handleBallUpdate = (ball: { x: number; y: number; dx: number; dy: number }, paddleY: number) => {
    const direction = calculateMovement(ball, paddleY);
    // Simulate keyboard input instead of directly setting paddle movement
    simulateKeyboardInput(direction);
  };

  let animationId: ReturnType<typeof setInterval> | null = null;
  let isInitialized = false;
  let isRunning = false; // Track if AI loop is running
  let gameStateUnsubscribe: (() => void) | null = null;

  /**
   * Simple AI movement function
   * REQUIREMENT: AI can only refresh its view once per second
   * REQUIREMENT: AI must simulate keyboard input
   * But movement decisions can be made every frame based on cached/predicted state
   */
  const moveAIPaddle = (currentState: any) => {
    if (!currentState.ball || !currentState.rightPaddle) {
      return;
    }

    const currentTime = Date.now();
    const timeSinceLastViewUpdate = currentTime - lastViewUpdateTime;
    let ball = currentState.ball;
    let shouldUpdateView = false;

    // REQUIREMENT: AI can only refresh its view of the game once per second
    if (timeSinceLastViewUpdate >= VIEW_UPDATE_INTERVAL) {
      // Update view (once per second)
      lastViewUpdateTime = currentTime;
      cachedGameState = {
        ball: { ...currentState.ball },
        rightPaddle: { ...currentState.rightPaddle }
      };
      shouldUpdateView = true;
    } else {
      // Use cached game state if available, but predictively update it using physics
      if (cachedGameState && cachedGameState.ball) {
        // Use physics-based trajectory calculation to predict current ball position
        const millisecondsElapsed = timeSinceLastViewUpdate;
        const secondsElapsed = millisecondsElapsed / 1000; // Convert to seconds
        
        // Calculate predicted position using physics formula
        // Direct calculation: x = x0 + vx*t, y = y0 + vy*t (with wall bounces)
        let predictedX = cachedGameState.ball.x + (cachedGameState.ball.dx * secondsElapsed);
        let predictedY = cachedGameState.ball.y + (cachedGameState.ball.dy * secondsElapsed);
        let predictedDx = cachedGameState.ball.dx;
        let predictedDy = cachedGameState.ball.dy;
        
        // Handle wall bounces in prediction
        const wallTop = 5;
        const wallBottom = 395;
        
        // Calculate wall bounces
        if (predictedDy !== 0) {
          let remainingTime = secondsElapsed;
          let currentY = cachedGameState.ball.y;
          let currentDy = cachedGameState.ball.dy;
          
          while (remainingTime > 0.001) {
            let timeToWall: number;
            if (currentDy > 0) {
              timeToWall = (wallBottom - currentY) / currentDy;
            } else {
              timeToWall = (wallTop - currentY) / currentDy;
            }
            
            if (timeToWall > remainingTime || timeToWall <= 0) {
              currentY += currentDy * remainingTime;
              break;
            } else {
              currentY += currentDy * timeToWall;
              currentDy = -currentDy;
              remainingTime -= timeToWall;
            }
          }
          
          predictedY = currentY;
          predictedDy = currentDy;
        }
        
        // Clamp to valid range
        predictedY = Math.max(wallTop, Math.min(wallBottom, predictedY));
        
        // Update ball with predicted position
        ball = {
          x: predictedX,
          y: predictedY,
          dx: predictedDx,
          dy: predictedDy
        };
      } else {
        // First time, use current state and cache it
        cachedGameState = {
          ball: { ...currentState.ball },
          rightPaddle: { ...currentState.rightPaddle }
        };
        shouldUpdateView = true;
      }
    }

    const paddle = currentState.rightPaddle;

    // Use the calculateMovement function which handles prediction and view updates
    // Pass forceUpdate=true if we just updated the view
    const direction = calculateMovement(ball, paddle.y, shouldUpdateView);
    
    // REQUIREMENT: AI must simulate keyboard input (replicate human behavior)
    simulateKeyboardInput(direction);
  };

  /**
   * Start AI movement loop
   * REQUIREMENT: AI can only refresh its view once per second
   * The loop runs at 60 FPS, but view updates are limited to once per second
   */
  const startAI = () => {
    // Prevent duplicate starts
    if (isRunning) {
      return;
    }
    
    // Clean up existing interval and subscription
    if (animationId) {
      clearInterval(animationId);
      animationId = null;
    }
    if (gameStateUnsubscribe) {
      gameStateUnsubscribe();
      gameStateUnsubscribe = null;
    }

    isRunning = true;
    console.log('AI: Starting movement loop (view updates limited to 1 second)');
    const config = getDifficultySettings(difficulty);
    
    // Subscribe to game state once, not in the interval
    let currentState: any = null;
    
    gameStateUnsubscribe = gameStateStore.subscribe(state => {
      currentState = state;
    });
    
    // Use setInterval for more reliable timing
    // Loop runs at 60 FPS, but view updates are still limited to once per second
    // Movement decisions can be made more frequently based on cached/predicted state
    animationId = setInterval(() => {
      if (!currentState) return;
      
        if (currentState.status === 'playing') {
        // Make movement decisions more frequently (every frame)
        // But view updates are still limited to once per second
            moveAIPaddle(currentState);
        } else {
        // Simulate releasing keyboard keys when game is not playing
        simulateKeyboardInput(0);
        // Stop the loop if game is not playing
        if (animationId) {
          clearInterval(animationId);
          animationId = null;
          isRunning = false;
        }
      }
    }, 16); // 60 FPS (for smooth movement, but view updates are still limited to 1 second)
  };

  /**
   * Initialize AI controller
   */
  const initialize = () => {
    // Only initialize once
    if (isInitialized) {
      return;
    }
    
    isInitialized = true;
    console.log('AI: Initializing controller');
    
    // Start AI loop immediately
    startAI();
    
    // Subscribe to game state changes for initialization
    gameStateStore.subscribe(currentState => {
      if (currentState.status === 'playing' && !isRunning) {
        console.log('AI: Game started, starting AI loop');
        consecutiveMisses = 0;
        consecutiveHits = 0;
        
        // Start AI loop if not already running
        if (!isRunning) {
          startAI();
        }
      }
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
      isRunning = false;
      if (animationId) {
        clearInterval(animationId);
        animationId = null;
      }
      if (gameStateUnsubscribe) {
        gameStateUnsubscribe();
        gameStateUnsubscribe = null;
      }
    }
  };
};
