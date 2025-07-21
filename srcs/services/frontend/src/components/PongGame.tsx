import React from 'react';
import { usePongEngine } from '../hooks/usePongEngine';
import { useHumanController } from '../hooks/useHumanController';
import { useGameSettings } from '../contexts/GameSettingsContext';

/**
 * The Player vs. Player Pong game component.
 * It assembles the core game engine with two human-controlled paddle controllers.
 */

interface PongGameProps {
  width?: number;
  height?: number;
}

export const PongGame: React.FC<PongGameProps> = ({ width = 800, height = 400 }) => {
  // 1. Initialize the core game engine. This gives us the state, the canvas ref,
  //    and the controls to manipulate the engine.
  const { canvasRef, gameState, controls } = usePongEngine(width, height);
  
  // 2. Get game settings from context
  const { settings } = useGameSettings();
  
  // 3. Initialize a controller for the LEFT paddle.
  //    We pass it the engine's standardized movement function.
  useHumanController(controls.setPaddleMovement, 'left');

  // 4. Initialize another controller for the RIGHT paddle.
  //    This demonstrates the power of reusable hooks.
  useHumanController(controls.setPaddleMovement, 'right');

  // 4. Render the UI, using the state and controls provided by the engine.
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
        <p>Left Player: {settings.leftPaddleUp.toUpperCase()} (up) / {settings.leftPaddleDown.toUpperCase()} (down)</p>
        <p>Right Player: {settings.rightPaddleUp.toUpperCase()} (up) / {settings.rightPaddleDown.toUpperCase()} (down)</p>
      </div>
    </div>
  );
};