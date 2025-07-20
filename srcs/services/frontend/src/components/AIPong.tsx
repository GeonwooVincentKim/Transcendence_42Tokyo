
import React from 'react';
import { usePongEngine } from '../hooks/usePongEngine';
import { useHumanController } from '../hooks/useHumanController';
import { useAIController } from '../hooks/useAIController';

/**
 * The Player vs. AI Pong game component.
 * It assembles the core game engine with one human controller and one AI controller.
 */
export const AIPong: React.FC = () => {
  // 1. Initialize the core game engine. This is IDENTICAL to the other game mode.
  const { canvasRef, gameState, controls } = usePongEngine();
  
  // 2. Initialize a controller for the LEFT paddle (the human player).
  useHumanController(controls.setPaddleMovement, 'left');

  // 3. Initialize a controller for the RIGHT paddle (the AI).
  //    This is the ONLY functional difference from PongGame.tsx.
  //    We pass it the engine's control function and the gameState so it can "see" the ball.
  useAIController(controls.setPaddleMovement, gameState);

  // 4. Render the UI. This is almost identical to the other game mode,
  //    with only minor text changes for clarity.
  return (
    <div className="flex flex-col items-center" data-testid="game-container">
      <h2 className="text-2xl mb-4">Player vs. AI</h2>
      
      {/* The buttons are identical, calling the same engine controls */}
      <div className="mb-4 flex gap-2">
        <button onClick={controls.start}>Start</button>
        <button onClick={controls.pause}>Pause</button>
        <button onClick={controls.reset}>Reset</button>
      </div>

      <div data-testid="game-status" className="mb-2 text-sm">
        Status: {gameState.status}
      </div>
      
      {/* The score text is customized for this game mode */}
      <div data-testid="score" className="mb-2 text-lg font-bold">
        Player: {gameState.leftScore} - AI: {gameState.rightScore}
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="border border-white"
        aria-label="AI Pong game canvas"
      />
      
      {/* Instructions are simplified for a single human player */}
      <div className="mt-4 text-sm text-gray-400">
        <p>Use W (up) / S (down) to move your paddle.</p>
      </div>
    </div>
  );
};