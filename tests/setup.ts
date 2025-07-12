import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset } from 'vitest-mock-extended';
import { Redis } from 'ioredis';
import { S3Client } from '@aws-sdk/client-s3';
import Stripe from 'stripe';

// Mock TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fetch
global.fetch = vi.fn();

// Mock Prisma
const prismaMock = mockDeep<PrismaClient>();
vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
  default: prismaMock,
}));

// Mock Redis
const redisMock = mockDeep<Redis>();
vi.mock('ioredis', () => ({
  default: vi.fn(() => redisMock),
}));

// Mock AWS S3
const s3Mock = mockDeep<S3Client>();
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => s3Mock),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock Stripe
const stripeMock = mockDeep<Stripe>();
vi.mock('stripe', () => ({
  default: vi.fn(() => stripeMock),
}));

// Mock NextAuth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'CUSTOMER',
    },
  })),
}));

// Mock environment variables
process.env = {
  ...process.env,
  DATABASE_URL: 'postgresql://test:test@localhost:5432/test_db',
  REDIS_URL: 'redis://localhost:6379',
  AWS_REGION: 'us-east-1',
  AWS_ACCESS_KEY_ID: 'test-key-id',
  AWS_SECRET_ACCESS_KEY: 'test-secret-key',
  AWS_S3_BUCKET: 'test-bucket',
  NEXTAUTH_URL: 'http://localhost:3000',
  NEXTAUTH_SECRET: 'test-secret',
  STRIPE_SECRET_KEY: 'sk_test_key',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_key',
  STRIPE_WEBHOOK_SECRET: 'whsec_test',
  WEBHOOK_SECRET: 'test-webhook-secret',
};

// Test utilities
export const createMockUser = (overrides = {}) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  role: 'CUSTOMER',
  mfaEnabled: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCustomer = (overrides = {}) => ({
  id: 'test-customer-id',
  userId: 'test-user-id',
  firstName: 'Test',
  lastName: 'User',
  dateOfBirth: new Date('1990-01-01'),
  phone: '+1234567890',
  address: {
    line1: '123 Test St',
    city: 'Test City',
    state: 'Test State',
    pincode: '123456',
  },
  createdAt: new Date(),
  ...overrides,
});

export const createMockPolicy = (overrides = {}) => ({
  id: 'test-policy-id',
  customerId: 'test-customer-id',
  planId: 'test-plan-id',
  policyNumber: 'POL123456',
  status: 'ACTIVE',
  effectiveDate: new Date(),
  expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
  premiumAmount: 10000,
  deductible: 1000,
  coverageDetails: {},
  createdAt: new Date(),
  ...overrides,
});

export const createMockPlan = (overrides = {}) => ({
  id: 'test-plan-id',
  insurerId: 'test-insurer-id',
  name: 'Test Plan',
  description: 'Test plan description',
  planType: 'INDIVIDUAL',
  coverageAmount: 500000,
  features: ['Feature 1', 'Feature 2'],
  benefitsDetail: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockDocument = (overrides = {}) => ({
  id: 'test-document-id',
  entityType: 'POLICY',
  entityId: 'test-policy-id',
  fileName: 'test.pdf',
  fileSize: 1024,
  mimeType: 'application/pdf',
  s3Key: 'test/test.pdf',
  uploadedById: 'test-user-id',
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockQuote = (overrides = {}) => ({
  id: 'test-quote-id',
  customerId: 'test-customer-id',
  planId: 'test-plan-id',
  basePremium: 10000,
  finalPremium: 12000,
  discounts: {},
  riskFactors: [],
  createdAt: new Date(),
  ...overrides,
});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  mockReset(prismaMock);
  mockReset(redisMock);
  mockReset(s3Mock);
  mockReset(stripeMock);
});

// Clean up after all tests
afterAll(() => {
  vi.clearAllMocks();
});
