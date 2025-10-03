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

  /**
   * Handle key down events
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    keys.add(event.key.toLowerCase());
    handleMovement();
  };

  /**
   * Handle key up events
   */
  const handleKeyUp = (event: KeyboardEvent) => {
    keys.delete(event.key.toLowerCase());
    handleMovement();
  };

  /**
   * Handle movement based on pressed keys
   */
  const handleMovement = () => {
    let direction = 0;

    if (side === 'left') {
      if (keys.has('w') || keys.has('arrowup')) direction = -1;
      if (keys.has('s') || keys.has('arrowdown')) direction = 1;
    } else {
      if (keys.has('w') || keys.has('arrowup')) direction = -1;
      if (keys.has('s') || keys.has('arrowdown')) direction = 1;
    }

    if (direction !== 0) {
      setPaddleMovement(side, direction);
    }
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
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };

  return {
    initialize,
    cleanup
  };
};
