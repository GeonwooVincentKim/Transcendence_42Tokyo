import React from 'react';
import { render, screen } from '@testing-library/react';
import { PongGame } from './PongGame';
import { GameSettingsProvider } from '../contexts/GameSettingsContext';

/**
 * Test suite for PongGame component
 */
describe('PongGame Component', () => {
  /**
   * Test that the component renders without crashing
   */
  it('should render the game title', () => {
    render(
      <GameSettingsProvider>
        <PongGame />
      </GameSettingsProvider>
    );
    expect(screen.getByText('Player vs. Player')).toBeInTheDocument();
  });

  /**
   * Test that the canvas is rendered
   */
  it('should render the game canvas', () => {
    render(
      <GameSettingsProvider>
        <PongGame />
      </GameSettingsProvider>
    );
    const canvas = screen.getByLabelText('Pong game canvas');
    expect(canvas).toBeInTheDocument();
  });

  /**
   * Test that controls instructions are displayed
   */
  it('should display control instructions', () => {
    render(
      <GameSettingsProvider>
        <PongGame />
      </GameSettingsProvider>
    );
    expect(screen.getByText(/Left Player: W \(up\) \/ S \(down\)/)).toBeInTheDocument();
    expect(screen.getByText(/Right Player: ARROWUP \(up\) \/ ARROWDOWN \(down\)/)).toBeInTheDocument();
  });

  /**
   * Test custom dimensions
   */
  it('should render with custom dimensions', () => {
    const customWidth = 1000;
    const customHeight = 600;
    
    render(
      <GameSettingsProvider>
        <PongGame width={customWidth} height={customHeight} />
      </GameSettingsProvider>
    );
    const canvas = screen.getByLabelText('Pong game canvas');
    
    expect(canvas).toHaveAttribute('width', customWidth.toString());
    expect(canvas).toHaveAttribute('height', customHeight.toString());
  });

  /**
   * Test default dimensions
   */
  it('should render with default dimensions', () => {
    render(
      <GameSettingsProvider>
        <PongGame />
      </GameSettingsProvider>
    );
    const canvas = screen.getByLabelText('Pong game canvas');
    
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '400');
  });

  /**
   * Test component structure
   */
  it('should have proper component structure', () => {
    render(
      <GameSettingsProvider>
        <PongGame />
      </GameSettingsProvider>
    );
    
    // Check for main container
    const container = screen.getByText('Player vs. Player').closest('div');
    expect(container).toHaveClass('flex', 'flex-col', 'items-center');
    
    // Check for canvas container
    const canvas = screen.getByLabelText('Pong game canvas');
    expect(canvas).toHaveClass('border', 'border-white');
  });
}); 