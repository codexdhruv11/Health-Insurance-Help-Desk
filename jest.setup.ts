// Jest setup file
import '@testing-library/jest-dom';
import { server } from './test/server';

// Start the mock server before all tests
beforeAll(() => server.listen());

// Reset any request handlers between tests
afterEach(() => server.resetHandlers());

// Clean up after all tests
afterAll(() => server.close());
