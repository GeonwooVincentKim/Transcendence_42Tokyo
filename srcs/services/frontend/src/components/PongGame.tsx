
// // src/components/PongGame.tsx
// import React, { useEffect, useRef, useState } from 'react';

// // Props interface remains the same
// interface PongGameProps {
//   width?: number;
//   height?: number;
// }

// // State for things that should trigger a re-render (UI elements)
// interface GameUIState {
//   leftScore: number;
//   rightScore: number;
//   status: 'ready' | 'playing' | 'paused';
// }

// /**
//  * Optimized Pong Game Component
//  */
// export const PongGame: React.FC<PongGameProps> = ({ 
//   width = 800, 
//   height = 400 
// }) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
  
//   // *** CHANGE #1: Use state ONLY for UI data that needs to re-render the component ***
//   const [uiState, setUiState] = useState<GameUIState>({
//     leftScore: 0,
//     rightScore: 0,
//     status: 'ready',
//   });

//   // *** CHANGE #2: Use a ref for all high-frequency game data (physics) ***
//   // This data can be updated 60 times/sec without causing any re-renders.
//   const gameStateRef = useRef({
//     leftPaddle: { y: height / 2 - 50 },
//     rightPaddle: { y: height / 2 - 50 },
//     ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
//     scoreResetCountdown: 0, //a new timer
//     lastScorer: 1,
//   });

//   // Keep track of pressed keys. Using a ref is also efficient here.
//   const keysPressed = useRef<Set<string>>(new Set());

// useEffect(() => {
//   // Define the keys we are using for the game
//   const gameKeys = ['w', 's', 'arrowup', 'arrowdown'];

//   const handleKeyDown = (e: KeyboardEvent) => {
//     const key = e.key.toLowerCase();
//     // Check if the pressed key is one of our game keys
//     if (gameKeys.includes(key)) {
//       // The magic line! Prevent the browser's default action (e.g., scrolling)
//       e.preventDefault();
//     }
//     // Add the key to our set of pressed keys
//     keysPressed.current.add(key);
//   };

//   const handleKeyUp = (e: KeyboardEvent) => {
//     keysPressed.current.delete(e.key.toLowerCase());
//   };

//   window.addEventListener('keydown', handleKeyDown);
//   window.addEventListener('keyup', handleKeyUp);
//   return () => {
//     window.removeEventListener('keydown', handleKeyDown);
//     window.removeEventListener('keyup', handleKeyUp);
//   };
// }, []); // The empty dependency array is correct, this should only run once.

//   /**
//    * *** CHANGE #3: A single, unified game loop using requestAnimationFrame ***
//    * This is much smoother and more efficient than setInterval.
//    */
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     let animationFrameId: number;

//     const gameLoop = () => {
//       // 1. Get current state from the ref
//       const gameState = gameStateRef.current;

//       // --- PADDLE MOVEMENT LOGIC ---
//       const paddleSpeed = 5;
//       if (keysPressed.current.has('w') && gameState.leftPaddle.y > 0) {
//         gameState.leftPaddle.y -= paddleSpeed;
//       }
//       if (keysPressed.current.has('s') && gameState.leftPaddle.y < height - 100) {
//         gameState.leftPaddle.y += paddleSpeed;
//       }
//       if (keysPressed.current.has('arrowup') && gameState.rightPaddle.y > 0) {
//         gameState.rightPaddle.y -= paddleSpeed;
//       }
//       if (keysPressed.current.has('arrowdown') && gameState.rightPaddle.y < height - 100) {
//         gameState.rightPaddle.y += paddleSpeed;
//       }

//       if (gameState.scoreResetCountdown > 0) {
//         // If the timer is active, just count it down.
//         gameState.scoreResetCountdown--;
//         // When the timer hits zero, serve the ball.
//         if (gameState.scoreResetCountdown === 0) {
//           // Serve towards the loser. lastScorer is the WINNER.
//           // So we multiply by lastScorer to get the direction.
//           gameState.ball.dx = 5 * gameState.lastScorer;
//           // Always serve downwards as requested.
//           gameState.ball.dy = 3; 
//         }
//       } else {
//         // --- BALL MOVEMENT & COLLISION LOGIC ---
//         gameState.ball.x += gameState.ball.dx;
//         gameState.ball.y += gameState.ball.dy;

//         // Wall collision
//         if (gameState.ball.y <= 0 || gameState.ball.y >= height) {
//           gameState.ball.dy *= -1;
//         }

//         // Paddle collision
//         if (gameState.ball.x <= 20 && gameState.ball.x > 10 && gameState.ball.y >= gameState.leftPaddle.y && gameState.ball.y <= gameState.leftPaddle.y + 100) {
//           gameState.ball.dx *= -1;
//         }
//         if (gameState.ball.x >= width - 20 && gameState.ball.x < width - 10 && gameState.ball.y >= gameState.rightPaddle.y && gameState.ball.y <= gameState.rightPaddle.y + 100) {
//           gameState.ball.dx *= -1;
//         }

//         // Score handling
//         let scoreChanged = false;
//         if (gameState.ball.x <= 0) { // Right player scored
//           setUiState(prev => ({...prev, rightScore: prev.rightScore + 1}));
//           gameState.lastScorer = 1; // Set right player as the last scorer
//           scoreChanged = true;
//         } else if (gameState.ball.x >= width) { // Left player scored
//           setUiState(prev => ({...prev, leftScore: prev.leftScore + 1}));
//           gameState.lastScorer = -1; // Set left player as the last scorer
//           scoreChanged = true;
//         }

//         if (scoreChanged) {
//           // --- START THE COUNTDOWN ---
//           // 1. Stop the ball immediately
//           gameState.ball.dx = 0;
//           gameState.ball.dy = 0;
//           // 2. Reset its position
//           gameState.ball.x = width / 2;
//           gameState.ball.y = height / 2;
//           // 3. Start the countdown timer (120 frames = 2 seconds)
//           gameState.scoreResetCountdown = 120;
//         }
//       }
//       // --- DRAWING LOGIC ---
//       // Clear canvas
//       ctx.fillStyle = '#000';
//       ctx.fillRect(0, 0, width, height);

//       // Draw paddles and ball from the ref's data
//       ctx.fillStyle = '#fff';
//       ctx.fillRect(10, gameState.leftPaddle.y, 10, 100);
//       ctx.fillRect(width - 20, gameState.rightPaddle.y, 10, 100);
//       ctx.beginPath();
//       ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, 2 * Math.PI);
//       ctx.fill();

//       // Draw dashed line (this is static, but needs to be redrawn)
//       ctx.setLineDash([5, 15]);
//       ctx.beginPath();
//       ctx.moveTo(width / 2, 0);
//       ctx.lineTo(width / 2, height);
//       ctx.strokeStyle = '#fff';
//       ctx.stroke();

//       // Loop
//       animationFrameId = requestAnimationFrame(gameLoop);
//     };

// // Start or stop the loop based on game status
//     if (uiState.status === 'playing') {
//       if (gameStateRef.current.ball.dx === 0 && gameStateRef.current.ball.dy === 0) {
//           gameStateRef.current.scoreResetCountdown = 60; // 1-second delay for the first serve
//       }
      
//       animationFrameId = requestAnimationFrame(gameLoop);
//     }

//     // Cleanup function to cancel the loop when component unmounts or status changes
//     return () => {
//       cancelAnimationFrame(animationFrameId);
//     };
//   }, [uiState.status, width, height]); // Re-run this effect only when status changes

//   // Function to handle resetting the game
//   const handleReset = () => {
//     // Reset the ref's data
//     gameStateRef.current = {
//       leftPaddle: { y: height / 2 - 50 },
//       rightPaddle: { y: height / 2 - 50 },
//       ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
//       scoreResetCountdown: 0, 
//       lastScorer: 1,
//     };
//     // Reset the UI state
//     setUiState({
//       leftScore: 0,
//       rightScore: 0,
//       status: 'ready',
//     });
//   };

//   return (
//     <div className="flex flex-col items-center" data-testid="game-container">
//       <h2 className="text-2xl mb-4">Pong Game</h2>
      
//       {/* Game Controls */}
//       <div className="mb-4 flex gap-2">
//         <button onClick={() => setUiState(prev => ({ ...prev, status: 'playing' }))}>Start</button>
//         <button onClick={() => setUiState(prev => ({ ...prev, status: 'paused' }))}>Pause</button>
//         <button onClick={handleReset}>Reset</button>
//       </div>

//       {/* Status and Score read from the UI state */}
//       <div data-testid="game-status" className="mb-2 text-sm">
//         {uiState.status === 'ready' && 'Ready'}
//         {uiState.status === 'playing' && 'Playing'}
//         {uiState.status === 'paused' && 'Paused'}
//       </div>
//       <div data-testid="score" className="mb-2 text-lg font-bold">
//         {uiState.leftScore} - {uiState.rightScore}
//       </div>

//       {/* The canvas only needs to re-render if its size changes */}
//       <canvas
//         ref={canvasRef}
//         width={width}
//         height={height}
//         className="border border-white"
//         aria-label="Pong game canvas"
//       />
      
//       <div className="mt-4 text-sm text-gray-400">
//         <p>Left Player: W (up) / S (down)</p>
//         <p>Right Player: ↑ (up) / ↓ (down)</p>
//       </div>
//     </div>
//   );
// };


// import React, { useEffect, useRef, useState } from 'react';

// // Props and State interfaces are correct
// interface PongGameProps {
//   width?: number;
//   height?: number;
// }
// interface GameUIState {
//   leftScore: number;
//   rightScore: number;
//   status: 'ready' | 'playing' | 'paused';
// }

// /**
//  * Optimized and Corrected Pong Game Component
//  */
// export const PongGame: React.FC<PongGameProps> = ({ 
//   width = 800, 
//   height = 400 
// }) => {
//   const canvasRef = useRef<HTMLCanvasElement>(null);
  
//   const [uiState, setUiState] = useState<GameUIState>({
//     leftScore: 0,
//     rightScore: 0,
//     status: 'ready',
//   });

//   // The state of the game physics. Ball starts with ZERO speed.
//   const gameStateRef = useRef({
//     leftPaddle: { y: height / 2 - 50 },
//     rightPaddle: { y: height / 2 - 50 },
//     ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
//     scoreResetCountdown: 60,
//     lastScorer: 1,
//   });

//   const keysPressed = useRef<Set<string>>(new Set());

//   // Keyboard handler is correct.
//   useEffect(() => {
//     const gameKeys = ['w', 's', 'arrowup', 'arrowdown'];
//     const handleKeyDown = (e: KeyboardEvent) => {
//       const key = e.key.toLowerCase();
//       if (gameKeys.includes(key)) e.preventDefault();
//       keysPressed.current.add(key);
//     };
//     const handleKeyUp = (e: KeyboardEvent) => {
//       keysPressed.current.delete(e.key.toLowerCase());
//     };
//     window.addEventListener('keydown', handleKeyDown);
//     window.addEventListener('keyup', handleKeyUp);
//     return () => {
//       window.removeEventListener('keydown', handleKeyDown);
//       window.removeEventListener('keyup', handleKeyUp);
//     };
//   }, []);

//   // The main game loop and logic driver.
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;

//     let animationFrameId: number;

//     const gameLoop = () => {
//       const gameState = gameStateRef.current;

//       // Paddle Movement
//       const paddleSpeed = 5;
//       if (keysPressed.current.has('w') && gameState.leftPaddle.y > 0) gameState.leftPaddle.y -= paddleSpeed;
//       if (keysPressed.current.has('s') && gameState.leftPaddle.y < height - 100) gameState.leftPaddle.y += paddleSpeed;
//       if (keysPressed.current.has('arrowup') && gameState.rightPaddle.y > 0) gameState.rightPaddle.y -= paddleSpeed;
//       if (keysPressed.current.has('arrowdown') && gameState.rightPaddle.y < height - 100) gameState.rightPaddle.y += paddleSpeed;

//       // This is the "gatekeeper". If the countdown is active, it runs this block and skips the rest.
//       if (gameState.scoreResetCountdown > 0) {
//         gameState.scoreResetCountdown--;
//         // When the timer hits zero, we SERVE THE BALL.
//         if (gameState.scoreResetCountdown === 0) {
//           // Serve towards the loser (`lastScorer` is the winner)
//           gameState.ball.dx = 5 * gameState.lastScorer;
//           // UNAMBIGUOUSLY serve downwards. `dy = 3` is always down.
//           gameState.ball.dy = 3;
//         }
//       } else {
//         // This block only runs when the game is in active play (no countdown).
//         gameState.ball.x += gameState.ball.dx;
//         gameState.ball.y += gameState.ball.dy;

//         // Wall and Paddle collision logic
//         if (gameState.ball.y <= 0 || gameState.ball.y >= height) gameState.ball.dy *= -1;
//         if (gameState.ball.x <= 20 && gameState.ball.x > 10 && gameState.ball.y >= gameState.leftPaddle.y && gameState.ball.y <= gameState.leftPaddle.y + 100) gameState.ball.dx *= -1;
//         if (gameState.ball.x >= width - 20 && gameState.ball.x < width - 10 && gameState.ball.y >= gameState.rightPaddle.y && gameState.ball.y <= gameState.rightPaddle.y + 100) gameState.ball.dx *= -1;
        
//         // Score detection
//         let scoreChanged = false;
//         if (gameState.ball.x <= 0) { // Right player scored
//           setUiState(prev => ({...prev, rightScore: prev.rightScore + 1}));
//           gameState.lastScorer = 1;
//           scoreChanged = true;
//         } else if (gameState.ball.x >= width) { // Left player scored
//           setUiState(prev => ({...prev, leftScore: prev.leftScore + 1}));
//           gameState.lastScorer = -1;
//           scoreChanged = true;
//         }

//         // If a score happened, we STOP the ball and START the countdown.
//         if (scoreChanged) {
//           gameState.ball.dx = 0;
//           gameState.ball.dy = 0;
//           gameState.ball.x = width / 2;
//           gameState.ball.y = height / 2;
//           gameState.scoreResetCountdown = 120; // This starts the 2-second delay.
//         }
//       }
      
//       // Drawing logic always runs
//       ctx.fillStyle = '#000';
//       ctx.fillRect(0, 0, width, height);
//       ctx.fillStyle = '#fff';
//       ctx.fillRect(10, gameState.leftPaddle.y, 10, 100);
//       ctx.fillRect(width - 20, gameState.rightPaddle.y, 10, 100);
//       ctx.beginPath();
//       ctx.arc(gameState.ball.x, gameState.ball.y, 5, 0, 2 * Math.PI);
//       ctx.fill();
//       ctx.setLineDash([5, 15]);
//       ctx.beginPath();
//       ctx.moveTo(width / 2, 0);
//       ctx.lineTo(width / 2, height);
//       ctx.strokeStyle = '#fff';
//       ctx.stroke();

//       animationFrameId = requestAnimationFrame(gameLoop);
//     };

//     // === FINAL FIX #2: THE "IGNITION" LOGIC ===
//     // This effect runs when status changes to 'playing'.
//     if (uiState.status === 'playing') {
//       // Check if this is the start of a new round (ball is not moving).
//       if (gameStateRef.current.ball.dx === 0 && gameStateRef.current.ball.dy === 0) {
//         // Kick-start the countdown for the VERY FIRST SERVE.
//         gameStateRef.current.scoreResetCountdown = 60; // 1-second delay
//       }
//       // Start the game loop.
//       animationFrameId = requestAnimationFrame(gameLoop);
//     }

//     // Cleanup function to stop the loop.
//     return () => {
//       cancelAnimationFrame(animationFrameId);
//     };
//   }, [uiState.status, width, height]);

//   // The reset function. MUST reset the ball to have zero speed.
//   const handleReset = () => {
//     setUiState(prev => ({ ...prev, status: 'ready' }));
//     gameStateRef.current = {
//       leftPaddle: { y: height / 2 - 50 },
//       rightPaddle: { y: height / 2 - 50 },
//       ball: { x: width / 2, y: height / 2, dx: 0, dy: 0 },
//       scoreResetCountdown: 60,
//       lastScorer: 1,
//     };
//     setUiState({
//       leftScore: 0,
//       rightScore: 0,
//       status: 'ready',
//     });
//   };

//   // The JSX is correct.
//   return (
//     <div className="flex flex-col items-center" data-testid="game-container">
//       <h2 className="text-2xl mb-4">Pong Game</h2>
//       <div className="mb-4 flex gap-2">
//         <button onClick={() => setUiState(prev => ({ ...prev, status: 'playing' }))}>Start</button>
//         <button onClick={() => setUiState(prev => ({ ...prev, status: 'paused' }))}>Pause</button>
//         <button onClick={handleReset}>Reset</button>
//       </div>
//       <div data-testid="game-status" className="mb-2 text-sm">
//         {uiState.status === 'ready' && 'Ready'}
//         {uiState.status === 'playing' && 'Playing'}
//         {uiState.status === 'paused' && 'Paused'}
//       </div>
//       <div data-testid="score" className="mb-2 text-lg font-bold">
//         {uiState.leftScore} - {uiState.rightScore}
//       </div>
//       <canvas
//         ref={canvasRef}
//         width={width}
//         height={height}
//         className="border border-white"
//         aria-label="Pong game canvas"
//       />
//       <div className="mt-4 text-sm text-gray-400">
//         <p>Left Player: W (up) / S (down)</p>
//         <p>Right Player: ↑ (up) / ↓ (down)</p>
//       </div>
//     </div>
//   );
// };

import React from 'react';
import { usePongEngine } from '../hooks/usePongEngine';
import { useHumanController } from '../hooks/useHumanController';

/**
 * The Player vs. Player Pong game component.
 * It assembles the core game engine with two human-controlled paddle controllers.
 */
export const PongGame: React.FC = () => {
  // 1. Initialize the core game engine. This gives us the state, the canvas ref,
  //    and the controls to manipulate the engine.
  const { canvasRef, gameState, controls } = usePongEngine();
  
  // 2. Initialize a controller for the LEFT paddle.
  //    We pass it the engine's standardized movement function.
  useHumanController(controls.setPaddleMovement, 'left');

  // 3. Initialize another controller for the RIGHT paddle.
  //    This demonstrates the power of reusable hooks.
  useHumanController(controls.setPaddleMovement, 'right');

  // 4. Render the UI, using the state and controls provided by the engine.
  return (
    <div className="flex flex-col items-center" data-testid="game-container">
      <h2 className="text-2xl mb-4">Player vs. Player</h2>
      
      {/* The buttons call the control functions directly from the engine hook */}
      <div className="mb-4 flex gap-2">
        <button onClick={controls.start}>Start</button>
        <button onClick={controls.pause}>Pause</button>
        <button onClick={controls.reset}>Reset</button>
      </div>

      {/* The UI reads its data directly from the gameState object */}
      <div data-testid="game-status" className="mb-2 text-sm">
        Status: {gameState.status}
      </div>
      <div data-testid="score" className="mb-2 text-lg font-bold">
        {gameState.leftScore} - {gameState.rightScore}
      </div>

      {/* The canvas element is linked to the engine via the canvasRef */}
      <canvas
        ref={canvasRef}
        width={800}
        height={400}
        className="border border-white"
        aria-label="Pong game canvas"
      />
      
      {/* Static instructions for the players */}
      <div className="mt-4 text-sm text-gray-400">
        <p>Left Player: W (up) / S (down)</p>
        <p>Right Player: ↑ (up) / ↓ (down)</p>
      </div>
    </div>
  );
};