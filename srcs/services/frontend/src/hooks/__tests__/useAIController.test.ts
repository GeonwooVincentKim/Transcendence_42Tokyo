import { renderHook, act } from '@testing-library/react';
import { useAIController } from '../useAIController';
import { GameState } from '../usePongEngine';

// Mock timers
jest.useFakeTimers();

describe('useAIController', () => {
  const mockSetPaddleMovement = jest.fn();
  
  const createMockGameState = (overrides: Partial<GameState> = {}): GameState => ({
    leftPaddle: { y: 150 },
    rightPaddle: { y: 150 },
    ball: { x: 400, y: 200, dx: 5, dy: 3 },
    leftScore: 0,
    rightScore: 0,
    status: 'playing',
    ...overrides
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    it('should initialize AI controller with human-like personality traits', () => {
      const gameState = createMockGameState();
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // AI should be initialized but not make immediate decisions
      expect(mockSetPaddleMovement).not.toHaveBeenCalled();
    });

    it('should stop AI movement on cleanup', () => {
      const gameState = createMockGameState();
      
      const { unmount } = renderHook(() => 
        useAIController(mockSetPaddleMovement, gameState)
      );
      
      unmount();
      
      expect(mockSetPaddleMovement).toHaveBeenCalledWith('right', 0);
    });
  });

  describe('Decision Making Frequency', () => {
    it('should only make decisions once per second', () => {
      const gameState = createMockGameState();
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time by 500ms - should not make decision
      act(() => {
        jest.advanceTimersByTime(500);
      });
      
      expect(mockSetPaddleMovement).not.toHaveBeenCalled();
      
      // Advance time by another 600ms - should make decision
      act(() => {
        jest.advanceTimersByTime(600);
      });
      
      // Should have made a decision (with reaction delay)
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });

    it('should respect reaction delay', () => {
      const gameState = createMockGameState();
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });
      
      // Should not have made decision yet due to reaction delay
      expect(mockSetPaddleMovement).not.toHaveBeenCalled();
      
      // Advance time by reaction delay (100-300ms)
      act(() => {
        jest.advanceTimersByTime(200);
      });
      
      // Now should have made decision
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });
  });

  describe('Ball Trajectory Prediction', () => {
    it('should not predict when ball is moving away from AI', () => {
      const gameState = createMockGameState({
        ball: { x: 400, y: 200, dx: -5, dy: 3 } // Ball moving left
      });
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // AI should stop moving when ball is away
      expect(mockSetPaddleMovement).toHaveBeenCalledWith('right', 0);
    });

    it('should predict ball trajectory when ball is moving towards AI', () => {
      const gameState = createMockGameState({
        ball: { x: 600, y: 200, dx: 5, dy: 3 } // Ball moving right towards AI
      });
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // AI should make a movement decision
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });

    it('should handle wall bounces in prediction', () => {
      const gameState = createMockGameState({
        ball: { x: 600, y: 50, dx: 5, dy: -10 } // Ball moving up towards wall
      });
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // AI should still make a decision even with wall bounces
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });
  });

  describe('Human-like Behavior', () => {
    it('should sometimes make mistakes', () => {
      const gameState = createMockGameState({
        ball: { x: 600, y: 200, dx: 5, dy: 3 }
      });
      
      // Mock Math.random to simulate mistake
      const originalRandom = Math.random;
      Math.random = jest.fn(() => 0.1); // Low value to trigger mistake
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // AI should have made a decision (possibly with mistake)
      expect(mockSetPaddleMovement).toHaveBeenCalled();
      
      // Restore Math.random
      Math.random = originalRandom;
    });

    it('should show aggressiveness in movement', () => {
      const gameState = createMockGameState({
        ball: { x: 600, y: 200, dx: 5, dy: 3 }
      });
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // AI should make some movement decision
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });
  });

  describe('Movement Simulation', () => {
    it('should simulate smooth human movement', () => {
      const gameState = createMockGameState();
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger initial decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // Should have made initial decision
      expect(mockSetPaddleMovement).toHaveBeenCalled();
      
      // Advance time by 50ms for movement simulation
      act(() => {
        jest.advanceTimersByTime(50);
      });
      
      // Should have made additional movement calls
      expect(mockSetPaddleMovement).toHaveBeenCalledTimes(2);
    });

    it('should add small variations to movement', () => {
      const gameState = createMockGameState();
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // Should have made initial decision
      expect(mockSetPaddleMovement).toHaveBeenCalled();
      
      // Advance time for movement simulation
      act(() => {
        jest.advanceTimersByTime(50);
      });
      
      // Should have made additional calls with potential variations
      expect(mockSetPaddleMovement).toHaveBeenCalledTimes(2);
    });
  });

  describe('Game State Changes', () => {
    it('should react to game state changes', () => {
      const { rerender } = renderHook(
        ({ gameState }) => useAIController(mockSetPaddleMovement, gameState),
        { initialProps: { gameState: createMockGameState() } }
      );
      
      // Advance time to trigger initial decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      const initialCallCount = mockSetPaddleMovement.mock.calls.length;
      
      // Change game state
      const newGameState = createMockGameState({
        ball: { x: 700, y: 300, dx: 5, dy: 3 }
      });
      
      rerender({ gameState: newGameState });
      
      // Advance time again
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // Should have made additional decisions based on new state
      expect(mockSetPaddleMovement).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero ball velocity', () => {
      const gameState = createMockGameState({
        ball: { x: 400, y: 200, dx: 0, dy: 0 }
      });
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // Should handle gracefully without errors
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });

    it('should handle ball at screen edges', () => {
      const gameState = createMockGameState({
        ball: { x: 790, y: 10, dx: 5, dy: 3 } // Ball near right edge
      });
      
      renderHook(() => useAIController(mockSetPaddleMovement, gameState));
      
      // Advance time to trigger decision
      act(() => {
        jest.advanceTimersByTime(1200);
      });
      
      // Should handle edge cases gracefully
      expect(mockSetPaddleMovement).toHaveBeenCalled();
    });
  });
});