import '@testing-library/jest-dom';

// Mock canvas for PongGame component
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  setLineDash: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  strokeStyle: '',
  stroke: vi.fn(),
  font: '',
  fillText: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 0);
  return 1;
});

global.cancelAnimationFrame = vi.fn(); 