import { describe, it, expect, beforeEach } from 'vitest';
import { QuoteEngine, QuoteInputSchema, type QuoteInput } from '@/lib/quote-engine';
import { prismaMock } from '../setup';
import { createMockPlan } from '../setup';
import { Decimal } from '@prisma/client/runtime/library';

// Helper function to transform input to match QuoteInput type
function transformInput(input: {
  age: number;
  familyMembers?: Array<{ age: number; relationship: string }>;
  medicalHistory?: string[];
  location: {
    city: string;
    state: string;
  };
}): QuoteInput {
  return {
    age: input.age,
    city: input.location.city,
    state: input.location.state,
    coverageAmount: 500000,
    familySize: (input.familyMembers?.length || 0) + 1,
    medicalHistory: input.medicalHistory?.reduce((acc, condition) => {
      acc[condition] = true;
      return acc;
    }, {} as Record<string, boolean>) || {},
    planId: undefined,
  };
}

describe('QuoteEngine', () => {
  describe('input validation', () => {
    it('should validate valid input', () => {
      const input = {
        age: 30,
        familyMembers: [
          { age: 28, relationship: 'Spouse' },
          { age: 5, relationship: 'Child' },
        ],
        medicalHistory: ['Asthma'],
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const result = QuoteInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid age', () => {
      const input = {
        age: -1,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const result = QuoteInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid location', () => {
      const input = {
        age: 30,
        location: {
          city: '',
          state: '',
        },
      };

      const result = QuoteInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('quote generation', () => {
    beforeEach(() => {
      // Mock database responses
      prismaMock.productPlan.findMany.mockResolvedValue([
        createMockPlan({
          id: 'plan1',
          name: 'Basic Plan',
          coverageAmount: new Decimal(500000),
          planType: 'INDIVIDUAL',
          insurer: {
            id: 'insurer1',
            name: 'Test Insurance Co.',
            rating: 4.5,
          },
          benefits: [
            {
              id: 'benefit1',
              name: 'Hospitalization',
              coverageAmount: new Decimal(500000),
            },
            {
              id: 'benefit2',
              name: 'Pre & Post Hospitalization',
              coverageAmount: new Decimal(50000),
            },
          ],
        }),
        createMockPlan({
          id: 'plan2',
          name: 'Family Plan',
          coverageAmount: new Decimal(1000000),
          planType: 'FAMILY',
          insurer: {
            id: 'insurer2',
            name: 'Family Insurance Co.',
            rating: 4.8,
          },
          benefits: [
            {
              id: 'benefit3',
              name: 'Hospitalization',
              coverageAmount: new Decimal(1000000),
            },
            {
              id: 'benefit4',
              name: 'Maternity',
              coverageAmount: new Decimal(100000),
            },
          ],
        }),
      ]);
    });

    it('should generate quotes for valid input', async () => {
      const input = {
        age: 30,
        familyMembers: [
          { age: 28, relationship: 'Spouse' },
          { age: 5, relationship: 'Child' },
        ],
        medicalHistory: [],
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      expect(quotes).toHaveLength(2);
      expect(quotes[0]).toHaveProperty('planId');
      expect(quotes[0]).toHaveProperty('premium');
      expect(quotes[0]).toHaveProperty('discounts');
      expect(quotes[0]).toHaveProperty('finalPremium');
      expect(quotes[0]).toHaveProperty('riskFactors');
    });

    it('should apply family size discounts', async () => {
      const input = {
        age: 30,
        familyMembers: [
          { age: 28, relationship: 'Spouse' },
          { age: 5, relationship: 'Child' },
          { age: 3, relationship: 'Child' },
        ],
        medicalHistory: [],
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      // Family plan should have higher discount
      const familyPlan = quotes.find(q => q.planId === 'plan2');
      expect(familyPlan?.discounts).toHaveProperty('family');
      expect(familyPlan?.discounts.family).toBeGreaterThan(0);
    });

    it('should apply medical history risk factors', async () => {
      const input = {
        age: 30,
        medicalHistory: ['Diabetes Type 2', 'Hypertension'],
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      quotes.forEach(quote => {
        expect(quote.riskFactors).toHaveLength(2);
        expect(quote.riskFactors[0].reason).toContain('Medical condition');
        expect(Number(quote.finalPremium)).toBeGreaterThan(Number(quote.premium));
      });
    });

    it('should apply city tier factors', async () => {
      const input = {
        age: 30,
        location: {
          city: 'Mumbai', // Tier 1 city
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      quotes.forEach(quote => {
        const locationRisk = quote.riskFactors.find(r => r.reason.includes('Location risk'));
        expect(locationRisk).toBeDefined();
        expect(locationRisk?.factor).toBeGreaterThan(1);
      });
    });

    it('should apply age-based risk factors', async () => {
      const input = {
        age: 65,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      quotes.forEach(quote => {
        const ageRisk = quote.riskFactors.find(r => r.reason.includes('Age group'));
        expect(ageRisk).toBeDefined();
        expect(ageRisk?.factor).toBeGreaterThan(1);
      });
    });

    it('should handle database errors gracefully', async () => {
      prismaMock.productPlan.findMany.mockRejectedValue(new Error('Database error'));

      const input = {
        age: 30,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      // Should return mock data
      expect(quotes).toHaveLength(3);
      expect(quotes[0]).toHaveProperty('planId');
    });
  });

  describe('premium calculation', () => {
    it('should calculate base premium correctly', async () => {
      const input = {
        age: 30,
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));
      const basicPlan = quotes.find(q => q.planId === 'plan1');

      // Base premium should be 2% of coverage amount
      expect(basicPlan?.premium.toString()).toBe('10000');
    });

    it('should cap total risk factor', async () => {
      const input = {
        age: 65,
        medicalHistory: [
          'Diabetes Type 1',
          'Heart Disease',
          'Cancer',
          'Kidney Disease',
          'Liver Disease',
        ],
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      quotes.forEach(quote => {
        // Calculate total risk factor
        const totalRisk = quote.riskFactors.reduce((acc, risk) => acc * risk.factor, 1);
        expect(totalRisk).toBeLessThanOrEqual(2.5); // Maximum risk factor
      });
    });

    it('should cap total discount', async () => {
      const input = {
        age: 22, // Young age discount
        familyMembers: [
          { age: 20, relationship: 'Spouse' }, // Family discount
          { age: 1, relationship: 'Child' },
          { age: 2, relationship: 'Child' },
          { age: 3, relationship: 'Child' },
        ],
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
        },
      };

      const quotes = await QuoteEngine.generateQuotes(transformInput(input));

      quotes.forEach(quote => {
        // Calculate total discount
        const totalDiscount = Object.values(quote.discounts).reduce((acc, val) => acc + val, 0);
        expect(totalDiscount).toBeLessThanOrEqual(0.4); // Maximum 40% discount
      });
    });
  });
});

