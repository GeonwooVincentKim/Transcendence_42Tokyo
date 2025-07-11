import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  gameRunning: boolean;
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
  
  // Animation frame reference for cleanup
  const animationRef = useRef<number | null>(null);
  
  // Game state management
  const [gameState, setGameState] = useState<GameState>({
    leftPaddle: { y: height / 2 - 50 },
    rightPaddle: { y: height / 2 - 50 },
    ball: { x: width / 2, y: height / 2, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    gameRunning: true
  });

  // Track currently pressed keys
  const [keys, setKeys] = useState<Set<string>>(new Set());

  /**
   * Keyboard event handlers
   * Manages key press and release events for paddle movement
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeys(prev => new Set([...prev, e.key]));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeys(prev => {
        const newKeys = new Set(prev);
        newKeys.delete(e.key);
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
  const gameLoop = useCallback(() => {
    setGameState(prevState => {
      if (!prevState.gameRunning) return prevState;

      // Update paddle positions based on key presses
      let newLeftPaddleY = prevState.leftPaddle.y;
      let newRightPaddleY = prevState.rightPaddle.y;

      // Left paddle controls (W/S keys)
      if (keys.has('w') || keys.has('W')) {
        newLeftPaddleY = Math.max(0, newLeftPaddleY - 5);
      }
      if (keys.has('s') || keys.has('S')) {
        newLeftPaddleY = Math.min(height - 100, newLeftPaddleY + 5);
      }

      // Right paddle controls (Arrow keys)
      if (keys.has('ArrowUp')) {
        newRightPaddleY = Math.max(0, newRightPaddleY - 5);
      }
      if (keys.has('ArrowDown')) {
        newRightPaddleY = Math.min(height - 100, newRightPaddleY + 5);
      }

      // Update ball position
      const newBall = {
        x: prevState.ball.x + prevState.ball.dx,
        y: prevState.ball.y + prevState.ball.dy,
        dx: prevState.ball.dx,
        dy: prevState.ball.dy
      };

      // Ball collision with top and bottom walls
      if (newBall.y <= 5 || newBall.y >= height - 5) {
        newBall.dy = -newBall.dy;
      }

      // Ball collision with paddles
      if (newBall.x <= 20 && newBall.y >= newLeftPaddleY && 
          newBall.y <= newLeftPaddleY + 100) {
        newBall.dx = -newBall.dx;
        // Add some randomness to ball direction for more dynamic gameplay
        newBall.dy += (Math.random() - 0.5) * 2;
      }

      if (newBall.x >= width - 20 && newBall.y >= newRightPaddleY && 
          newBall.y <= newRightPaddleY + 100) {
        newBall.dx = -newBall.dx;
        // Add some randomness to ball direction for more dynamic gameplay
        newBall.dy += (Math.random() - 0.5) * 2;
      }

      // Ball out of bounds (scoring)
      let newLeftScore = prevState.leftScore;
      let newRightScore = prevState.rightScore;

      if (newBall.x <= 0) {
        // Right player scores
        newRightScore++;
        // Reset ball to center
        newBall.x = width / 2;
        newBall.y = height / 2;
        newBall.dx = 5;
        newBall.dy = 3;
      } else if (newBall.x >= width) {
        // Left player scores
        newLeftScore++;
        // Reset ball to center
        newBall.x = width / 2;
        newBall.y = height / 2;
        newBall.dx = -5;
        newBall.dy = 3;
      }

      return {
        ...prevState,
        leftPaddle: { y: newLeftPaddleY },
        rightPaddle: { y: newRightPaddleY },
        ball: newBall,
        leftScore: newLeftScore,
        rightScore: newRightScore
      };
    });
  }, [keys, width, height]);

  /**
   * Rendering loop
   * Draws all game elements on the canvas
   */
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(10, gameState.leftPaddle.y, 10, 100);
    ctx.fillRect(width - 20, gameState.rightPaddle.y, 10, 100);

    // Draw ball
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Draw center line (dashed)
    ctx.setLineDash([5, 15]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Draw scores
    ctx.font = '24px Arial';
    ctx.fillStyle = '#fff';
    ctx.fillText(gameState.leftScore.toString(), width / 4, 30);
    ctx.fillText(gameState.rightScore.toString(), 3 * width / 4, 30);

    // Draw controls hint
    ctx.font = '16px Arial';
    ctx.fillStyle = '#666';
    ctx.fillText('W/S: Left Paddle, Arrow Keys: Right Paddle', 10, height - 10);
  }, [gameState, width, height]);

  /**
   * Animation loop using requestAnimationFrame
   * Provides smooth 60 FPS gameplay
   */
  useEffect(() => {
    const animate = () => {
      gameLoop();
      renderLoop();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    // Cleanup animation frame on unmount
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, renderLoop]);

  return (
    <div className="flex flex-col items-center" data-testid="game-container">
      <h2 className="text-2xl mb-4">Pong Game</h2>
      
      {/* Game Controls */}
      <div className="mb-4 flex gap-2">
        <button 
          data-testid="start-button"
          onClick={() => setGameState(prev => ({ ...prev, gameRunning: true }))}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Start
        </button>
        <button 
          data-testid="pause-button"
          onClick={() => setGameState(prev => ({ ...prev, gameRunning: false }))}
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
            rightPaddle: { y: height / 2 - 50 }
          }))}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reset
        </button>
      </div>

      {/* Game Status */}
      <div data-testid="game-status" className="mb-2 text-sm">
        {gameState.gameRunning ? 'Playing' : 'Paused'}
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
        <p>Controls: W/S (Left Paddle) | Arrow Keys (Right Paddle)</p>
      </div>
    </div>
  );
};