/**
 * AI-Pong Component Tests
 * 
 * Tests for the AI-Pong component functionality including authentication,
 * game session management, and statistics tracking.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIPong } from '../AIPong';
import { AuthService } from '../../services/authService';
import { GameStatsService } from '../../services/gameStatsService';

// Mock the services
vi.mock('../../services/authService');
vi.mock('../../services/gameStatsService');

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  onopen: vi.fn(),
  onmessage: vi.fn(),
  onclose: vi.fn(),
  onerror: vi.fn()
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

describe('AIPong Component', () => {
  const mockRoomId = 'test-room-123';
  const mockSessionId = 'session-456';

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock authentication
    (AuthService.isAuthenticated as any).mockReturnValue(true);
    
    // Mock game session creation
    (GameStatsService.createGameSession as any).mockResolvedValue(mockSessionId);
    
    // Mock game result saving
    (GameStatsService.saveGameResult as any).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render AI-Pong component with correct title', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      expect(screen.getByText('Player vs AI')).toBeInTheDocument();
      expect(screen.getByText('Use W/S keys to move your paddle (left side)')).toBeInTheDocument();
      expect(screen.getByText('Press SPACE to start the game')).toBeInTheDocument();
    });

    test('should render canvas element', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      const canvas = screen.getByLabelText('Pong game canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveAttribute('width', '800');
      expect(canvas).toHaveAttribute('height', '400');
    });

    test('should show connection status', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      expect(screen.getByText('Disconnected from game server')).toBeInTheDocument();
    });
  });

  describe('Authentication Integration', () => {
    test('should create game session when authenticated', async () => {
      render(<AIPong roomId={mockRoomId} />);
      
      await waitFor(() => {
        expect(GameStatsService.createGameSession).toHaveBeenCalledWith('ai', mockRoomId);
      });
    });

    test('should not create game session when not authenticated', async () => {
      (AuthService.isAuthenticated as any).mockReturnValue(false);
      
      render(<AIPong roomId={mockRoomId} />);
      
      await waitFor(() => {
        expect(GameStatsService.createGameSession).not.toHaveBeenCalled();
      });
    });
  });

  describe('WebSocket Integration', () => {
    test('should connect to WebSocket on mount', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      expect(global.WebSocket).toHaveBeenCalledWith(`ws://127.0.0.1:8000/ws/game/${mockRoomId}`);
    });

    test('should handle WebSocket open event', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate WebSocket open
      mockWebSocket.onopen();
      
      // Wait for connection status to update
      waitFor(() => {
        expect(screen.getByText('Connected to game server')).toBeInTheDocument();
      });
    });

    test('should handle game start message', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game start message
      const gameStartMessage = {
        type: 'game_start',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameStartMessage) });
      
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    test('should handle game over message', async () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game over message (player wins)
      const gameOverMessage = {
        type: 'game_state_update',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 11,
          rightScore: 8
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameOverMessage) });
      
      await waitFor(() => {
        expect(screen.getByText('You Won!')).toBeInTheDocument();
        expect(screen.getByText('Final Score: 11 - AI Score')).toBeInTheDocument();
      });
    });
  });

  describe('Game Controls', () => {
    test('should show start button when game is ready', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    test('should show pause button when game is playing', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game start
      const gameStartMessage = {
        type: 'game_start',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameStartMessage) });
      
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    test('should send start game message when start button is clicked', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'game_start'
      }));
    });

    test('should send pause game message when pause button is clicked', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // First start the game
      const gameStartMessage = {
        type: 'game_start',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameStartMessage) });
      
      const pauseButton = screen.getByText('Pause');
      fireEvent.click(pauseButton);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'game_pause'
      }));
    });

    test('should send reset game message when reset button is clicked', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      const resetButton = screen.getByText('Reset');
      fireEvent.click(resetButton);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'game_reset'
      }));
    });
  });

  describe('Keyboard Controls', () => {
    test('should handle space key to start game', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      fireEvent.keyDown(document, { code: 'Space' });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'game_start'
      }));
    });

    test('should handle W key for paddle movement', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Start the game first
      const gameStartMessage = {
        type: 'game_start',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameStartMessage) });
      
      fireEvent.keyDown(document, { key: 'w' });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'paddle_move',
        player: 'left',
        y: 192 // 200 - 8 (paddle speed)
      }));
    });

    test('should handle S key for paddle movement', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Start the game first
      const gameStartMessage = {
        type: 'game_start',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 0,
          rightScore: 0
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameStartMessage) });
      
      fireEvent.keyDown(document, { key: 's' });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'paddle_move',
        player: 'left',
        y: 208 // 200 + 8 (paddle speed)
      }));
    });
  });

  describe('Game Statistics', () => {
    test('should save game result when game ends', async () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game over (player wins)
      const gameOverMessage = {
        type: 'game_state_update',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 11,
          rightScore: 8
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameOverMessage) });
      
      await waitFor(() => {
        expect(GameStatsService.saveGameResult).toHaveBeenCalledWith({
          sessionId: mockSessionId,
          playerSide: 'left',
          score: 11,
          won: true,
          gameType: 'ai'
        });
      });
    });

    test('should save game result when player loses', async () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game over (player loses)
      const gameOverMessage = {
        type: 'game_state_update',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 8,
          rightScore: 11
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameOverMessage) });
      
      await waitFor(() => {
        expect(GameStatsService.saveGameResult).toHaveBeenCalledWith({
          sessionId: mockSessionId,
          playerSide: 'left',
          score: 8,
          won: false,
          gameType: 'ai'
        });
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket connection error', () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate WebSocket error
      mockWebSocket.onerror(new Error('Connection failed'));
      
      expect(screen.getByText('Disconnected from game server')).toBeInTheDocument();
    });

    test('should handle game session creation error', async () => {
      (GameStatsService.createGameSession as any).mockRejectedValue(new Error('Session creation failed'));
      
      render(<AIPong roomId={mockRoomId} />);
      
      // Should not throw error, just log it
      await waitFor(() => {
        expect(GameStatsService.createGameSession).toHaveBeenCalled();
      });
    });

    test('should handle game result saving error', async () => {
      (GameStatsService.saveGameResult as any).mockRejectedValue(new Error('Save failed'));
      
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game over
      const gameOverMessage = {
        type: 'game_state_update',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 11,
          rightScore: 8
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameOverMessage) });
      
      // Should not throw error, just log it
      await waitFor(() => {
        expect(GameStatsService.saveGameResult).toHaveBeenCalled();
      });
    });
  });

  describe('Game Over Modal', () => {
    test('should show game over modal when game ends', async () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game over
      const gameOverMessage = {
        type: 'game_state_update',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 11,
          rightScore: 8
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameOverMessage) });
      
      await waitFor(() => {
        expect(screen.getByText('You Won!')).toBeInTheDocument();
        expect(screen.getByText('Play Again')).toBeInTheDocument();
      });
    });

    test('should hide game over modal and reset game when play again is clicked', async () => {
      render(<AIPong roomId={mockRoomId} />);
      
      // Simulate game over
      const gameOverMessage = {
        type: 'game_state_update',
        data: {
          leftPaddle: { y: 200 },
          rightPaddle: { y: 200 },
          ball: { x: 400, y: 200, dx: 5, dy: 3 },
          leftScore: 11,
          rightScore: 8
        }
      };
      
      mockWebSocket.onmessage({ data: JSON.stringify(gameOverMessage) });
      
      await waitFor(() => {
        const playAgainButton = screen.getByText('Play Again');
        fireEvent.click(playAgainButton);
      });
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify({
        type: 'game_reset'
      }));
    });
  });
}); 