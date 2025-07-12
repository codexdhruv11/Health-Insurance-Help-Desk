import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Input validation schemas
export const QuoteInputSchema = z.object({
  age: z.number().min(0).max(100),
  familyMembers: z.array(z.object({
    age: z.number().min(0).max(100),
    relationship: z.string(),
  })).optional().default([]),
  medicalHistory: z.array(z.string()).optional().default([]),
  location: z.object({
    city: z.string().min(1),
    state: z.string().min(1),
  }),
  planId: z.string().optional(),
}).transform((data) => ({
  age: data.age,
  city: data.location.city,
  state: data.location.state,
  coverageAmount: 500000, // Default coverage amount
  familySize: data.familyMembers.length + 1,
  medicalHistory: data.medicalHistory.reduce((acc, condition) => {
    acc[condition] = true;
    return acc;
  }, {} as Record<string, any>),
  planId: data.planId,
}));

export type QuoteInput = z.infer<typeof QuoteInputSchema>;

interface RiskFactor {
  factor: number;
  reason: string;
}

interface PremiumCalculation {
  basePremium: Decimal;
  riskFactors: RiskFactor[];
  discounts: { [key: string]: number };
  finalPremium: Decimal;
}

export class QuoteEngine {
  private static readonly BASE_PREMIUM_RATE = 0.02; // 2% of coverage amount
  private static readonly AGE_BRACKETS = [
    { min: 0, max: 25, factor: 0.8 },
    { min: 26, max: 35, factor: 1.0 },
    { min: 36, max: 45, factor: 1.2 },
    { min: 46, max: 55, factor: 1.4 },
    { min: 56, max: 65, factor: 1.6 },
    { min: 66, max: 100, factor: 2.0 },
  ];

  private static readonly CITY_TIER_MAPPING: { [key: string]: string } = {
    // Tier 1 - Metro cities
    'MUMBAI': 'TIER_1',
    'DELHI': 'TIER_1',
    'BANGALORE': 'TIER_1',
    'CHENNAI': 'TIER_1',
    'KOLKATA': 'TIER_1',
    'HYDERABAD': 'TIER_1',
    'PUNE': 'TIER_1',
    'AHMEDABAD': 'TIER_1',

    // Tier 2 - State capitals and major cities
    'JAIPUR': 'TIER_2',
    'LUCKNOW': 'TIER_2',
    'CHANDIGARH': 'TIER_2',
    'BHOPAL': 'TIER_2',
    'PATNA': 'TIER_2',
    'INDORE': 'TIER_2',
    'NAGPUR': 'TIER_2',
    'COIMBATORE': 'TIER_2',

    // Default to Tier 3 for other cities
  };

  private static readonly MEDICAL_RISK_FACTORS: { [key: string]: { factor: number; severity: string } } = {
    // Cardiovascular conditions
    'hypertension': { factor: 1.2, severity: 'moderate' },
    'heart disease': { factor: 1.4, severity: 'high' },
    'high cholesterol': { factor: 1.15, severity: 'low' },
    'arrhythmia': { factor: 1.25, severity: 'moderate' },

    // Metabolic conditions
    'diabetes type 1': { factor: 1.35, severity: 'high' },
    'diabetes type 2': { factor: 1.25, severity: 'moderate' },
    'obesity': { factor: 1.2, severity: 'moderate' },
    'thyroid disorder': { factor: 1.1, severity: 'low' },

    // Respiratory conditions
    'asthma': { factor: 1.15, severity: 'low' },
    'copd': { factor: 1.3, severity: 'high' },
    'sleep apnea': { factor: 1.15, severity: 'low' },
    'tuberculosis': { factor: 1.25, severity: 'moderate' },

    // Cancer history
    'cancer': { factor: 1.5, severity: 'high' },
    'cancer remission': { factor: 1.3, severity: 'moderate' },

    // Other chronic conditions
    'arthritis': { factor: 1.1, severity: 'low' },
    'kidney disease': { factor: 1.4, severity: 'high' },
    'liver disease': { factor: 1.35, severity: 'high' },
    'autoimmune disorder': { factor: 1.3, severity: 'moderate' }
  };

  private static readonly DISCOUNT_RULES = {
    FAMILY_SIZE: {
      2: 0.05, // 5% for 2 members
      3: 0.10, // 10% for 3 members
      4: 0.15, // 15% for 4 members
      5: 0.20, // 20% for 5+ members
    },
    AGE_GROUP: {
      YOUNG: { max: 25, discount: 0.15 }, // 15% for under 25
      SENIOR: { min: 60, discount: 0.10 }, // 10% for over 60
    },
    LOYALTY: {
      NEW: 0,
      RENEWAL: 0.05, // 5% for renewals
      LONG_TERM: 0.10, // 10% for 3+ years
    },
    PAYMENT: {
      ANNUAL: 0.05, // 5% for annual payment
      MULTI_YEAR: 0.10, // 10% for multi-year payment
    },
    CORPORATE: {
      SMALL: 0.10, // 10% for small companies
      MEDIUM: 0.15, // 15% for medium companies
      LARGE: 0.20, // 20% for large companies
    }
  };

  /**
   * Validates quote inputs and calculates premiums for matching plans
   */
  public static async generateQuotes(input: QuoteInput) {
    // Validate input
    const validatedInput = QuoteInputSchema.parse(input);

    // Get matching plans from database
    let plans;
    try {
      plans = await prisma.productPlan.findMany({
        include: {
          insurer: true,
          benefits: true,
        },
      });
    } catch (error) {
      // Use mock data if database is not available
      plans = [
        {
          id: '1',
          name: 'Basic Health Plan',
          coverageAmount: 300000,
          planType: 'INDIVIDUAL',
          insurer: { id: '1', name: 'Sample Insurance Co.', rating: 4.2 },
          benefits: [
            { id: '1', name: 'Hospitalization', coverageAmount: 300000 },
            { id: '2', name: 'Pre & Post Hospitalization', coverageAmount: 30000 }
          ]
        },
        {
          id: '2',
          name: 'Family Floater Plan',
          coverageAmount: 500000,
          planType: 'FAMILY',
          insurer: { id: '2', name: 'Family Health Insurance', rating: 4.5 },
          benefits: [
            { id: '3', name: 'Hospitalization', coverageAmount: 500000 },
            { id: '4', name: 'Maternity Benefits', coverageAmount: 50000 }
          ]
        },
        {
          id: '3',
          name: 'Premium Health Plan',
          coverageAmount: 1000000,
          planType: 'INDIVIDUAL',
          insurer: { id: '3', name: 'Premium Insurance Ltd.', rating: 4.7 },
          benefits: [
            { id: '5', name: 'Hospitalization', coverageAmount: 1000000 },
            { id: '6', name: 'International Treatment', coverageAmount: 200000 }
          ]
        }
      ];
    }

    // Calculate premiums for each plan
    const quoteItems = await Promise.all(
      plans.map(async (plan) => {
        const calculation = await this.calculatePremium(validatedInput, plan);
        
        return {
          planId: plan.id,
          premium: calculation.basePremium,
          discounts: calculation.discounts,
          finalPremium: calculation.finalPremium,
          riskFactors: calculation.riskFactors,
        };
      })
    );

    return quoteItems;
  }

  /**
   * Calculates premium for a specific plan based on user inputs
   */
  private static async calculatePremium(
    input: QuoteInput,
    plan: any
  ): Promise<PremiumCalculation> {
    // Calculate base premium
    const basePremium = new Decimal(plan.coverageAmount)
      .mul(this.BASE_PREMIUM_RATE);

    // Get risk factors
    const riskFactors = this.getRiskFactors(input);
    
    // Calculate risk-adjusted premium
    let adjustedPremium = basePremium;
    for (const risk of riskFactors) {
      adjustedPremium = adjustedPremium.mul(risk.factor);
    }

    // Apply discounts
    const discounts = this.applyDiscounts(input, plan);
    let finalPremium = adjustedPremium;
    
    Object.values(discounts).forEach(discount => {
      finalPremium = finalPremium.mul(1 - discount);
    });

    return {
      basePremium,
      riskFactors,
      discounts,
      finalPremium,
    };
  }

  /**
   * Calculates risk factors based on user inputs
   */
  private static getRiskFactors(input: QuoteInput): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Age-based risk factor
    const ageBracket = this.AGE_BRACKETS.find(
      bracket => input.age >= bracket.min && input.age <= bracket.max
    );
    if (ageBracket) {
      factors.push({
        factor: ageBracket.factor,
        reason: `Age group ${ageBracket.min}-${ageBracket.max}`,
      });
    }

    // City tier-based risk factor
    const cityTier = this.getCityTier(input.city);
    if (!cityTier) {
      throw new Error(`City ${input.city} not found in our database`);
    }
    factors.push({
      factor: 1.0, // Placeholder, will be updated by getCityTier
      reason: `Location risk - Tier ${cityTier}`,
    });

    // Medical history risk factors
    if (input.medicalHistory) {
      const riskMap: Record<string, number> = {
        diabetes: 1.1,
        hypertension: 1.2,
        'heart disease': 1.3,
        cancer: 1.4,
        asthma: 1.15,
        obesity: 1.25,
      };
      
      for (const condition of Object.keys(input.medicalHistory)) {
        const normalizedCondition = condition.toLowerCase().trim();
        const factor = riskMap[normalizedCondition];
        
        if (factor) {
          factors.push({
            factor,
            reason: `Medical history risk - ${condition}`,
          });
        } else {
          console.warn(`Unknown medical condition: ${condition}`);
        }
      }
    }

    return factors;
  }

  /**
   * Determines the tier of a city based on population and healthcare infrastructure
   */
  private static getCityTier(city: string): string {
    const normalizedCity = city.toUpperCase().trim();
    
    // Check direct mapping first
    if (this.CITY_TIER_MAPPING[normalizedCity]) {
      return this.CITY_TIER_MAPPING[normalizedCity];
    }

    // Default to TIER_3 for unmapped cities
    return 'TIER_3';
  }

  /**
   * Calculates risk factors based on medical history
   */
  private static calculateMedicalRiskFactors(medicalHistory: Record<string, boolean>): RiskFactor[] {
    const factors: RiskFactor[] = [];
    let cumulativeRisk = 1.0;
    let highRiskCount = 0;

    // Process each medical condition
    for (const [condition, hasCondition] of Object.entries(medicalHistory)) {
      if (!hasCondition) continue;

      const normalizedCondition = condition.toLowerCase().trim();
      const riskInfo = this.MEDICAL_RISK_FACTORS[normalizedCondition];

      if (riskInfo) {
        // Track high-risk conditions
        if (riskInfo.severity === 'high') {
          highRiskCount++;
        }

        // Apply diminishing returns for multiple conditions
        const adjustedFactor = 1 + (riskInfo.factor - 1) * Math.pow(0.9, factors.length);
        
        factors.push({
          factor: adjustedFactor,
          reason: `Medical condition: ${condition} (${riskInfo.severity} risk)`
        });

        cumulativeRisk *= adjustedFactor;
      }
    }

    // Cap total medical risk factor
    const maxRiskFactor = 2.5;
    if (cumulativeRisk > maxRiskFactor) {
      const adjustmentFactor = maxRiskFactor / cumulativeRisk;
      factors.forEach(factor => {
        factor.factor = 1 + (factor.factor - 1) * adjustmentFactor;
      });
    }

    return factors;
  }

  /**
   * Applies eligible discounts to the premium
   */
  private static applyDiscounts(input: QuoteInput, plan: any): Record<string, number> {
    const discounts: Record<string, number> = {};
    let totalDiscount = 0;
    const MAX_TOTAL_DISCOUNT = 0.40; // Maximum 40% total discount

    // Family size discount
    if (input.familySize > 1) {
      const familyDiscount = this.DISCOUNT_RULES.FAMILY_SIZE[
        Math.min(input.familySize, 5) as keyof typeof this.DISCOUNT_RULES.FAMILY_SIZE
      ];
      if (familyDiscount) {
        discounts.family = familyDiscount;
        totalDiscount += familyDiscount;
      }
    }

    // Age-based discounts
    if (input.age <= this.DISCOUNT_RULES.AGE_GROUP.YOUNG.max) {
      discounts.youngAge = this.DISCOUNT_RULES.AGE_GROUP.YOUNG.discount;
      totalDiscount += discounts.youngAge;
    } else if (input.age >= this.DISCOUNT_RULES.AGE_GROUP.SENIOR.min) {
      discounts.senior = this.DISCOUNT_RULES.AGE_GROUP.SENIOR.discount;
      totalDiscount += discounts.senior;
    }

    // Loyalty discount
    if (plan.isRenewal) {
      discounts.loyalty = this.DISCOUNT_RULES.LOYALTY.RENEWAL;
      totalDiscount += discounts.loyalty;
    }

    // Payment mode discount
    if (plan.paymentMode === 'ANNUAL') {
      discounts.annual = this.DISCOUNT_RULES.PAYMENT.ANNUAL;
      totalDiscount += discounts.annual;
    }

    // Corporate discount
    if (plan.corporateSize) {
      const corporateDiscount = this.DISCOUNT_RULES.CORPORATE[
        plan.corporateSize as keyof typeof this.DISCOUNT_RULES.CORPORATE
      ];
      if (corporateDiscount) {
        discounts.corporate = corporateDiscount;
        totalDiscount += corporateDiscount;
      }
    }

    // Adjust discounts if total exceeds maximum
    if (totalDiscount > MAX_TOTAL_DISCOUNT) {
      const adjustmentFactor = MAX_TOTAL_DISCOUNT / totalDiscount;
      Object.keys(discounts).forEach(key => {
        discounts[key] *= adjustmentFactor;
      });
    }

    return discounts;
  }

  /**
   * Validates quote inputs
   */
  public static validateQuoteInputs(input: unknown): QuoteInput {
    return QuoteInputSchema.parse(input);
  }
}

export default QuoteEngine;