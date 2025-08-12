import React, { useState } from 'react';
import { usePongEngine } from '../hooks/usePongEngine';
import { useHumanController } from '../hooks/useHumanController';
import { useAIController, AIDifficulty } from '../hooks/useAIController';

/**
 * The Player vs. AI Pong game component.
 * It assembles the core game engine with one human controller and one AI controller.
 * Features advanced AI with difficulty levels and adaptive behavior.
 */
export const AIPong: React.FC = () => {
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [aiDebugInfo, setAiDebugInfo] = useState({
    lastMove: 'none',
    ballDirection: 'left',
    aiPosition: 200,
    targetPosition: 200,
    isMoving: false,
    consecutiveMisses: 0,
    consecutiveHits: 0,
    difficulty: 'medium' as AIDifficulty,
    prediction: null as { x: number; y: number } | null,
    ballPosition: { x: 0, y: 0 },
    shouldMove: false,
    reactionDelay: 80,
    movementDirection: 0,
    distance: 0,
    forceMovement: false
  });

  // 1. Initialize the core game engine. This is IDENTICAL to the other game mode.
  const { canvasRef, gameState, controls } = usePongEngine();
  
  // 2. Initialize a controller for the LEFT paddle (the human player).
  useHumanController(controls.setPaddleMovement, 'left');
  
  // 3. Initialize a controller for the RIGHT paddle (the AI opponent).
  useAIController(
    controls.setPaddleMovement, 
    gameState, 
    aiDifficulty,
    (debugInfo) => {
      setAiDebugInfo({
        lastMove: debugInfo.lastMove ? 'moving' : 'idle',
        ballDirection: gameState.ball?.dx > 0 ? 'right' : 'left',
        aiPosition: gameState.rightPaddle?.y || 200,
        targetPosition: debugInfo.prediction?.y || 200,
        isMoving: debugInfo.lastMove > 0,
        consecutiveMisses: debugInfo.consecutiveMisses,
        consecutiveHits: debugInfo.consecutiveHits,
        difficulty: debugInfo.difficulty,
        prediction: debugInfo.prediction,
        ballPosition: debugInfo.ballPosition || { x: 0, y: 0 },
        shouldMove: debugInfo.shouldMove,
        reactionDelay: debugInfo.reactionDelay,
        movementDirection: debugInfo.movementDirection,
        distance: debugInfo.distance,
        forceMovement: debugInfo.forceMovement
      });
    }
  );

  // Handle difficulty change
  const handleDifficultyChange = (newDifficulty: AIDifficulty) => {
    setAiDifficulty(newDifficulty);
    // Reset game when changing difficulty
    controls.reset();
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      {/* Game Title */}
      <h2 className="text-2xl font-bold text-white mb-4">
        Player vs AI Pong
      </h2>

      {/* Difficulty Selector */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => handleDifficultyChange('easy')}
          className={`px-4 py-2 rounded ${
            aiDifficulty === 'easy'
              ? 'bg-green-600 text-white'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          Easy
        </button>
        <button
          onClick={() => handleDifficultyChange('medium')}
          className={`px-4 py-2 rounded ${
            aiDifficulty === 'medium'
              ? 'bg-yellow-600 text-white'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          Medium
        </button>
        <button
          onClick={() => handleDifficultyChange('hard')}
          className={`px-4 py-2 rounded ${
            aiDifficulty === 'hard'
              ? 'bg-red-600 text-white'
              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
          }`}
        >
          Hard
        </button>
      </div>

      {/* Game Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border-2 border-white bg-black"
        />
        
        {/* Game Controls Overlay */}
        <div className="absolute top-2 left-2 text-white text-sm">
          <div>Use W/S keys to move your paddle</div>
          <div>Press SPACE to start/pause</div>
        </div>

        {/* Score Display */}
        <div className="absolute top-2 right-2 text-white text-2xl font-bold">
          {gameState.leftScore} - {gameState.rightScore}
        </div>
      </div>

      {/* Game Controls */}
      <div className="flex space-x-4">
        <button
          onClick={controls.start}
          disabled={gameState.status === 'playing'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600"
        >
          Start Game
        </button>
        <button
          onClick={controls.pause}
          disabled={gameState.status !== 'playing'}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-gray-600"
        >
          Pause
        </button>
        <button
          onClick={controls.reset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset
        </button>
        <button
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showDebugInfo ? 'Hide' : 'Show'} Debug Info
        </button>
      </div>

      {/* AI Debug Information */}
      {showDebugInfo && (
        <div className="bg-gray-800 p-4 rounded-lg text-white text-sm max-w-md" data-testid="ai-debug-info">
          <h3 className="font-bold mb-2">AI Debug Information</h3>
          <div className="space-y-1">
            <div>Difficulty: <span className="text-yellow-400">{aiDebugInfo.difficulty}</span></div>
            <div>Last Move: <span className="text-blue-400">{aiDebugInfo.lastMove}</span></div>
            <div>Ball Direction: <span className="text-green-400">{aiDebugInfo.ballDirection}</span></div>
            <div>Ball Position: <span className="text-cyan-400">
              ({Math.round(aiDebugInfo.ballPosition?.x || 0)}, {Math.round(aiDebugInfo.ballPosition?.y || 0)})
            </span></div>
            <div>AI Position: <span className="text-purple-400" data-testid="ai-position">{Math.round(aiDebugInfo.aiPosition)}</span></div>
            <div>Target Position: <span className="text-orange-400">{Math.round(aiDebugInfo.targetPosition)}</span></div>
            <div>Is Moving: <span className="text-red-400" data-testid="is-moving">{aiDebugInfo.isMoving ? 'Yes' : 'No'}</span></div>
            <div>Should Move: <span className="text-pink-400">{aiDebugInfo.shouldMove ? 'Yes' : 'No'}</span></div>
            <div>Reaction Delay: <span className="text-indigo-400">{aiDebugInfo.reactionDelay}ms</span></div>
            <div>Consecutive Misses: <span className="text-red-400">{aiDebugInfo.consecutiveMisses}</span></div>
            <div>Consecutive Hits: <span className="text-green-400">{aiDebugInfo.consecutiveHits}</span></div>
            {aiDebugInfo.prediction && (
              <div>Prediction: <span className="text-cyan-400">
                ({Math.round(aiDebugInfo.prediction.x)}, {Math.round(aiDebugInfo.prediction.y)})
              </span></div>
            )}
            <div>Movement Direction: <span className="text-blue-400" data-testid="movement-direction">{aiDebugInfo.movementDirection}</span></div>
            <div>Distance: <span className="text-purple-400">{aiDebugInfo.distance}</span></div>
            <div>Force Movement: <span className="text-red-400">{aiDebugInfo.forceMovement ? 'Yes' : 'No'}</span></div>
          </div>
        </div>
      )}

      {/* Game Status */}
      <div className="text-white text-lg">
        Status: <span className="text-yellow-400">{gameState.status}</span>
      </div>
    </div>
  );
};