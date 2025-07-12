import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const CompareInputSchema = z.object({
  planIds: z.array(z.string()).min(2).max(4),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planIds } = CompareInputSchema.parse(body);

    // Fetch plans with details
    const plans = await prisma.productPlan.findMany({
      where: {
        id: { in: planIds },
      },
      include: {
        insurer: {
          select: {
            id: true,
            name: true,
            logo: true,
            rating: true,
          },
        },
        benefits: true,
        networkHospitals: {
          select: {
            hospital: {
              select: {
                id: true,
                name: true,
                address: true,
                specialties: true,
              },
            },
            cashless: true,
          },
        },
        _count: {
          select: {
            policies: true,
            networkHospitals: true,
          },
        },
      },
    });

    if (plans.length !== planIds.length) {
      return NextResponse.json(
        { error: 'One or more plans not found' },
        { status: 404 }
      );
    }

    // Generate comparison matrix
    const comparisonMatrix = generateComparisonMatrix(plans);

    // Generate pros and cons
    const prosAndCons = generateProsAndCons(plans);

    // Format response
    const response = {
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        insurer: plan.insurer,
        coverageAmount: plan.coverageAmount,
        planType: plan.planType,
        features: plan.features,
        hospitalCount: plan._count.networkHospitals,
        policyCount: plan._count.policies,
      })),
      comparisonMatrix,
      prosAndCons,
      networkComparison: {
        hospitalCounts: plans.map(plan => ({
          planId: plan.id,
          totalHospitals: plan._count.networkHospitals,
          cashlessHospitals: plan.networkHospitals.filter(nh => nh.cashless).length,
        })),
        commonHospitals: findCommonHospitals(plans),
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Plan comparison error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to compare plans' },
      { status: 500 }
    );
  }
}

// Helper function to generate comparison matrix
function generateComparisonMatrix(plans: any[]) {
  const matrix: any = {
    basicInfo: {
      title: 'Basic Information',
      items: [
        {
          label: 'Coverage Amount',
          values: plans.map(p => p.coverageAmount),
        },
        {
          label: 'Plan Type',
          values: plans.map(p => p.planType),
        },
        // Add more basic info comparisons
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

// Helper function to generate benefit comparisons
function generateBenefitComparisons(plans: any[]) {
  const allBenefits = new Set<string>();
  plans.forEach(plan => {
    plan.benefits.forEach((benefit: any) => {
      allBenefits.add(benefit.name);
    });
  });

  return Array.from(allBenefits).map(benefitName => ({
    label: benefitName,
    values: plans.map(plan => {
      const benefit = plan.benefits.find((b: any) => b.name === benefitName);
      return benefit ? {
        covered: true,
        amount: benefit.coverageAmount,
        conditions: benefit.conditions,
      } : {
        covered: false,
      };
    }),
  }));
}

// Helper function to generate waiting period comparisons
function generateWaitingPeriodComparisons(plans: any[]) {
  return Object.keys(plans[0].waitingPeriods).map(condition => ({
    label: condition,
    values: plans.map(p => p.waitingPeriods[condition]),
  }));
}

// Helper function to generate pros and cons
function generateProsAndCons(plans: any[]) {
  return plans.map(plan => {
    const pros = [];
    const cons = [];

    // Add pros based on various factors
    if (plan.insurer.rating >= 4.5) {
      pros.push('Highly rated insurer');
    }
    if (plan._count.networkHospitals > 5000) {
      pros.push('Large hospital network');
    }

    // Add cons based on various factors
    if (plan.insurer.rating < 4.0) {
      cons.push('Lower insurer rating');
    }
    if (plan._count.networkHospitals < 3000) {
      cons.push('Limited hospital network');
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
