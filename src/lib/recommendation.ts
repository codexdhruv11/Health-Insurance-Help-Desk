import { prisma } from '@/lib/prisma';
import { Customer, Hospital, ProductPlan, Insurer, Prisma } from '@prisma/client';

interface ScoringWeights {
  coverage: number;
  premium: number;
  insurerRating: number;
  networkSize: number;
  benefits: number;
  ageAppropriate: number;
  locationCoverage: number;
}

interface PlanScore {
  score: number;
  breakdown: {
    coverageScore: number;
    premiumScore: number;
    insurerScore: number;
    networkScore: number;
    benefitsScore: number;
    ageScore: number;
    locationScore: number;
  };
  reasons: string[];
}

interface NetworkHospital {
  hospital: Hospital;
  cashless: boolean;
}

interface ExtendedPlan extends ProductPlan {
  insurer: Insurer;
  benefits: Array<{
    name: string;
    coverageAmount: number;
  }>;
  networkHospitals: NetworkHospital[];
  premium: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  coverage: 0.25,
  premium: 0.20,
  insurerRating: 0.15,
  networkSize: 0.15,
  benefits: 0.10,
  ageAppropriate: 0.10,
  locationCoverage: 0.05,
};

const BENEFIT_IMPORTANCE = {
  'Hospitalization': 10,
  'Pre & Post Hospitalization': 8,
  'Ambulance': 5,
  'Day Care Treatment': 6,
  'Maternity': 7,
  'Critical Illness': 9,
  'Organ Donor': 6,
  'Alternative Treatment': 4,
  'Health Check-up': 5,
  'Dental': 4,
  'Vision': 4,
  'Mental Health': 7,
  'Rehabilitation': 6,
  'International Coverage': 5,
  'Covid-19': 8,
};

/**
 * Calculates a normalized score between 0 and 1
 * @param value Current value
 * @param min Minimum value in range
 * @param max Maximum value in range
 * @returns Normalized score between 0 and 1
 */
function normalizeScore(value: number, min: number, max: number): number {
  if (min === max) return 1;
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}

/**
 * Calculates age-appropriate score based on plan benefits and user age
 */
function calculateAgeScore(age: number, plan: ExtendedPlan): { score: number; reasons: string[] } {
  let score = 1;
  const reasons: string[] = [];

  // Young adults (18-30)
  if (age >= 18 && age <= 30) {
    if (plan.benefits.some((b: any) => b.name.toLowerCase().includes('maternity'))) {
      score += 0.2;
      reasons.push('Includes maternity benefits suitable for age group');
    }
    if (plan.benefits.some((b: any) => b.name.toLowerCase().includes('accident'))) {
      score += 0.2;
      reasons.push('Includes accident coverage important for young adults');
    }
  }
  
  // Middle age (31-50)
  else if (age >= 31 && age <= 50) {
    if (plan.benefits.some((b: any) => b.name.toLowerCase().includes('critical illness'))) {
      score += 0.2;
      reasons.push('Includes critical illness coverage important for middle age');
    }
    if (plan.benefits.some((b: any) => b.name.toLowerCase().includes('health check'))) {
      score += 0.2;
      reasons.push('Includes preventive health check-ups');
    }
  }
  
  // Senior (51+)
  else {
    if (plan.benefits.some((b: any) => b.name.toLowerCase().includes('pre-existing'))) {
      score += 0.3;
      reasons.push('Covers pre-existing conditions');
    }
    if (plan.benefits.some((b: any) => b.name.toLowerCase().includes('day care'))) {
      score += 0.2;
      reasons.push('Includes day care procedures coverage');
    }
  }

  return { score: Math.min(score, 1), reasons };
}

/**
 * Calculates benefits score based on coverage amounts and importance
 */
function calculateBenefitsScore(benefits: ExtendedPlan['benefits']): { score: number; reasons: string[] } {
  let totalScore = 0;
  const reasons: string[] = [];
  let totalWeight = 0;

  benefits.forEach(benefit => {
    const importance = BENEFIT_IMPORTANCE[benefit.name as keyof typeof BENEFIT_IMPORTANCE] || 5;
    totalWeight += importance;
    
    // Score based on coverage amount and importance
    const coverageScore = normalizeScore(
      Number(benefit.coverageAmount),
      0,
      10000000 // 1 Crore as max reference
    );
    
    totalScore += coverageScore * importance;
    
    if (coverageScore > 0.8) {
      reasons.push(`High coverage for ${benefit.name}`);
    }
  });

  return {
    score: totalScore / totalWeight,
    reasons,
  };
}

/**
 * Gets plan recommendations based on user preferences and profile
 */
export async function getRecommendations(
  customerId: string,
  weights: Partial<ScoringWeights> = {}
) {
  // Merge custom weights with defaults
  const scoringWeights = { ...DEFAULT_WEIGHTS, ...weights };

  // Fetch user data
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      dateOfBirth: true,
      address: true,
      policies: {
        select: {
          id: true,
          planId: true,
          status: true,
        },
      },
    },
  });

  if (!customer) {
    throw new Error('Customer not found');
  }

  // Calculate age
  const age = new Date().getFullYear() - new Date(customer.dateOfBirth).getFullYear();
  const address = customer.address as Prisma.JsonObject;

  // Fetch all plans with related data
  const plans = await prisma.productPlan.findMany({
    include: {
      insurer: true,
      benefits: {
        select: {
          name: true,
          coverageAmount: true,
        },
      },
      networkHospitals: {
        include: {
          hospital: true,
        },
      },
    },
  }) as unknown as ExtendedPlan[];

  // Get min/max values for normalization
  const premiums = plans.map(p => p.premium);
  const coverages = plans.map(p => Number(p.coverageAmount));
  const networkSizes = plans.map(p => p.networkHospitals.length);
  
  const minPremium = Math.min(...premiums);
  const maxPremium = Math.max(...premiums);
  const minCoverage = Math.min(...coverages);
  const maxCoverage = Math.max(...coverages);
  const minNetworkSize = Math.min(...networkSizes);
  const maxNetworkSize = Math.max(...networkSizes);

  // Score each plan
  const scoredPlans = plans.map(plan => {
    const coverageScore = normalizeScore(
      Number(plan.coverageAmount),
      minCoverage,
      maxCoverage
    );

    // Lower premium is better
    const premiumScore = 1 - normalizeScore(
      plan.premium,
      minPremium,
      maxPremium
    );

    const insurerScore = normalizeScore(
      Number(plan.insurer.rating),
      3.0, // Minimum acceptable rating
      5.0  // Maximum rating
    );

    const networkScore = normalizeScore(
      plan.networkHospitals.length,
      minNetworkSize,
      maxNetworkSize
    );

    // Calculate location coverage
    const nearbyHospitals = plan.networkHospitals.filter(np => 
      (np.hospital.address as Prisma.JsonObject).state === address.state
    ).length;
    const locationScore = normalizeScore(nearbyHospitals, 0, plan.networkHospitals.length);

    // Calculate benefits score
    const { score: benefitsScore, reasons: benefitReasons } = calculateBenefitsScore(plan.benefits);

    // Calculate age-appropriate score
    const { score: ageScore, reasons: ageReasons } = calculateAgeScore(age, plan);

    // Calculate weighted total score
    const totalScore =
      coverageScore * scoringWeights.coverage +
      premiumScore * scoringWeights.premium +
      insurerScore * scoringWeights.insurerRating +
      networkScore * scoringWeights.networkSize +
      benefitsScore * scoringWeights.benefits +
      ageScore * scoringWeights.ageAppropriate +
      locationScore * scoringWeights.locationCoverage;

    // Compile reasons for the score
    const reasons = [
      coverageScore > 0.7 && `High coverage amount of ₹${plan.coverageAmount.toString()}`,
      premiumScore > 0.7 && 'Competitive premium pricing',
      insurerScore > 0.7 && `High insurer rating of ${plan.insurer.rating}`,
      networkScore > 0.7 && `Large network of ${plan.networkHospitals.length} hospitals`,
      locationScore > 0.7 && `Good coverage in ${(address as any).state}`,
      ...benefitReasons,
      ...ageReasons,
    ].filter(Boolean) as string[];

    return {
      plan,
      score: {
        total: totalScore,
        breakdown: {
          coverageScore,
          premiumScore,
          insurerScore,
          networkScore,
          benefitsScore,
          ageScore,
          locationScore,
        },
        reasons,
      },
    };
  });

  // Sort by score and return top recommendations
  return scoredPlans
    .sort((a, b) => b.score.total - a.score.total)
    .slice(0, 5)
    .map(({ plan, score }) => ({
      id: plan.id,
      name: plan.name,
      insurer: plan.insurer.name,
      coverageAmount: plan.coverageAmount,
      premium: plan.premium,
      score: score.total,
      scoreBreakdown: score.breakdown,
      reasons: score.reasons,
    }));
}
