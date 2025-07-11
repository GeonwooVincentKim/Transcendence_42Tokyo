import React, { useEffect, useRef, useState } from 'react';

/**
 * PongGame Component Props
 */
interface PongGameProps {
  width?: number;
  height?: number;
}

/**
 * Game State Interface
 * Defines the structure of the game state
 */
interface GameState {
  leftPaddle: { y: number };
  rightPaddle: { y: number };
  ball: { x: number; y: number; dx: number; dy: number };
  leftScore: number;
  rightScore: number;
  status: 'ready' | 'playing' | 'paused'; // Added
}

/**
 * Pong Game Component
 * 
 * A classic Pong game implementation using HTML5 Canvas
 * Features:
 * - Real-time ball physics
 * - Keyboard controls for both paddles
 * - Score tracking
 * - Collision detection
 * - Smooth 60 FPS animation
 * 
 * @param width - Canvas width (default: 800)
 * @param height - Canvas height (default: 400)
 */
export const PongGame: React.FC<PongGameProps> = ({ 
  width = 800, 
  height = 400 
}) => {
  // Canvas reference for rendering
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Game state management
  const [gameState, setGameState] = useState<GameState>({
    leftPaddle: { y: height / 2 - 50 },
    rightPaddle: { y: height / 2 - 50 },
    ball: { x: width / 2, y: height / 2, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    status: 'ready', // Initial value
  });

  // Track currently pressed keys
  const [keys, setKeys] = useState<Set<string>>(new Set());

  /**
   * Keyboard event handlers
   * Manages key press and release events for paddle movement
   */
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

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  /**
   * Game logic loop
   * Handles ball movement, collision detection, and scoring
   */
  useEffect(() => {
    const paddleSpeed = 5;
    
    setGameState(prev => {
      let newLeftPaddle = { ...prev.leftPaddle };
      let newRightPaddle = { ...prev.rightPaddle };

      // Left paddle (W/S keys)
      if (keys.has('w') && newLeftPaddle.y > 0) {
        newLeftPaddle.y -= paddleSpeed;
      }
      if (keys.has('s') && newLeftPaddle.y < height - 100) {
        newLeftPaddle.y += paddleSpeed;
      }

      // Right paddle (Arrow Up/Down keys)
      if (keys.has('arrowup') && newRightPaddle.y > 0) {
        newRightPaddle.y -= paddleSpeed;
      }
      if (keys.has('arrowdown') && newRightPaddle.y < height - 100) {
        newRightPaddle.y += paddleSpeed;
      }

      return {
        ...prev,
        leftPaddle: newLeftPaddle,
        rightPaddle: newRightPaddle
      };
    });
  }, [keys, height]);

  /**
   * Rendering loop
   * Draws all game elements on the canvas
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderLoop = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#fff';
      ctx.fillRect(10, gameState.leftPaddle.y, 10, 100);
      ctx.fillRect(width - 20, gameState.rightPaddle.y, 10, 100);

      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();

      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      ctx.font = '24px Arial';
      ctx.fillStyle = '#fff';
      ctx.fillText(gameState.leftScore.toString(), width / 4, 30);
      ctx.fillText(gameState.rightScore.toString(), 3 * width / 4, 30);
    };

    const interval = setInterval(renderLoop, 16);
    return () => clearInterval(interval);
  }, [gameState, width, height]);

  /**
   * Animation loop using requestAnimationFrame
   * Provides smooth 60 FPS gameplay
   */
  useEffect(() => {
    const gameLoop = () => {
      setGameState(prevState => {
        const newBall = {
          x: prevState.ball.x + prevState.ball.dx,
          y: prevState.ball.y + prevState.ball.dy,
          dx: prevState.ball.dx,
          dy: prevState.ball.dy
        };

        // Wall collision
        if (newBall.y <= 0 || newBall.y >= height) {
          newBall.dy = -newBall.dy;
        }

        // Paddle collision
        if (newBall.x <= 20 && newBall.y >= prevState.leftPaddle.y && 
            newBall.y <= prevState.leftPaddle.y + 100) {
          newBall.dx = -newBall.dx;
        }

        if (newBall.x >= width - 20 && newBall.y >= prevState.rightPaddle.y && 
            newBall.y <= prevState.rightPaddle.y + 100) {
          newBall.dx = -newBall.dx;
        }

        // Score handling
        let newLeftScore = prevState.leftScore;
        let newRightScore = prevState.rightScore;

        if (newBall.x <= 0) {
          newRightScore++;
          newBall.x = width / 2;
          newBall.y = height / 2;
        } else if (newBall.x >= width) {
          newLeftScore++;
          newBall.x = width / 2;
          newBall.y = height / 2;
        }

        return {
          ...prevState,
          ball: newBall,
          leftScore: newLeftScore,
          rightScore: newRightScore
        };
      });
    };

    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [width, height]);

  return (
    <div className="flex flex-col items-center" data-testid="game-container">
      <h2 className="text-2xl mb-4">Pong Game</h2>
      
      {/* Game Controls */}
      <div className="mb-4 flex gap-2">
        <button 
          data-testid="start-button"
          onClick={() => setGameState(prev => ({ ...prev, status: 'playing' }))}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Start
        </button>
        <button 
          data-testid="pause-button"
          onClick={() => setGameState(prev => ({ ...prev, status: 'paused' }))}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Pause
        </button>
        <button 
          data-testid="reset-button"
          onClick={() => setGameState(prev => ({
            ...prev,
            leftScore: 0,
            rightScore: 0,
            ball: { x: width / 2, y: height / 2, dx: 5, dy: 3 },
            leftPaddle: { y: height / 2 - 50 },
            rightPaddle: { y: height / 2 - 50 },
            status: 'ready', // Set to ready on reset
          }))}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>

      {/* Game Status */}
      <div data-testid="game-status" className="mb-2 text-sm">
        {gameState.status === 'ready'
          ? 'Ready'
          : gameState.status === 'playing'
          ? 'Playing'
          : 'Paused'}
      </div>

      {/* Score Display */}
      <div data-testid="score" className="mb-2 text-lg font-bold">
        {gameState.leftScore} - {gameState.rightScore}
      </div>

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-white"
        aria-label="Pong game canvas"
        data-testid="game-board"
      />
      
      <div className="mt-4 text-sm text-gray-400">
        <p>Left Player: W (up) / S (down)</p>
        <p>Right Player: ↑ (up) / ↓ (down)</p>
      </div>
    </div>
  );
};