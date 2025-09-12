import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config({ path: '.env' });

// Set test environment
process.env['NODE_ENV'] = 'test';

// Increase timeout for database operations
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
  console.log('🧪 Starting WeathWise AI Backend Tests...');
});

// Global test teardown
afterAll(async () => {
  // Any global cleanup can go here
  console.log('✅ WeathWise AI Backend Tests completed!');
});

// Suppress console logs during tests unless there's an error
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeEach(() => {
  console.log = jest.fn();
  console.error = originalConsoleError; // Keep error logging
});

afterEach(() => {
  console.log = originalConsoleLog;
});
