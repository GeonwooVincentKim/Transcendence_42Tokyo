import { useState, useEffect } from 'react';
import { LoginForm } from './components/LoginForm';
import { RegisterForm } from './components/RegisterForm';
import { ForgotPassword } from './components/ForgotPassword';
import { ForgotUsername } from './components/ForgotUsername';
import { UserProfile } from './components/UserProfile';
import { DeleteAccountPage } from './components/DeleteAccountPage';
import { PongGame } from './components/PongGame';
import { AIPong } from './components/AIPong';
import { MultiplayerPong } from './components/MultiPlayerPong';
import { Tournament } from './components/Tournament';
import { GameSettings } from './components/GameSettings';
import Ranking from './components/Ranking';
import { AuthService } from './services/authService';
import './App.css';
import { AuthResponse, User } from './types/auth';
import { GameSettingsProvider } from './contexts/GameSettingsContext';
import i18n from 'i18next';

/**
 * Main App Component
 */
function App() {
  const [gameMode, setGameMode] = useState<'menu' | 'single' | 'multiplayer' | 'ai'>('menu');
  
    // NOTE: roomId and playerSide are now ONLY for the multiplayer mode.
  const [roomId, setRoomId] = useState('');
  const [playerSide, setPlayerSide] = useState<'left' | 'right'>('left');

  // Authentication state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [view, setView] = useState<'game' | 'profile' | 'deleteAccount' | 'forgotPassword' | 'forgotUsername' | 'settings' | 'ranking' | 'tournament'>('game');
  const [showSettings, setShowSettings] = useState(false);

  /**
   * Check authentication status on component mount
   */
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedAuth = AuthService.getStoredAuthData();
        if (storedAuth && AuthService.isAuthenticated()) {
          setUser(storedAuth.user);
          setIsAuthenticated(true);
        } else {
          // Clear invalid auth data
          AuthService.clearAuthData();
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
        AuthService.clearAuthData();
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  /**
   * Handle game route from URL
   */
  useEffect(() => {
    const handleGameRoute = () => {
      const path = window.location.pathname;
      console.log('🔍 Current path:', path);
      
      // Try multiple patterns to extract tournament and match IDs
      let tournamentId: number | null = null;
      let matchId: number | null = null;
      
      // Pattern 1: /game/tournament-{id}-match-{matchId}
      const pattern1 = path.match(/\/game\/tournament-(\d+)-match-(\d+)/);
      if (pattern1 && pattern1.length >= 3) {
        tournamentId = parseInt(pattern1[1]);
        matchId = parseInt(pattern1[2]);
        console.log('🔍 Pattern 1 match:', { tournamentId, matchId });
      }
      
      // Pattern 2: tournament-{id}-match-{matchId} (without /game/)
      if (!tournamentId || !matchId) {
        const pattern2 = path.match(/tournament-(\d+)-match-(\d+)/);
        if (pattern2 && pattern2.length >= 3) {
          tournamentId = parseInt(pattern2[1]);
          matchId = parseInt(pattern2[2]);
          console.log('🔍 Pattern 2 match:', { tournamentId, matchId });
        }
      }
      
      // Pattern 3: Manual extraction from URL parts
      if (!tournamentId || !matchId) {
        const parts = path.split('/');
        console.log('🔍 Path parts:', parts);
        
        for (const part of parts) {
          const match = part.match(/tournament-(\d+)-match-(\d+)/);
          if (match && match.length >= 3) {
            tournamentId = parseInt(match[1]);
            matchId = parseInt(match[2]);
            console.log('🔍 Pattern 3 match:', { tournamentId, matchId });
            break;
          }
        }
      }
      
      if (tournamentId && matchId && !isNaN(tournamentId) && !isNaN(matchId)) {
        // Set up for tournament match
        const roomId = `tournament-${tournamentId}-match-${matchId}`;
        console.log('🔍 Setting roomId:', roomId);
        setRoomId(roomId);
        setPlayerSide('left'); // Default to left player
        setGameMode('multiplayer');
        setView('game');
      } else {
        console.error('❌ No valid game match found in path:', path);
        console.log('❌ Expected format: /game/tournament-{id}-match-{matchId}');
        console.log('❌ Parsed values:', { tournamentId, matchId });
      }
    };

    handleGameRoute();
  }, []);

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = (authData: AuthResponse) => {
    setUser(authData.user);
    setIsAuthenticated(true);
    setView('game');
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthMode('login');
    setView('game');
    AuthService.clearAuthData();
  };

  // --- (NEW) --- A simple function to start the local 2-player game.
  const startSinglePlayerGame = () => {
    setGameMode('single');
  };
  
  // --- (NEW) --- A simple function to show the multiplayer setup screen.
  const showMultiplayerSetup = () => {
    setGameMode('multiplayer');
  };

  // --- (NEW) --- A simple function to start the AI game.
  const startAIGame = () => {
    setGameMode('ai');
  };

  // --- (NEW) --- A simple function to return to menu.
  const handleReturnToMenu = () => {
    setGameMode('menu');
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
            <button 
              onClick={() => setShowSettings(true)}
              className="px-6 py-3 bg-purple-600 rounded hover:bg-purple-700 w-64 text-lg"
            >
              Game Settings
            </button>
            <button 
              onClick={() => setView('ranking')}
              className="px-6 py-3 bg-yellow-600 rounded hover:bg-yellow-700 w-64 text-lg"
            >
              Ranking
            </button>
            <button 
              onClick={() => setView('tournament')}
              className="px-6 py-3 bg-pink-600 rounded hover:bg-pink-700 w-64 text-lg"
            >
              Tournament
            </button>
          </div>
        );
    }
  };


  // Show loading screen while checking authentication
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

  // Show authentication forms if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 id="title" className="text-4xl mb-8">{i18n.t('label.title')}</h1>
          <p id="subtitle" className="text-gray-400 mb-8">{i18n.t('label.signintoplay')}</p>
          {authMode === 'login' ? (
            <LoginForm 
              onLoginSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setAuthMode('register')}
              onSwitchToForgotPassword={() => setView('forgotPassword')}
              onSwitchToForgotUsername={() => setView('forgotUsername')}
            />
          ) : (
            <RegisterForm 
              onRegisterSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setAuthMode('login')}
            />
          )}
        </div>
      </div>
    );
  }

  // Show different views based on current view state
  if (view === 'profile') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">User Profile</h1>
          <UserProfile 
            user={user!}
            onLogout={handleLogout}
            onBackToGame={() => setView('game')}
            onDeleteAccount={() => setView('deleteAccount')}
          />
        </div>
      </div>
    );
  }

  if (view === 'deleteAccount') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Delete Account</h1>
          <DeleteAccountPage 
            user={user!}
            onBackToProfile={() => setView('profile')}
            onAccountDeleted={handleLogout}
          />
        </div>
      </div>
    );
  }

  if (view === 'forgotPassword') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Forgot Password</h1>
          <ForgotPassword 
            onBackToLogin={() => setView('game')}
          />
        </div>
      </div>
    );
  }

  if (view === 'forgotUsername') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Forgot Username</h1>
          <ForgotUsername 
            onBackToLogin={() => setView('game')}
          />
        </div>
      </div>
    );
  }

  if (view === 'ranking') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">User Ranking</h1>
          <Ranking />
          <button
            onClick={() => setView('game')}
            className="mt-8 px-4 py-2 bg-gray-600 rounded hover:bg-gray-700"
          >
            Back to Game
          </button>
        </div>
      </div>
    );
  }

  if (view === 'tournament') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl mb-8">Tournament</h1>
          <Tournament 
            onBack={() => setView('game')} 
            onStartMatch={(_tournamentId, _matchId, roomId) => {
              // Set up for tournament match
              setRoomId(roomId);
              setPlayerSide('left'); // Default to left player
              setGameMode('multiplayer');
              setView('game');
            }}
          />
        </div>
      </div>
    );
  }

  // Main game view
  return (
    <GameSettingsProvider>
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="flex justify-between items-center mb-8">
            <div className="text-left">
              <h1 className="text-4xl">Transcendence Pong</h1>
              <p className="text-gray-400 mt-2">Welcome, {user?.username}!</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setView('profile')}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Profile
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
          {renderGameContent()}
        </div>
        
        {/* Game Settings Modal */}
        {showSettings && (
          <GameSettings 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </GameSettingsProvider>
  );
}

export default App;