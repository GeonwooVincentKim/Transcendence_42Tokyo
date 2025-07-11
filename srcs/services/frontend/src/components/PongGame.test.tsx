import React from 'react';
import { render, screen } from '@testing-library/react';
import { PongGame } from './PongGame';

/**
 * Test suite for PongGame component
 */
describe('PongGame Component', () => {
  /**
   * Test that the component renders without crashing
   */
  it('should render the game title', () => {
    render(<PongGame />);
    expect(screen.getByText('Pong Game')).toBeInTheDocument();
  });

  /**
   * Test that the canvas is rendered
   */
  it('should render the game canvas', () => {
    render(<PongGame />);
    const canvas = screen.getByLabelText('Pong game canvas');
    expect(canvas).toBeInTheDocument();
  });

  /**
   * Test that controls instructions are displayed
   */
  it('should display control instructions', () => {
    render(<PongGame />);
    expect(screen.getByText(/Controls: W\/S \(Left Paddle\)/)).toBeInTheDocument();
    expect(screen.getByText(/Arrow Keys \(Right Paddle\)/)).toBeInTheDocument();
  });

  /**
   * Test custom dimensions
   */
  it('should render with custom dimensions', () => {
    const customWidth = 1000;
    const customHeight = 600;
    
    render(<PongGame width={customWidth} height={customHeight} />);
    const canvas = screen.getByLabelText('Pong game canvas');
    
    expect(canvas).toHaveAttribute('width', customWidth.toString());
    expect(canvas).toHaveAttribute('height', customHeight.toString());
  });

  /**
   * Test default dimensions
   */
  it('should render with default dimensions', () => {
    render(<PongGame />);
    const canvas = screen.getByLabelText('Pong game canvas');
    
    expect(canvas).toHaveAttribute('width', '800');
    expect(canvas).toHaveAttribute('height', '400');
  });

  /**
   * Test component structure
   */
  it('should have proper component structure', () => {
    render(<PongGame />);
    
    // Check for main container
    const container = screen.getByText('Pong Game').closest('div');
    expect(container).toHaveClass('flex', 'flex-col', 'items-center');
    
    // Check for canvas container
    const canvas = screen.getByLabelText('Pong game canvas');
    expect(canvas).toHaveClass('border', 'border-white');
  });
}); 