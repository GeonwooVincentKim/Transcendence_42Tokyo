import React, { useEffect, useRef, useState } from 'react';
import { AuthService } from '../services/authService';
import { GameStatsService } from '../services/gameStatsService';

interface AIPongProps {
  roomId: string;
}

interface GameState {
  leftPaddle: { y: number };
  rightPaddle: { y: number };
  ball: { x: number; y: number; dx: number; dy: number };
  leftScore: number;
  rightScore: number;
  status: 'ready' | 'playing' | 'paused' | 'finished';
}

export const AIPong: React.FC<AIPongProps> = ({ roomId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    leftPaddle: { y: 200 },
    rightPaddle: { y: 200 },
    ball: { x: 400, y: 200, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready'
  });
  const [connected, setConnected] = useState(false);
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameResult, setGameResult] = useState<{ won: boolean; score: number } | null>(null);

  // Initialize game session
  useEffect(() => {
    const initializeGame = async () => {
      try {
        const sessionId = await GameStatsService.createGameSession('ai', roomId);
        setSessionId(sessionId);
        console.log('Game session created:', sessionId);
      } catch (error) {
        console.error('Failed to create game session:', error);
      }
    };

    if (AuthService.isAuthenticated()) {
      initializeGame();
    }
  }, [roomId]);

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/game/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to AI game server');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'game_start':
          setGameState({ ...data.data, status: 'playing' });
          setGameStarted(true);
          break;
        case 'paddle_update':
          if (data.data.player === 'left') {
            setGameState(prev => ({
              ...prev,
              leftPaddle: { y: data.data.y }
            }));
          } else {
            setGameState(prev => ({
              ...prev,
              rightPaddle: { y: data.data.y }
            }));
          }
          break;
        case 'game_state_update':
          setGameState(prev => ({ ...data.data, status: prev.status }));
          
          // Check for game end condition
          if (data.data.leftScore >= 11 || data.data.rightScore >= 11) {
            const won = data.data.leftScore >= 11;
            const score = data.data.leftScore;
            setGameResult({ won, score });
            setShowGameOver(true);
            setGameState(prev => ({ ...prev, status: 'finished' }));
            
            // Save game result
            if (sessionId) {
              saveGameResult(won, score);
            }
          }
          break;
        case 'game_pause':
          setGameState(prev => ({ ...prev, status: 'paused' }));
          break;
        case 'game_reset':
          setGameState(prev => ({
            ...prev,
            leftScore: 0,
            rightScore: 0,
            ball: { x: 400, y: 200, dx: 5, dy: 3 },
            leftPaddle: { y: 200 },
            rightPaddle: { y: 200 },
            status: 'ready'
          }));
          setShowGameOver(false);
          setGameResult(null);
          setGameStarted(false);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from AI game server');
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [roomId, sessionId]);

  // Save game result to database
  const saveGameResult = async (won: boolean, score: number) => {
    if (!sessionId) return;

    try {
      await GameStatsService.saveGameResult({
        sessionId,
        playerSide: 'left',
        score,
        won,
        gameType: 'ai'
      });
      console.log('Game result saved successfully');
    } catch (error) {
      console.error('Failed to save game result:', error);
    }
  };

  // Keyboard input handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set([...prev, e.key.toLowerCase()]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key.toLowerCase());
        return newKeys;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Paddle movement handling (left player only)
  useEffect(() => {
    if (!connected || !wsRef.current) return;

    // Only allow paddle movement when game is playing
    if (gameState.status !== 'playing') return;

    const paddleSpeed = 8;
    
    if (keys.has('w')) {
      const newY = Math.max(0, gameState.leftPaddle.y - paddleSpeed);
      wsRef.current?.send(JSON.stringify({
        type: 'paddle_move',
        player: 'left',
        y: newY
      }));
    }
    
    if (keys.has('s')) {
      const newY = Math.min(300, gameState.leftPaddle.y + paddleSpeed);
      wsRef.current?.send(JSON.stringify({
        type: 'paddle_move',
        player: 'left',
        y: newY
      }));
    }
  }, [keys, connected, gameState.leftPaddle.y, gameState.status]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 400);

      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, gameState.leftPaddle.y, 10, 100);
      ctx.fillRect(780, gameState.rightPaddle.y, 10, 100);

      // Draw ball
      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();

      // Draw center line
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 400);
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Draw scores
      ctx.font = '24px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(gameState.leftScore.toString(), 200, 30);
      ctx.fillText(gameState.rightScore.toString(), 600, 30);

      // Draw game status
      if (gameState.status === 'ready' && !gameStarted) {
        ctx.font = '18px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Press SPACE to start', 300, 200);
      }

      if (gameState.status === 'paused') {
        ctx.font = '18px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('Game Paused', 350, 200);
      }
    };

    const interval = setInterval(renderLoop, 16);
    return () => clearInterval(interval);
  }, [gameState, gameStarted]);

  // Game control functions
  const handleStart = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'game_start'
      }));
    }
  };

  const handlePause = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'game_pause'
      }));
    }
  };

  const handleReset = () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({
        type: 'game_reset'
      }));
    }
  };

  // Handle game over
  const handleGameOver = () => {
    setShowGameOver(false);
    setGameResult(null);
    handleReset();
  };

  // Handle space key for starting game
  useEffect(() => {
    const handleSpaceKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && gameState.status === 'ready' && !gameStarted) {
        e.preventDefault();
        handleStart();
      }
    };

    window.addEventListener('keydown', handleSpaceKey);
    return () => window.removeEventListener('keydown', handleSpaceKey);
  }, [gameState.status, gameStarted]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold mb-2">Player vs AI</h2>
        <p className="text-sm text-gray-300 mb-2">
          Use W/S keys to move your paddle (left side)
        </p>
        <p className="text-sm text-gray-300">
          Press SPACE to start the game
        </p>
      </div>

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={400}
          className="border border-gray-600 bg-black"
          aria-label="Pong game canvas"
        />

        {/* Game Over Modal */}
        {showGameOver && gameResult && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
            <div className="bg-gray-800 p-6 rounded-lg text-center">
              <h3 className="text-2xl font-bold mb-4">
                {gameResult.won ? 'You Won!' : 'You Lost!'}
              </h3>
              <p className="text-lg mb-4">
                Final Score: {gameResult.score} - {gameResult.won ? 'AI Score' : 'Your Score'}
              </p>
              <button
                onClick={handleGameOver}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 space-x-4">
        {gameState.status === 'ready' && !gameStarted && (
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
          >
            Start Game
          </button>
        )}
        
        {gameState.status === 'playing' && (
          <button
            onClick={handlePause}
            className="px-4 py-2 bg-yellow-600 rounded hover:bg-yellow-700"
          >
            Pause
          </button>
        )}
        
        {gameState.status === 'paused' && (
          <button
            onClick={handleStart}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
          >
            Resume
          </button>
        )}
        
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-red-600 rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-400">
        {connected ? (
          <span className="text-green-400">Connected to game server</span>
        ) : (
          <span className="text-red-400">Disconnected from game server</span>
        )}
      </div>
    </div>
  );
};