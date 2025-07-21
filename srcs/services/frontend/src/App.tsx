\
// export default App
import { useState } from 'react'
import { PongGame } from './components/PongGame'
import { MultiplayerPong } from './components/MultiPlayerPong'
import { AIPong } from './components/AIPong'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'
import { UserProfile } from './components/UserProfile'
import { ForgotUsername } from './components/ForgotUsername'
import { ForgotPassword } from './components/ForgotPassword'
import { AuthService } from './services/authService'
import { AuthResponse, User } from './types/auth'
import { DeleteAccountPage } from './components/DeleteAccountPage'; // (to be created)
import { GameSettingsProvider } from './contexts/GameSettingsContext'
import { GameSettings } from './components/GameSettings'

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

  // Game mode state management
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer' | 'ai'>('single');
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

  // Add view state to control profile/game/accountDeleted
  const [view, setView] = useState<'game' | 'profile' | 'deleteAccount'>('game');
  const [showSettings, setShowSettings] = useState(false);

  /**
   * Check authentication status on component mount
   * Verifies if user has valid stored authentication data
   */
  useEffect(() => {
    const checkAuth = () => {
      const storedAuth = AuthService.getStoredAuthData();
      if (storedAuth) {
        setUser(storedAuth.user);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Handle successful authentication
   * @param authData - Authentication response data
   */
  const handleAuthSuccess = (authData: AuthResponse) => {
    setUser(authData.user);
    setIsAuthenticated(true);
    setView('game'); // Always go to game after login/register
  };

  /**
   * Handle logout
   * Clears authentication state and shows login form
   */
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthMode('login');
    setView('game');
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
    </GameSettingsProvider>
  );
}

export default App;