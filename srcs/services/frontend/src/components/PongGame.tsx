import React, { useCallback } from 'react';
import { usePongEngine } from '../hooks/usePongEngine';
import { useHumanController } from '../hooks/useHumanController';
import { GameStatsService } from '../services/gameStatsService';

/**
 * The Player vs. Player Pong game component.
 * It assembles the core game engine with two human-controlled paddle controllers.
 */

interface PongGameProps {
  width?: number;
  height?: number;
  onGameEnd?: (winner: 'left' | 'right', leftScore: number, rightScore: number) => void;
}

export const PongGame: React.FC<PongGameProps> = ({ width = 800, height = 400, onGameEnd }) => {
  // Handle game end
  const handleGameEnd = useCallback(async (winner: 'left' | 'right', leftScore: number, rightScore: number) => {
    try {
      // Save game result for both players (assuming current user is left player)
      await GameStatsService.saveGameResultSimple(winner, leftScore, rightScore, 'single', 'left');
      console.log('Game result saved successfully');
      
      // Call the onGameEnd callback if provided
      if (onGameEnd) {
        onGameEnd(winner, leftScore, rightScore);
      }
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  }, [onGameEnd]);

  // 1. Initialize the core game engine. This gives us the state, the canvas ref,
  //    and the controls to manipulate the engine.
  const { canvasRef, gameState, controls } = usePongEngine(width, height, handleGameEnd);
  
  // 3. Initialize a controller for the LEFT paddle.
  //    We pass it the engine's standardized movement function.
  useHumanController(controls.setPaddleMovement, 'left');

  // 4. Initialize another controller for the RIGHT paddle.
  //    This demonstrates the power of reusable hooks.
  useHumanController(controls.setPaddleMovement, 'right');

  // 5. Render the UI, using the state and controls provided by the engine.
  return (
    <div className="flex flex-col items-center" data-testid="game-container">
      <h2 className="text-2xl mb-4">Player vs. Player</h2>
      
      {/* The buttons call the control functions directly from the engine hook */}
      <div className="mb-4 flex gap-2">
        <button data-testid="start-button" onClick={controls.start}>Start</button>
        <button data-testid="pause-button" onClick={controls.pause}>Pause</button>
        <button data-testid="reset-button" onClick={controls.reset}>Reset</button>
      </div>

      {/* The UI reads its data directly from the gameState object */}
      <div data-testid="game-status" className="mb-2 text-sm">
        Status: {gameState.status}
      </div>
      <div data-testid="score" className="mb-2 text-lg font-bold">
        {gameState.leftScore} - {gameState.rightScore}
      </div>
      
      {/* Game end message */}
      {gameState.status === 'finished' && gameState.winner && (
        <div className="mb-4 p-4 bg-green-600 text-white rounded-lg text-center">
          <h3 className="text-xl font-bold mb-2">Game Over!</h3>
          <p className="text-lg">
            {gameState.winner === 'left' ? 'Left Player' : 'Right Player'} wins!
          </p>
          <p className="text-sm mt-2">Final Score: {gameState.leftScore} - {gameState.rightScore}</p>
        </div>
      )}

      {/* The canvas element is linked to the engine via the canvasRef */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-white"
        aria-label="Pong game canvas"
      />
      
      {/* Static instructions for the players */}
      <div className="mt-4 text-sm text-gray-400">
        <p>Left Player: W (up) / S (down)</p>
        <p>Right Player: Arrow Up (up) / Arrow Down (down)</p>
      </div>
    </div>
  );
};