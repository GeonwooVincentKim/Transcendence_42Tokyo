import { useState } from 'react'
import { PongGame } from './components/PongGame'
import { MultiplayerPong } from './components/MultiPlayerPong'

function App() {
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer'>('single');
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl mb-8">Pong Game</h1>
        
        {gameMode === 'single' ? (
          <>
            <PongGame />
            <button 
              onClick={() => setGameMode('multiplayer')}
              className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
            >
              Play Multiplayer
            </button>
          </>
        ) : (
          <>
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
        )}
      </div>
    </div>
  )
}

export default App
