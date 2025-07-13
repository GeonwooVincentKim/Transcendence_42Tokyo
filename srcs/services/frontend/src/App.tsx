import { useState, useEffect } from 'react'
import { PongGame } from './components/PongGame'
import { MultiplayerPong } from './components/MultiPlayerPong'
import { AIPong } from './components/AIPong'
import { LoginForm } from './components/LoginForm'
import { RegisterForm } from './components/RegisterForm'
import { UserProfile } from './components/UserProfile'
import { AuthService } from './services/authService'
import { AuthResponse, User } from './types/auth'

/**
 * Main App Component
 * 
 * Provides a game mode selection interface with three options:
 * - Single Player: Local Pong game
 * - Multiplayer: Real-time multiplayer Pong
 * - AI Game: Player vs AI Pong game
 */
function App() {
  // Authentication state management
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Game mode state management
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer' | 'ai'>('single');
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

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
  };

  /**
   * Handle logout
   * Clears authentication state and shows login form
   */
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setShowLogin(true);
  };

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

  /**
   * Handles game mode transitions
   * Resets room ID and player side when switching modes
   */
  const handleModeChange = (newMode: 'single' | 'multiplayer' | 'ai') => {
    setGameMode(newMode);
    // Reset room ID and player side when switching modes
    if (newMode === 'single') {
      setRoomId('');
      setPlayerSide('left');
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication forms if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Pong Game</h1>
          
          {showLogin ? (
            <LoginForm 
              onLoginSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setShowLogin(false)}
            />
          ) : (
            <RegisterForm 
              onRegisterSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setShowLogin(true)}
            />
          )}
        </div>
      </div>
    );
  }

  // Show user profile if authenticated
  if (user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Pong Game</h1>
          <UserProfile user={user} onLogout={handleLogout} />
        </div>
      </div>
    );
  }

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
                onClick={() => handleModeChange('multiplayer')}
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
              onClick={() => handleModeChange('single')}
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
              onClick={() => handleModeChange('single')}
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
