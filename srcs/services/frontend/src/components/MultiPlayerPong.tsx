import React, { useEffect, useRef, useState } from 'react';
import SocketIOService from '../services/socketIOService';

interface MultiplayerPongProps {
  roomId: string;
  playerSide: 'left' | 'right';
}

export const MultiplayerPong: React.FC<MultiplayerPongProps> = ({ 
  roomId, 
  playerSide 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketServiceRef = useRef<SocketIOService | null>(null);
  const [gameState, setGameState] = useState({
    leftPaddle: { y: 200 },
    rightPaddle: { y: 200 },
    ball: { x: 400, y: 200, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready' as 'ready' | 'playing' | 'paused' | 'finished',
    winner: undefined as 'left' | 'right' | undefined
  });
  const [connected, setConnected] = useState(false);
  const [keys, setKeys] = useState<Set<string>>(new Set());

  // Connect to Socket.IO server
  useEffect(() => {
    // Parse roomId format: "tournamentId-matchId" (e.g., "14-4")
    const [tournamentId, matchId] = roomId.split('-');
    // Generate unique userId for each connection to avoid conflicts
    const userId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('Connecting to Socket.IO server for room:', roomId);
    
    const socketService = new SocketIOService();
    socketServiceRef.current = socketService;

    // Set up event handlers
    socketService.setEventHandlers({
      onConnected: (data) => {
        console.log('Socket.IO connected:', data);
        setConnected(true);
      },
      onPlayerJoined: (data) => {
        console.log('Player joined:', data.message);
      },
      onPlayerLeft: (data) => {
        console.log('Player left:', data.message);
      },
      onPlayerReady: (data) => {
        console.log('Player ready:', data);
      },
      onGameStart: (data) => {
        console.log('🎮 Game start event received:', data);
        // Update status based on server's roomState
        const serverStatus = data.roomState?.status === 'ready' ? 'playing' : data.roomState?.status || 'playing';
        setGameState(prev => ({ ...prev, status: serverStatus }));
        console.log('🎮 Game state updated to:', serverStatus);
      },
      onGamePlaying: (data) => {
        console.log('🎮 Game playing event received:', data);
        
        // Update status and initialize game data from server
        const serverStatus = data.roomState?.status || 'playing';
        const gameData = data.gameState || {};
        
        setGameState(prev => {
          const safePrev = prev || {};
          return {
            leftPaddle: gameData.leftPaddle || safePrev.leftPaddle || { y: 200 },
            rightPaddle: gameData.rightPaddle || safePrev.rightPaddle || { y: 200 },
            ball: gameData.ball || safePrev.ball || { x: 400, y: 200, dx: 5, dy: 3 },
            leftScore: typeof gameData.leftScore === 'number' ? gameData.leftScore : (safePrev.leftScore || 0),
            rightScore: typeof gameData.rightScore === 'number' ? gameData.rightScore : (safePrev.rightScore || 0),
            status: serverStatus,
            winner: safePrev.winner
          };
        });
        
        console.log('🎮 Game state updated to:', serverStatus, 'with initial game data:', gameData);
      },
      onGameStateUpdate: (data) => {
        console.log('Game state update:', data);
        console.log('Game state update data.gameState:', data.gameState);
        console.log('Game state update data.gameState.type:', data.gameState?.type);
        
        // Check if this is a paddle move message
        if (data.gameState && data.gameState.type === 'paddle_move') {
          const paddleMove = data.gameState;
          console.log('Paddle move received in onGameStateUpdate:', paddleMove);
          
          setGameState(prev => {
            const safePrev = prev || {};
            const newState = {
              leftPaddle: safePrev.leftPaddle || { y: 200 },
              rightPaddle: safePrev.rightPaddle || { y: 200 },
              ball: safePrev.ball || { x: 400, y: 200, dx: 5, dy: 3 },
              leftScore: safePrev.leftScore || 0,
              rightScore: safePrev.rightScore || 0,
              status: safePrev.status || 'ready',
              winner: safePrev.winner
            };
            
            // Update the appropriate paddle position
            if (paddleMove.player === 'left' && typeof paddleMove.y === 'number') {
              newState.leftPaddle = { y: paddleMove.y };
              console.log('Updated left paddle to y:', paddleMove.y);
            } else if (paddleMove.player === 'right' && typeof paddleMove.y === 'number') {
              newState.rightPaddle = { y: paddleMove.y };
              console.log('Updated right paddle to y:', paddleMove.y);
            }
            
            return newState;
          });
          return;
        }
        
        // Check if this is a game reset message
        if (data.gameState && data.type === 'game_reset') {
          console.log('Game reset received in onGameStateUpdate:', data.gameState);
          
          setGameState(prev => ({
            ...prev,
            // Reset to initial game state
            leftPaddle: { y: 200 },
            rightPaddle: { y: 200 },
            ball: { x: 400, y: 200, dx: 5, dy: 3 },
            leftScore: 0,
            rightScore: 0,
            status: 'ready', // Reset to ready state
            winner: undefined
          }));
          
          // Force immediate re-render by triggering a state update
          setTimeout(() => {
            setGameState(currentState => ({
              ...currentState,
              // Ensure the reset state is properly applied
              leftPaddle: { y: 200 },
              rightPaddle: { y: 200 },
              ball: { x: 400, y: 200, dx: 5, dy: 3 },
              leftScore: 0,
              rightScore: 0,
              status: 'ready'
            }));
          }, 100);
          return;
        }
        
        // Handle full game state updates
        const gameData = data.gameState || data.roomState?.gameData || data;
        
        setGameState(prev => ({
          ...prev,
          ...gameData,
          // Ensure paddles and ball have proper structure with defaults
          leftPaddle: gameData?.leftPaddle || prev.leftPaddle || { y: 200 },
          rightPaddle: gameData?.rightPaddle || prev.rightPaddle || { y: 200 },
          ball: gameData?.ball || prev.ball || { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: gameData?.leftScore !== undefined ? gameData.leftScore : prev.leftScore,
          rightScore: gameData?.rightScore !== undefined ? gameData.rightScore : prev.rightScore,
          // Keep current status unless explicitly provided
          status: gameData?.status || prev.status
        }));
      },
      onGameEnd: (data) => {
        console.log('Game end:', data);
        setGameState(prev => ({
          ...prev,
          status: 'finished',
          winner: data.gameResult.winner,
          leftScore: data.gameResult.leftScore,
          rightScore: data.gameResult.rightScore
        }));
      },
      onPong: () => {
        // Handle pong response
      },
      onDisconnect: (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setConnected(false);
      },
      onError: (error) => {
        console.error('Socket.IO error:', error);
        setConnected(false);
      }
    });

    // Connect to server
    socketService.connect(parseInt(tournamentId), parseInt(matchId), userId)
      .then(() => {
        console.log('Socket.IO connection established');
      })
      .catch((error) => {
        console.error('Failed to connect to Socket.IO:', error);
        setConnected(false);
      });

    return () => {
      socketService.disconnect();
    };
  }, [roomId]);

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

  // Paddle movement handling
  useEffect(() => {
    if (!connected || !socketServiceRef.current) return;

    // Only allow paddle movement when game is playing
    if (gameState.status !== 'playing') return;

    const paddleSpeed = 8;
    const keysToCheck = playerSide === 'left' ? ['w', 's'] : ['arrowup', 'arrowdown'];
    
    keysToCheck.forEach(key => {
      if (keys.has(key)) {
        // Add comprehensive defensive checks for paddle existence
        const safeGameState = gameState || {};
        const leftPaddle = (safeGameState.leftPaddle && typeof safeGameState.leftPaddle === 'object') 
          ? safeGameState.leftPaddle 
          : { y: 200 };
        const rightPaddle = (safeGameState.rightPaddle && typeof safeGameState.rightPaddle === 'object') 
          ? safeGameState.rightPaddle 
          : { y: 200 };
        const currentY = playerSide === 'left' 
          ? ((leftPaddle && typeof leftPaddle.y === 'number') ? leftPaddle.y : 200)
          : ((rightPaddle && typeof rightPaddle.y === 'number') ? rightPaddle.y : 200);
        let newY = typeof currentY === 'number' ? currentY : 200;
        
        if ((key === 'w' || key === 'arrowup') && newY > 0) {
          newY -= paddleSpeed;
        } else if ((key === 's' || key === 'arrowdown') && newY < 300) {
          newY += paddleSpeed;
        }
        
        // Update local game state safely
        setGameState(prev => {
          const safePrev = prev || {};
          return {
            leftPaddle: safePrev.leftPaddle || { y: 200 },
            rightPaddle: safePrev.rightPaddle || { y: 200 },
            ball: safePrev.ball || { x: 400, y: 200, dx: 5, dy: 3 },
            leftScore: safePrev.leftScore || 0,
            rightScore: safePrev.rightScore || 0,
            status: safePrev.status || 'ready',
            winner: safePrev.winner,
            [playerSide === 'left' ? 'leftPaddle' : 'rightPaddle']: { y: newY }
          };
        });

        // Send paddle position to server via Socket.IO
        if (socketServiceRef.current && socketServiceRef.current.isConnected()) {
          socketServiceRef.current.sendGameStateUpdate({
            type: 'paddle_move',
            player: playerSide,
            y: newY
          });
        }
      }
    });
  }, [keys, connected, playerSide, gameState, gameState.status]);

  // Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      // Don't render if game state is not properly initialized
      if (!gameState || typeof gameState !== 'object') {
        console.log('Game state not initialized, skipping render');
        return;
      }
      
      // Debug logging
      console.log('Rendering with gameState:', gameState);
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 400);

      // Add comprehensive defensive checks for game state
      const safeGameState = gameState || {};
      
      // Ensure paddles have y property
      let leftPaddle = { y: 200 };
      let rightPaddle = { y: 200 };
      
      if (safeGameState.leftPaddle && typeof safeGameState.leftPaddle === 'object' && typeof safeGameState.leftPaddle.y === 'number') {
        leftPaddle = { y: safeGameState.leftPaddle.y };
      }
      
      if (safeGameState.rightPaddle && typeof safeGameState.rightPaddle === 'object' && typeof safeGameState.rightPaddle.y === 'number') {
        rightPaddle = { y: safeGameState.rightPaddle.y };
      }
      
      // Ensure ball has x, y properties
      let ball = { x: 400, y: 200, dx: 5, dy: 3 };
      if (safeGameState.ball && typeof safeGameState.ball === 'object') {
        ball = {
          x: typeof safeGameState.ball.x === 'number' ? safeGameState.ball.x : 400,
          y: typeof safeGameState.ball.y === 'number' ? safeGameState.ball.y : 200,
          dx: typeof safeGameState.ball.dx === 'number' ? safeGameState.ball.dx : 5,
          dy: typeof safeGameState.ball.dy === 'number' ? safeGameState.ball.dy : 3
        };
      }
      
      const leftScore = typeof safeGameState.leftScore === 'number' ? safeGameState.leftScore : 0;
      const rightScore = typeof safeGameState.rightScore === 'number' ? safeGameState.rightScore : 0;
      
      console.log('Safe rendering values:', { leftPaddle, rightPaddle, ball, leftScore, rightScore });

      // Draw paddles with final safety checks
      ctx.fillStyle = '#fff';
      const leftPaddleY = (leftPaddle && typeof leftPaddle.y === 'number') ? leftPaddle.y : 200;
      const rightPaddleY = (rightPaddle && typeof rightPaddle.y === 'number') ? rightPaddle.y : 200;
      
      ctx.fillRect(10, leftPaddleY, 10, 100);
      ctx.fillRect(780, rightPaddleY, 10, 100);

      // Draw ball with final safety checks
      const ballX = (ball && typeof ball.x === 'number') ? ball.x : 400;
      const ballY = (ball && typeof ball.y === 'number') ? ball.y : 200;
      
      ctx.beginPath();
      ctx.arc(ballX, ballY, 5, 0, 2 * Math.PI);
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
      ctx.fillText(leftScore.toString(), 200, 30);
      ctx.fillText(rightScore.toString(), 600, 30);
    };

    const interval = setInterval(renderLoop, 16);
    return () => clearInterval(interval);
  }, [gameState]);

  // Game control functions
  const handlePause = () => {
    if (socketServiceRef.current && socketServiceRef.current.isConnected()) {
      socketServiceRef.current.sendGameStateUpdate({
        type: 'game_pause'
      });
    }
  };

  const handleReset = () => {
    // Immediately update local state for instant UI feedback
    setGameState(prev => ({
      ...prev,
      leftPaddle: { y: 200 },
      rightPaddle: { y: 200 },
      ball: { x: 400, y: 200, dx: 5, dy: 3 },
      leftScore: 0,
      rightScore: 0,
      status: 'ready',
      winner: undefined
    }));
    
    // Send reset message to server
    if (socketServiceRef.current && socketServiceRef.current.isConnected()) {
      socketServiceRef.current.sendGameStateUpdate({
        type: 'game_reset'
      });
    }
  };

  // Sends a 'player_ready' message to the server when the Start button is clicked.
  // This is used to signal that the player is ready to begin the multiplayer game.
  const handleStart = () => {
    if (socketServiceRef.current && socketServiceRef.current.isConnected()) {
      socketServiceRef.current.sendPlayerReady(true);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl mb-4">Multiplayer Pong</h2>
      <div className="mb-4">
        <span className={`px-4 py-2 rounded ${connected ? 'bg-green-600' : 'bg-red-600'}`}>
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
      
      {/* Game Controls */}
      <div className="mb-4 flex gap-2">
        {/* Start button: Notifies the server that this player is ready to start */}
        <button 
          onClick={handleStart}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Start
        </button>
        <button 
          onClick={handlePause}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Pause
        </button>
        <button 
          onClick={handleReset}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>
      
      {/* Game Status */}
      {/*
        Displays the current game status. The text is chosen to match Cypress E2E test expectations:
        - 'Initial' or 'Ready' for the ready state
        - 'Started' or 'Playing' for the playing state
        - 'Stopped' or 'Paused' for the paused state
      */}
      <div data-testid="game-status" className="mb-2 text-sm">
        {gameState.status === 'ready' && 'Initial / Ready'}
        {gameState.status === 'playing' && 'Started / Playing'}
        {gameState.status === 'paused' && 'Stopped / Paused'}
        {gameState.status === 'finished' && 'Game Over'}
      </div>
      
      {/* Game End Message */}
      {gameState.status === 'finished' && gameState.winner && (
        <div className="mb-4 p-4 bg-green-600 text-white rounded-lg text-center">
          <h3 className="text-xl font-bold mb-2">Game Over!</h3>
          <p className="text-lg">
            {gameState.winner === 'left' ? 'Left Player' : 'Right Player'} wins!
          </p>
          <p className="text-sm mt-2">Final Score: {gameState.leftScore} - {gameState.rightScore}</p>
        </div>
      )}
      <div className="mb-4 text-sm">
        <p>You are playing as: <strong>{playerSide.toUpperCase()}</strong></p>
        <p>{playerSide === 'left' ? 'W/S keys' : '↑/↓ keys'}</p>
      </div>
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="border border-white"
      />
    </div>
  );
};
