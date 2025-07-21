import { useEffect } from 'react';

type SetPaddleMovement = (side: 'left' | 'right', direction: -1 | 0 | 1) => void;

/**
 * A controller that translates human keyboard input into paddle movement intentions.
 */
export const useHumanController = (setPaddleMovement: SetPaddleMovement, side: 'left' | 'right') => {
  // Determine which keys to listen for based on the player's side.
  const upKey = side === 'left' ? 'w' : 'arrowup';
  const downKey = side === 'left' ? 's' : 'arrowdown';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // --- THE FIX IS HERE ---
      // First, check if the pressed key is one that this controller instance cares about.
      if (key === upKey || key === downKey) {
        // If it is, immediately prevent the browser's default action (e.g., scrolling).
        e.preventDefault();

        // Then, set the movement intention.
        if (key === upKey) {
          setPaddleMovement(side, -1); // Intention: Move Up
        } else { // It must be the downKey
          setPaddleMovement(side, 1); // Intention: Move Down
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // If the released key is one of ours, stop the movement.
      if (key === upKey || key === downKey) {
        setPaddleMovement(side, 0); // Intention: Stop
      }
    };

    // Attach the event listeners to the window.
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup function to remove listeners when the component unmounts.
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setPaddleMovement, side, upKey, downKey]); // Dependencies for the effect.
};