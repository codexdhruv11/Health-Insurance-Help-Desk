import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';
import { ProductPlan, PlanBenefit, Insurer, Prisma } from '@prisma/client';

// Raw query result types
interface RawPlan extends ProductPlan {
  insurerId: string;
  insurerName: string;
  insurerLogo: string | null;
  insurerRating: number | null;
  insurerEstablishedYear: number | null;
  policyCount: string;
  networkHospitalCount: string;
}

interface RawNetworkHospital {
  id: string;
  planId: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: Prisma.JsonValue;
  hospitalSpecialties: string[];
  hospitalRating: number | null;
  cashless: boolean;
  createdAt: Date;
  updatedAt: Date;
}

type PlanWithRelations = ProductPlan & {
  insurer: {
    id: string;
    name: string;
    logo: string | null;
    rating: number | null;
    establishedYear: number | null;
  };
  benefits: PlanBenefit[];
  networkHospitals: {
    hospital: {
      id: string;
      name: string;
      address: Prisma.JsonValue;
      specialties: string[];
      rating: number | null;
    };
    cashless: boolean;
  }[];
  _count: {
    policies: number;
    networkHospitals: number;
  };
};

// Input validation schema
const CompareInputSchema = z.object({
  planIds: z.array(z.string().uuid('Invalid plan ID format'))
    .min(2, 'Must compare at least 2 plans')
    .max(4, 'Cannot compare more than 4 plans')
    .refine(
      (ids) => new Set(ids).size === ids.length,
      'Duplicate plan IDs are not allowed'
    ),
});

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'compare:',
};

// Calculate similarity scores between plans
function calculateSimilarityScores(plans: PlanWithRelations[]): Record<string, number> {
  const scores: Record<string, number> = {};

  for (let i = 0; i < plans.length; i++) {
    for (let j = i + 1; j < plans.length; j++) {
      const planA = plans[i];
      const planB = plans[j];

      // Calculate similarity based on coverage amount, benefits, and features
      let similarity = 0;

      // Coverage amount similarity (0-1)
      const maxCoverage = Math.max(
        (planA.coverageAmount as unknown as Prisma.Decimal).toNumber(),
        (planB.coverageAmount as unknown as Prisma.Decimal).toNumber()
      );
      const coverageDiff = Math.abs(
        (planA.coverageAmount as unknown as Prisma.Decimal).toNumber() -
        (planB.coverageAmount as unknown as Prisma.Decimal).toNumber()
      );
      similarity += 1 - (coverageDiff / maxCoverage);

      // Features similarity (0-1)
      const featuresA = Object.keys(planA.features as Record<string, unknown>);
      const featuresB = Object.keys(planB.features as Record<string, unknown>);
      const commonFeatures = featuresA.filter(f => featuresB.includes(f));
      similarity += commonFeatures.length / Math.max(featuresA.length, featuresB.length);

      // Normalize to 0-100%
      const score = Math.round((similarity / 2) * 100);
      scores[`${planA.id}-${planB.id}`] = score;
    }
  }

  return scores;
}

export async function POST(req: NextRequest) {
  try {
    // Apply rate limiting
    const session = await getServerSession(authOptions);
    const identifier = session?.user?.id || req.ip || 'anonymous';
    const { success } = await rateLimit(identifier, RATE_LIMIT);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { planIds } = CompareInputSchema.parse(body);

    // Verify all plans exist and are active using native query
    const rawPlans = await prisma.$queryRaw<RawPlan[]>`
      SELECT 
        p.*,
        i.id as "insurerId",
        i.name as "insurerName",
        i.logo as "insurerLogo",
        i.rating as "insurerRating",
        i.established_year as "insurerEstablishedYear",
        COUNT(DISTINCT pol.id)::text as "policyCount",
        COUNT(DISTINCT nh.id)::text as "networkHospitalCount"
      FROM "ProductPlan" p
      LEFT JOIN "Insurer" i ON p.insurer_id = i.id
      LEFT JOIN "Policy" pol ON p.id = pol.plan_id
      LEFT JOIN "NetworkHospital" nh ON p.id = nh.plan_id
      WHERE p.id = ANY(${planIds}::uuid[])
      AND p.status NOT IN ('DRAFT', 'ARCHIVED')
      GROUP BY p.id, i.id
    `;

    if (rawPlans.length !== planIds.length) {
      const foundIds = rawPlans.map(p => p.id);
      const missingIds = planIds.filter(id => !foundIds.includes(id));
      
      return NextResponse.json(
        { 
          error: 'One or more plans not found or not available',
          details: {
            missingPlanIds: missingIds,
          }
        },
        { status: 404 }
      );
    }

    // Get active benefits for the plans
    const benefits = await prisma.$queryRaw<PlanBenefit[]>`
      SELECT b.*
      FROM "PlanBenefit" b
      WHERE b.plan_id = ANY(${planIds}::uuid[])
      AND b.status = 'ACTIVE'
    `;

    // Get network hospitals for the plans
    const networkHospitals = await prisma.$queryRaw<RawNetworkHospital[]>`
      SELECT 
        nh.*,
        h.id as "hospitalId",
        h.name as "hospitalName",
        h.address as "hospitalAddress",
        h.specialties as "hospitalSpecialties",
        h.rating as "hospitalRating"
      FROM "NetworkHospital" nh
      JOIN "Hospital" h ON nh.hospital_id = h.id
      WHERE nh.plan_id = ANY(${planIds}::uuid[])
    `;

    // Combine the data
    const enrichedPlans: PlanWithRelations[] = rawPlans.map(plan => ({
      ...plan,
      insurer: {
        id: plan.insurerId,
        name: plan.insurerName,
        logo: plan.insurerLogo,
        rating: plan.insurerRating,
        establishedYear: plan.insurerEstablishedYear,
      },
      benefits: benefits.filter(b => b.planId === plan.id),
      networkHospitals: networkHospitals
        .filter(nh => nh.planId === plan.id)
        .map(nh => ({
          hospital: {
            id: nh.hospitalId,
            name: nh.hospitalName,
            address: nh.hospitalAddress,
            specialties: nh.hospitalSpecialties,
            rating: nh.hospitalRating,
          },
          cashless: nh.cashless,
        })),
      _count: {
        policies: Number(plan.policyCount),
        networkHospitals: Number(plan.networkHospitalCount),
      },
    }));

    // Verify plans are comparable (same type)
    const planTypes = new Set(enrichedPlans.map(p => p.planType));
    if (planTypes.size > 1) {
      return NextResponse.json(
        { 
          error: 'Cannot compare plans of different types',
          details: {
            planTypes: Array.from(planTypes),
          }
        },
        { status: 400 }
      );
    }

    // Generate comparison matrix
    const comparisonMatrix = generateComparisonMatrix(enrichedPlans);

    // Generate pros and cons
    const prosAndCons = generateProsAndCons(enrichedPlans);

    // Calculate similarity scores
    const similarityScores = calculateSimilarityScores(enrichedPlans);

    return NextResponse.json({
      plans: enrichedPlans.map(plan => ({
        id: plan.id,
        name: plan.name,
        insurer: plan.insurer,
        coverageAmount: plan.coverageAmount,
        planType: plan.planType,
        features: plan.features,
        hospitalCount: plan._count.networkHospitals,
        policyCount: plan._count.policies,
      })),
      matrix: comparisonMatrix,
      prosAndCons,
      similarityScores,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Plan comparison error:', error);
    return NextResponse.json(
      { error: 'Failed to compare plans' },
      { status: 500 }
    );
  }
}

// Helper function to generate comparison matrix
function generateComparisonMatrix(plans: PlanWithRelations[]): ComparisonMatrix {
  const matrix: ComparisonMatrix = {
    basicInfo: {
      title: 'Basic Information',
      items: [
        {
          label: 'Coverage Amount',
          values: plans.map(p => ({
            value: (p.coverageAmount as unknown as Prisma.Decimal).toNumber(),
            displayValue: p.coverageAmount.toString(),
          })),
        },
        {
          label: 'Plan Type',
          values: plans.map(p => ({
            value: p.planType,
            displayValue: p.planType,
          })),
        },
        {
          label: 'Network Hospitals',
          values: plans.map(p => ({
            value: p._count.networkHospitals,
            displayValue: p._count.networkHospitals.toString(),
          })),
        },
      ],
    },
    benefits: {
      title: 'Benefits & Coverage',
      items: generateBenefitComparisons(plans),
    },
    waitingPeriods: {
      title: 'Waiting Periods',
      items: generateWaitingPeriodComparisons(plans),
    },
  };

  return matrix;
}

interface ComparisonValue {
  value: number | string | boolean;
  displayValue: string;
}

interface ComparisonItem {
  label: string;
  values: ComparisonValue[];
}

interface ComparisonSection {
  title: string;
  items: ComparisonItem[];
}

interface ComparisonMatrix {
  basicInfo: ComparisonSection;
  benefits: ComparisonSection;
  waitingPeriods: ComparisonSection;
}

// Helper function to generate benefit comparisons
function generateBenefitComparisons(plans: PlanWithRelations[]): ComparisonItem[] {
  const allBenefits = new Set<string>();
  plans.forEach(plan => {
    plan.benefits.forEach(benefit => {
      allBenefits.add(benefit.name);
    });
  });

  return Array.from(allBenefits).map(benefitName => ({
    label: benefitName,
    values: plans.map(plan => {
      const benefit = plan.benefits.find(b => b.name === benefitName);
      if (!benefit) {
        return { value: false, displayValue: 'Not Covered' };
      }
      return {
        value: (benefit.coverageAmount as unknown as Prisma.Decimal).toNumber(),
        displayValue: `Covered up to ${benefit.coverageAmount.toString()}`,
      };
    }),
  }));
}

// Helper function to generate waiting period comparisons
function generateWaitingPeriodComparisons(plans: PlanWithRelations[]): ComparisonItem[] {
  const allBenefits = new Set<string>();
  plans.forEach(plan => {
    plan.benefits.forEach(benefit => {
      if (benefit.waitingPeriod) {
        allBenefits.add(benefit.name);
      }
    });
  });

  return Array.from(allBenefits).map(benefitName => ({
    label: benefitName,
    values: plans.map(plan => {
      const benefit = plan.benefits.find(b => b.name === benefitName);
      if (!benefit?.waitingPeriod) {
        return { value: 0, displayValue: 'No waiting period' };
      }
      return {
        value: benefit.waitingPeriod,
        displayValue: `${benefit.waitingPeriod} days`,
      };
    }),
  }));
}

interface PlanProsAndCons {
  planId: string;
  pros: string[];
  cons: string[];
}

function generateProsAndCons(plans: PlanWithRelations[]): PlanProsAndCons[] {
  return plans.map(plan => {
    const otherPlans = plans.filter(p => p.id !== plan.id);
    const pros: string[] = [];
    const cons: string[] = [];

    // Compare coverage amount
    const planCoverage = (plan.coverageAmount as unknown as Prisma.Decimal).toNumber();
    const avgCoverage = otherPlans.reduce((sum, p) => 
      sum + (p.coverageAmount as unknown as Prisma.Decimal).toNumber(), 0
    ) / otherPlans.length;

    if (planCoverage > avgCoverage) {
      pros.push('Higher coverage amount than average');
    } else if (planCoverage < avgCoverage) {
      cons.push('Lower coverage amount than average');
    }

    // Compare network size
    const avgNetworkSize = otherPlans.reduce((sum, p) => 
      sum + p._count.networkHospitals, 0
    ) / otherPlans.length;

    if (plan._count.networkHospitals > avgNetworkSize) {
      pros.push('Larger hospital network');
    } else if (plan._count.networkHospitals < avgNetworkSize) {
      cons.push('Smaller hospital network');
    }

    // Compare benefits
    const uniqueBenefits = plan.benefits.filter(benefit =>
      !otherPlans.some(p => p.benefits.some(b => b.name === benefit.name))
    );

    if (uniqueBenefits.length > 0) {
      pros.push(`Unique benefits: ${uniqueBenefits.map(b => b.name).join(', ')}`);
    }

    // Compare waiting periods
    const avgWaitingPeriod = otherPlans.reduce((sum, p) => {
      const totalWaiting = p.benefits.reduce((total, b) => total + (b.waitingPeriod || 0), 0);
      return sum + totalWaiting;
    }, 0) / otherPlans.length;

    const planWaitingPeriod = plan.benefits.reduce((total, b) => total + (b.waitingPeriod || 0), 0);

    if (planWaitingPeriod < avgWaitingPeriod) {
      pros.push('Shorter waiting periods');
    } else if (planWaitingPeriod > avgWaitingPeriod) {
      cons.push('Longer waiting periods');
    }

    return {
      planId: plan.id,
      pros,
      cons,
    };
  });
}

// Helper function to find common hospitals
function findCommonHospitals(plans: any[]) {
  if (plans.length < 2) return [];

  // Get hospital IDs from first plan
  const firstPlanHospitals = new Set(plans[0].networkHospitals.map((nh: any) => nh.hospital.id));

  // Find common hospitals with other plans
  return plans[0].networkHospitals
    .filter((nh: any) => {
      const hospitalId = nh.hospital.id;
      return plans.every(plan =>
        plan.networkHospitals.some((otherNh: any) => otherNh.hospital.id === hospitalId)
      );
    })
    .map((nh: any) => ({
      id: nh.hospital.id,
      name: nh.hospital.name,
      address: nh.hospital.address,
      specialties: nh.hospital.specialties,
    }));
}

// Helper function to calculate recommendation scores
function calculateRecommendationScores(plans: any[], preferences: any) {
return plans.map(plan => {
    let score = 0;
    const factors = [];

    // Weighted criteria
    const weights = {
      coverage: preferences.coverageWeight || 1,
      premium: preferences.premiumWeight || 1,
      rating: preferences.ratingWeight || 1,
      network: preferences.networkWeight || 1,
      benefits: preferences.benefitsWeight || 1,
    };

    // Calculate normalized scores
    const coverageScore = Math.min(plan.coverageAmount / 1000000, 1);
    const premiumScore = 1 - Math.min(plan.premiumAmount / 50000, 1);
    const ratingScore = plan.insurer.rating / 5;
    const networkScore = Math.min(plan._count.networkHospitals / 6000, 1);
    const benefitsScore = plan.benefits.length / 10;

    // Apply weights
    score += coverageScore * weights.coverage;
    score += premiumScore * weights.premium;
    score += ratingScore * weights.rating;
    score += networkScore * weights.network;
    score += benefitsScore * weights.benefits;

    factors.push(
      { label: "Coverage", value: coverageScore },
      { label: "Premium", value: premiumScore },
      { label: "Rating", value: ratingScore },
      { label: "Network", value: networkScore },
      { label: "Benefits", value: benefitsScore }
    );

    return {
      planId: plan.id,
      score,
      factors,
    };
  });
}
