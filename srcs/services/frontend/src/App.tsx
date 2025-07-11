import { useState } from 'react'
import { PongGame } from './components/PongGame'
import { MultiplayerPong } from './components/MultiPlayerPong'
import { AIPong } from './components/AIPong'

/**
 * Main App Component
 * 
 * Provides a game mode selection interface with three options:
 * - Single Player: Local Pong game
 * - Multiplayer: Real-time multiplayer Pong
 * - AI Game: Player vs AI Pong game
 */
function App() {
  // Game mode state management
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer' | 'ai'>('single');
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

  /**
   * Creates an AI game room
   * Fetches room ID from backend and switches to AI game mode
   */
  const createAIGame = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/ai-game');
      const data = await response.json();
      setRoomId(data.roomId);
      setGameMode('ai');
    } catch (error) {
      console.error('Failed to create AI game:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl mb-8">Pong Game</h1>
        
        {/* Single Player Game Mode */}
        {gameMode === 'single' ? (
          <>
            <PongGame />
            <div className="mt-4 space-x-4">
              <button 
                onClick={() => setGameMode('multiplayer')}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Play Multiplayer
              </button>
              <button 
                onClick={createAIGame}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              >
                Play vs AI
              </button>
            </div>
          </>
        ) : gameMode === 'multiplayer' ? (
          <>
            {/* Multiplayer Game Setup */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="px-4 py-2 text-black rounded mr-2"
              />
              <select
                value={playerSide}
                onChange={(e) => setPlayerSide(e.target.value as 'left' | 'right')}
                className="px-4 py-2 text-black rounded"
              >
                <option value="left">Left Player</option>
                <option value="right">Right Player</option>
              </select>
            </div>
            
            {/* Multiplayer Game Component */}
            {roomId && (
              <MultiplayerPong roomId={roomId} playerSide={playerSide} />
            )}
            
            <button 
              onClick={() => setGameMode('single')}
              className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Back to Single Player
            </button>
          </>
        ) : (
          <>
            {/* AI Game Component */}
            {roomId && <AIPong roomId={roomId} />}
            <button 
              onClick={() => setGameMode('single')}
              className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Back to Single Player
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default App
