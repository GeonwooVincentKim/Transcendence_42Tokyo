import '@testing-library/jest-dom';

// Mock canvas for PongGame component
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillStyle: '',
  fillRect: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  setLineDash: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  strokeStyle: '',
  stroke: jest.fn(),
  font: '',
  fillText: jest.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 0);
  return 1;
});

global.cancelAnimationFrame = jest.fn(); 