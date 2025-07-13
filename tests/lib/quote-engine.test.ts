import { describe, it, expect, beforeEach } from '@jest/globals';
import { calculateQuote } from '@/lib/quote-engine';
import { prisma } from '@/lib/prisma';
import { PlanType } from '@prisma/client';

// Mock Prisma client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    productPlan: {
      findMany: jest.fn(),
    },
  },
}));

interface MockPlan {
  id?: string;
  name?: string;
  planType?: PlanType;
  insurer?: {
    id: string;
    name: string;
    rating: number;
  };
  benefits?: Array<{
    id: string;
    name: string;
    coverageAmount: number;
  }>;
}

const createMockPlan = (data: MockPlan): MockPlan => ({
  id: 'test-plan',
  name: 'Test Plan',
  planType: PlanType.INDIVIDUAL,
  ...data,
});

describe('Quote Engine', () => {
  // ... rest of the tests ...

  describe('edge cases', () => {
    it('should handle maximum age limit', async () => {
      const input = {
        age: 100,
        gender: 'MALE' as const,
        city: 'Mumbai',
        hasMedicalConditions: false,
        familySize: 1,
        coverageAmount: 500000,
      };

      const result = await calculateQuote(input);
      expect(result.riskFactor).toBeGreaterThan(2.0); // High risk for elderly
      expect(result.finalPremium).toBeGreaterThan(result.basePremium * 2);
    });

    it('should handle minimum age limit', async () => {
      const input = {
        age: 0,
        gender: 'MALE' as const,
        city: 'Mumbai',
        hasMedicalConditions: false,
        familySize: 1,
        coverageAmount: 500000,
      };

      const result = await calculateQuote(input);
      expect(result.riskFactor).toBeLessThan(1.0); // Low risk for newborns
    });

    it('should handle maximum coverage amount', async () => {
      const input = {
        age: 30,
        gender: 'MALE' as const,
        city: 'Mumbai',
        hasMedicalConditions: false,
        familySize: 1,
        coverageAmount: 50000000, // 5 Crore
      };

      await expect(calculateQuote(input)).rejects.toThrow('Coverage amount exceeds maximum limit');
    });

    it('should handle all medical conditions', async () => {
      const input = {
        age: 45,
        gender: 'MALE' as const,
        city: 'Mumbai',
        hasMedicalConditions: true,
        medicalConditions: [
          'diabetes',
          'hypertension',
          'heart_disease',
          'cancer',
          'kidney_disease',
          'liver_disease',
        ] as string[],
        familySize: 1,
        coverageAmount: 500000,
      };

      const result = await calculateQuote(input);
      expect(result.riskFactor).toBeLessThanOrEqual(2.5); // Maximum risk factor cap
    });

    it('should handle maximum family size', async () => {
      const input = {
        age: 35,
        gender: 'MALE' as const,
        city: 'Mumbai',
        hasMedicalConditions: false,
        familySize: 10,
        coverageAmount: 1000000,
      };

      const result = await calculateQuote(input);
      expect(result.familyDiscount).toBe(0.20); // Maximum family discount
    });

    it('should handle tier 3 city with high coverage', async () => {
      const input = {
        age: 30,
        gender: 'MALE' as const,
        city: 'Nashik', // Tier 3 city
        hasMedicalConditions: false,
        familySize: 1,
        coverageAmount: 2000000,
      };

      const result = await calculateQuote(input);
      expect(result.cityMultiplier).toBe(1.0); // Base multiplier for tier 3
      expect(result.finalPremium).toBeLessThan(result.basePremium * 1.5);
    });
  });
});

