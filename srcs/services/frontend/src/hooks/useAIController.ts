import { useEffect } from 'react';
import { GameState } from './usePongEngine';

type SetPaddleMovement = (side: 'left' | 'right', direction: -1 | 0 | 1) => void;

export const useAIController = (setPaddleMovement: SetPaddleMovement, gameState: GameState) => {
  useEffect(() => {
    const aiPaddle = gameState.rightPaddle;
    const ball = gameState.ball;
    const aiPaddleCenter = aiPaddle.y + 50;

    if (ball.dx > 0) { // Only move when ball is coming towards AI
      if (aiPaddleCenter < ball.y - 15) {
        setPaddleMovement('right', 1); // Intention: Move Down
      } else if (aiPaddleCenter > ball.y + 15) {
        setPaddleMovement('right', -1); // Intention: Move Up
      } else {
        setPaddleMovement('right', 0); // Intention: Stop
      }
    } else {
        setPaddleMovement('right', 0); // Intention: Stop
    }
  }, [gameState, setPaddleMovement]);
};