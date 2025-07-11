import React, { useEffect, useRef, useState, useCallback } from 'react';

interface PongGameProps {
  width?: number;
  height?: number;
}

interface GameState {
  leftPaddle: { y: number };
  rightPaddle: { y: number };
  ball: { x: number; y: number; dx: number; dy: number };
  leftScore: number;
  rightScore: number;
  gameRunning: boolean;
}

export const PongGame: React.FC<PongGameProps> = ({ 
  width = 800, 
  height = 400 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    leftPaddle: { y: height / 2 - 50 },
    rightPaddle: { y: height / 2 - 50 },
    ball: { x: width / 2, y: height / 2, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    gameRunning: true
  });

  const emptySet: Set<string> = new Set();
  const [keys, setKeys] = useState(emptySet);

  // Keyboard event handlers
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Game loop
  const gameLoop = useCallback(() => {
    setGameState(prevState => {
      if (!prevState.gameRunning) return prevState;

      // Update paddle positions based on keys
      let newLeftPaddleY = prevState.leftPaddle.y;
      let newRightPaddleY = prevState.rightPaddle.y;

      if (keys.has('w') || keys.has('W')) {
        newLeftPaddleY = Math.max(0, newLeftPaddleY - 5);
      }
      if (keys.has('s') || keys.has('S')) {
        newLeftPaddleY = Math.min(height - 100, newLeftPaddleY + 5);
      }
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
        // Add some randomness to ball direction
        newBall.dy += (Math.random() - 0.5) * 2;
      }

      if (newBall.x >= width - 20 && newBall.y >= newRightPaddleY && 
          newBall.y <= newRightPaddleY + 100) {
        newBall.dx = -newBall.dx;
        // Add some randomness to ball direction
        newBall.dy += (Math.random() - 0.5) * 2;
      }

      // Ball out of bounds (scoring)
      let newLeftScore = prevState.leftScore;
      let newRightScore = prevState.rightScore;

      if (newBall.x <= 0) {
        newRightScore++;
        newBall.x = width / 2;
        newBall.y = height / 2;
        newBall.dx = 5;
        newBall.dy = 3;
      } else if (newBall.x >= width) {
        newLeftScore++;
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

  // Render loop
  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
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

    // Draw center line
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

  // Animation loop
  useEffect(() => {
    const animate = () => {
      gameLoop();
      renderLoop();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, renderLoop]);

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-2xl mb-4">Pong Game</h2>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-white"
      />
      <div className="mt-4 text-sm text-gray-400">
        <p>Controls: W/S (Left Paddle) | Arrow Keys (Right Paddle)</p>
      </div>
    </div>
  );
};