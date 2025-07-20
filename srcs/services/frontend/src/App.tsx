// import { useState } from 'react'
// import { PongGame } from './components/PongGame'
// import { MultiplayerPong } from './components/MultiPlayerPong'
// import { AIPong } from './components/AIPong'

// /**
//  * Main App Component
//  * 
//  * Provides a game mode selection interface with three options:
//  * - Single Player: Local Pong game
//  * - Multiplayer: Real-time multiplayer Pong
//  * - AI Game: Player vs AI Pong game
//  */
// function App() {
//   // Game mode state management
//   const [gameMode, setGameMode] = useState<'single' | 'multiplayer' | 'ai'>('single');
//   const [roomId, setRoomId] = useState('');
//   const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

//   /**
//    * Creates an AI game room
//    * Fetches room ID from backend and switches to AI game mode
//    */
//   const createAIGame = async () => {
//     try {
//       const response = await fetch('http://localhost:8000/api/ai-game');
//       const data = await response.json();
//       setRoomId(data.roomId);
//       setGameMode('ai');
//     } catch (error) {
//       console.error('Failed to create AI game:', error);
//     }
//   };

//   /**
//    * Handles game mode transitions
//    * Resets room ID and player side when switching modes
//    */
//   const handleModeChange = (newMode: 'single' | 'multiplayer' | 'ai') => {
//     setGameMode(newMode);
//     // Reset room ID and player side when switching modes
//     if (newMode === 'single') {
//       setRoomId('');
//       setPlayerSide('left');
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
//       <div className="text-center">
//         <h1 className="text-4xl mb-8">Pong Game</h1>
        
//         {/* Single Player Game Mode */}
//         {gameMode === 'single' ? (
//           <>
//             <PongGame />
//             <div className="mt-4 space-x-4">
//               <button 
//                 onClick={() => handleModeChange('multiplayer')}
//                 className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
//               >
//                 Play Multiplayer
//               </button>
//               <button 
//                 onClick={createAIGame}
//                 className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
//               >
//                 Play vs AI
//               </button>
//             </div>
//           </>
//         ) : gameMode === 'multiplayer' ? (
//           <>
//             {/* Multiplayer Game Setup */}
//             <div className="mb-4">
//               <input
//                 type="text"
//                 placeholder="Enter Room ID"
//                 value={roomId}
//                 onChange={(e) => setRoomId(e.target.value)}
//                 className="px-4 py-2 text-black rounded mr-2"
//               />
//               <select
//                 value={playerSide}
//                 onChange={(e) => setPlayerSide(e.target.value as 'left' | 'right')}
//                 className="px-4 py-2 text-black rounded"
//               >
//                 <option value="left">Left Player</option>
//                 <option value="right">Right Player</option>
//               </select>
//             </div>
            
//             {/* Multiplayer Game Component */}
//             {roomId && (
//               <MultiplayerPong roomId={roomId} playerSide={playerSide} />
//             )}
            
//             <button 
//               onClick={() => handleModeChange('single')}
//               className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
//             >
//               Back to Single Player
//             </button>
//           </>
//         ) : (
//           <>
//             {/* AI Game Component */}
//             {roomId && <AIPong roomId={roomId} />}
//             <button 
//               onClick={() => handleModeChange('single')}
//               className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
//             >
//               Back to Single Player
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   )
// }

// export default App
import { useState } from 'react'
import { PongGame } from './components/PongGame'
import { MultiplayerPong } from './components/MultiPlayerPong'
import { AIPong } from './components/AIPong'

/**
 * Main App Component
 */
function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'single' | 'multiplayer' | 'ai'>('menu');
  
  // NOTE: roomId and playerSide are now ONLY for the multiplayer mode.
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

  // --- (REMOVED) --- The 'createAIGame' async function is no longer needed.
  // We can just switch the mode directly.

  /**
   * --- (CHANGED) --- This function now handles returning to the main menu.
   * Resets multiplayer-specific state.
   */
  const handleReturnToMenu = () => {
    setGameMode('menu');
    setRoomId('');
    setPlayerSide('left');
  };

  /**
   * --- (NEW) --- A simple function to start the single player vs AI game.
   * All it needs to do is change the game mode. No server call required.
   */
  const startAIGame = () => {
    setGameMode('ai');
  };

  // --- (NEW) --- A simple function to start the local 2-player game.
  const startSinglePlayerGame = () => {
    setGameMode('single');
  };
  
  // --- (NEW) --- A simple function to show the multiplayer setup screen.
  const showMultiplayerSetup = () => {
    setGameMode('multiplayer');
  };


  // --- (CHANGED) --- Render logic is updated for clarity and correctness.
  const renderGameContent = () => {
    switch(gameMode) {
      case 'single':
        return (
          <>
            <PongGame />
            <button 
              onClick={handleReturnToMenu}
              className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Back to Menu
            </button>
          </>
        );

      case 'multiplayer':
        return (
          <>
            <div className="mb-4">
              <input
                type="text"
                placeholder="Enter Room ID to Join/Create"
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
            
            {/* The actual multiplayer game, which DOES require a roomId */}
            {roomId && (
              <MultiplayerPong roomId={roomId} playerSide={playerSide} />
            )}
            
            <button 
              onClick={handleReturnToMenu}
              className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Back to Menu
            </button>
          </>
        );
        
      case 'ai':
        return (
          <>
            {/* --- (CHANGED) --- Render AIPong directly, without checking for or passing a roomId */}
            <AIPong />
            <button 
              onClick={handleReturnToMenu}
              className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
            >
              Back to Menu
            </button>
          </>
        );

      case 'menu':
      default:
        return (
          <div className="space-y-4 flex flex-col items-center">
            <button 
              onClick={startSinglePlayerGame}
              className="px-6 py-3 bg-indigo-600 rounded hover:bg-indigo-700 w-64 text-lg"
            >
              Player vs Player (Local)
            </button>
            <button 
              onClick={showMultiplayerSetup}
              className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-700 w-64 text-lg"
            >
              Multiplayer (Online)
            </button>
            <button 
              onClick={startAIGame}
              className="px-6 py-3 bg-green-600 rounded hover:bg-green-700 w-64 text-lg"
            >
              Player vs AI
            </button>
          </div>
        );
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl mb-8">Transcendence Pong</h1>
        {renderGameContent()}
      </div>
    </div>
  )
}

export default App;