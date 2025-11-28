/**
 * Svelte version of the human controller hook
 * Handles keyboard input for paddle movement
 */

/**
 * Human controller for paddle movement
 */
export const useHumanController = (
  setPaddleMovement: (side: 'left' | 'right', direction: number) => void,
  side: 'left' | 'right'
) => {
  let keys = new Set<string>();
  let animationId: number | null = null;
  let isRunning = false;

  /**
   * Handle key down events
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    keys.add(event.key.toLowerCase());
    // Start continuous movement loop if not already running
    if (!isRunning) {
      startMovementLoop();
    }
  };

  /**
   * Handle key up events
   */
  const handleKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.key.toLowerCase());
    // Stop movement if no keys are pressed
    if (keys.size === 0 && isRunning) {
      stopMovementLoop();
    }
  };

  /**
   * Calculate movement direction based on pressed keys
   */
  const getMovementDirection = (): number => {
    let direction = 0;

    if (side === 'left') {
      // Left player uses W/S keys
      if (keys.has('w')) direction = -1;
      if (keys.has('s')) direction = 1;
    } else {
      // Right player uses Arrow Up/Down keys
      if (keys.has('arrowup')) direction = -1;
      if (keys.has('arrowdown')) direction = 1;
    }

    return direction;
  };

  /**
   * Continuous movement loop (similar to AI controller)
   * Updates paddle position every frame while keys are pressed
   */
  const startMovementLoop = () => {
    if (isRunning) return;
    
    isRunning = true;
    const movementLoop = () => {
      if (!isRunning) return;
      
      const direction = getMovementDirection();
      if (direction !== 0) {
        setPaddleMovement(side, direction);
      }
      
      animationId = requestAnimationFrame(movementLoop);
    };
    
    animationId = requestAnimationFrame(movementLoop);
  };

  /**
   * Stop the movement loop
   */
  const stopMovementLoop = () => {
    isRunning = false;
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    // Stop paddle movement
    setPaddleMovement(side, 0);
  };

  /**
   * Initialize the controller
   */
  const initialize = () => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
  };

  /**
   * Cleanup the controller
   */
  const cleanup = () => {
    stopMovementLoop();
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };

  return {
    initialize,
    cleanup
  };
};
