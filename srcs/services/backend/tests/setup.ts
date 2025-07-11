/**
 * Test setup file for backend tests
 * This file runs before each test file
 */

// Set test environment variables
(global as any).process.env.NODE_ENV = 'test';
(global as any).process.env.PORT = '8001'; // Use different port for tests

// Increase timeout for async operations
(global as any).jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
(global as any).console = {
  ...console,
  log: (global as any).jest.fn(),
  debug: (global as any).jest.fn(),
  info: (global as any).jest.fn(),
  warn: (global as any).jest.fn(),
  error: (global as any).jest.fn(),
}; 