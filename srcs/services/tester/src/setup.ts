import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Global test setup
beforeAll(() => {
  // Set test environment
  process.env['NODE_ENV'] = 'test';
  
  // Set default timeouts
  jest.setTimeout(10000);
});

afterAll(() => {
  // Cleanup after all tests
});

// Global test utilities
global.console = {
  ...console,
  // Uncomment to suppress console.log during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};
