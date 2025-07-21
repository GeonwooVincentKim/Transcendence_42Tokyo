import { useState, useEffect } from 'react'
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
import { DeleteAccountPage } from './components/DeleteAccountPage'
import { Leaderboard } from './components/Leaderboard'
import { GameSettingsProvider } from './contexts/GameSettingsContext'
import { GameSettings } from './components/GameSettings'

/**
 * Main App Component
 */
function App() {    
  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-username' | 'forgot-password'>('login');
  
  // Game mode state management
  const [gameMode, setGameMode] = useState<'menu' | 'single' | 'multiplayer' | 'ai'>('menu');
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

  // Add view state to control profile/game/accountDeleted/leaderboard
  const [view, setView] = useState<'game' | 'profile' | 'deleteAccount' | 'leaderboard'>('game');
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
    AuthService.clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    setAuthMode('login');
    setView('game');
  };

  // Game mode functions
  const startSinglePlayerGame = () => {
    setGameMode('single');
  };
  
  const showMultiplayerSetup = () => {
    setGameMode('multiplayer');
  };

  const startAIGame = () => {
    setGameMode('ai');
  };

  const handleReturnToMenu = () => {
    setGameMode('menu');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Transcendence Pong</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Authentication required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Transcendence Pong</h1>
          
          {authMode === 'login' && (
            <LoginForm 
              onLoginSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setAuthMode('register')}
              onSwitchToForgotUsername={() => setAuthMode('forgot-username')}
              onSwitchToForgotPassword={() => setAuthMode('forgot-password')}
            />
          )}
          
          {authMode === 'register' && (
            <RegisterForm 
              onRegisterSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
          
          {authMode === 'forgot-username' && (
            <ForgotUsername 
              onBackToLogin={() => setAuthMode('login')}
            />
          )}
          
          {authMode === 'forgot-password' && (
            <ForgotPassword 
              onBackToLogin={() => setAuthMode('login')}
            />
          )}
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <GameSettingsProvider>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header with user info and navigation */}
        <header className="bg-gray-800 p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Transcendence Pong</h1>
            
            <div className="flex items-center space-x-4">
              <span>Welcome, {user?.username}!</span>
              
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700"
              >
                Settings
              </button>
              
              <button
                onClick={() => setView('profile')}
                className="px-3 py-1 bg-green-600 rounded hover:bg-green-700"
              >
                Profile
              </button>
              
              <button
                onClick={() => setView('leaderboard')}
                className="px-3 py-1 bg-purple-600 rounded hover:bg-purple-700"
              >
                Leaderboard
              </button>
              
              <button
                onClick={handleLogout}
                className="px-3 py-1 bg-red-600 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800 p-4 border-b border-gray-700">
            <GameSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
          </div>
        )}

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-4">
          {view === 'profile' && (
            <UserProfile 
              user={user!}
              onLogout={handleLogout}
              onBackToGame={() => setView('game')}
              onDeleteAccount={() => setView('deleteAccount')}
            />
          )}
          
          {view === 'deleteAccount' && (
            <DeleteAccountPage 
              user={user!}
              onBackToProfile={() => setView('profile')}
              onAccountDeleted={handleLogout}
            />
          )}
          
          {view === 'leaderboard' && (
            <Leaderboard 
              onBack={() => setView('game')}
            />
          )}
          
          {view === 'game' && (
            <div className="text-center">
              {gameMode === 'menu' && (
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
              )}

              {gameMode === 'single' && (
                <>
                  <PongGame />
                  <button 
                    onClick={handleReturnToMenu}
                    className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                  >
                    Back to Menu
                  </button>
                </>
              )}

              {gameMode === 'multiplayer' && (
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
              )}
              
              {gameMode === 'ai' && (
                <>
                  <AIPong roomId={`ai-${user?.id}-${Date.now()}`} />
                  <button 
                    onClick={handleReturnToMenu}
                    className="mt-4 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
                  >
                    Back to Menu
                  </button>
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </GameSettingsProvider>
  );
}

export default App;