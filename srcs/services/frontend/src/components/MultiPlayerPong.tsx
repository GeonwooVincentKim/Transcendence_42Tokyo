import React, { useEffect, useRef, useState } from 'react';

interface MultiplayerPongProps {
  roomId: string;
  playerSide: 'left' | 'right';
}

export const MultiplayerPong: React.FC<MultiplayerPongProps> = ({ 
  roomId, 
  playerSide 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [gameState, setGameState] = useState({
    leftPaddle: { y: 200 },
    rightPaddle: { y: 200 },
    ball: { x: 400, y: 200, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready' // Added
  });
  const [connected, setConnected] = useState(false);
  const [keys, setKeys] = useState<Set<string>>(new Set());

  // WebSocket connection
  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8000/ws/game/${roomId}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Connected to game server');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'game_start':
          setGameState({ ...data.data, status: 'playing' });
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
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from game server');
      setConnected(false);
    };

    return () => {
      ws.close();
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
    if (!connected || !wsRef.current) return;

    // Only allow paddle movement when game is playing
    if (gameState.status !== 'playing') return;

    const paddleSpeed = 5;
    const keysToCheck = playerSide === 'left' ? ['w', 's'] : ['arrowup', 'arrowdown'];
    
    keysToCheck.forEach(key => {
      if (keys.has(key)) {
        const currentY = playerSide === 'left' ? gameState.leftPaddle.y : gameState.rightPaddle.y;
        let newY = currentY;
        
        if ((key === 'w' || key === 'arrowup') && newY > 0) {
          newY -= paddleSpeed;
        } else if ((key === 's' || key === 'arrowdown') && newY < 300) {
          newY += paddleSpeed;
        }
        
        // Send paddle position to server
        wsRef.current?.send(JSON.stringify({
          type: 'paddle_move',
          player: playerSide,
          y: newY
        }));
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
    };

    const interval = setInterval(renderLoop, 16);
    return () => clearInterval(interval);
  }, [gameState]);

  // Game control functions
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
      
      <div data-testid="game-status" className="mb-2 text-sm">
        {gameState.status === 'ready'
          ? 'Initial'
          : gameState.status === 'playing'
          ? 'Started'
          : 'Stopped'}
      </div>
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
