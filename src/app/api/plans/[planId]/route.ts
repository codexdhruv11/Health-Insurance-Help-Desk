import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';

export async function GET(
  req: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params;

    const plan = await prisma.productPlan.findUnique({
      where: { id: planId },
      include: {
        insurer: {
          select: {
            id: true,
            name: true,
            description: true,
            logo: true,
            rating: true,
            establishedYear: true,
            regulatoryInfo: true,
          },
        },
        benefits: {
          select: {
            id: true,
            name: true,
            description: true,
            coverageAmount: true,
            conditions: true,
            waitingPeriod: true,
          },
        },
        networkHospitals: {
          select: {
            hospital: {
              select: {
                id: true,
                name: true,
                address: true,
                location: true,
                specialties: true,
                facilities: true,
                emergencyServices: true,
                rating: true,
              },
            },
            cashless: true,
          },
        },
        _count: {
          select: {
            policies: true,
            networkHospitals: true,
            quotes: true,
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Get related plans from same insurer
    const relatedPlans = await prisma.productPlan.findMany({
      where: {
        insurerId: plan.insurerId,
        id: { not: planId },
      },
      take: 3,
      include: {
        insurer: {
          select: {
            id: true,
            name: true,
            logo: true,
            rating: true,
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

    // Get premium calculations for different age groups
    const premiumCalculations = calculatePremiumsForAges(plan);

    // Get claims statistics (placeholder for now)
    const claimsStats = {
      approvalRate: 0.95, // 95% approval rate
      avgProcessingTime: 7, // 7 days average
      totalClaims: plan._count.policies * 0.3, // Estimate
    };

    // Calculate plan statistics
    const stats = {
      policyCount: plan._count.policies,
      hospitalCount: plan._count.networkHospitals,
      quoteCount: plan._count.quotes,
      // TODO: Add claims statistics when available
      // claimsApprovalRate: 0,
      // avgClaimProcessingTime: 0,
    };

    // Format response
    const response = {
      ...plan,
      _count: undefined,
      statistics: stats,
      // Group benefits by category
      benefitsByCategory: groupBenefitsByCategory(plan.benefits),
      // Format hospital network
      hospitalNetwork: {
        count: plan._count.networkHospitals,
        cashlessCount: plan.networkHospitals.filter(nh => nh.cashless).length,
        hospitals: plan.networkHospitals.map(nh => ({
          ...nh.hospital,
          cashless: nh.cashless,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Plan details fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plan details' },
      { status: 500 }
    );
  }
}

// Helper function to group benefits by category
function groupBenefitsByCategory(benefits: any[]) {
  const categories: Record<string, any[]> = {
    'Room Rent': [],
    'Pre & Post Hospitalization': [],
    'Critical Illness': [],
    'Maternity': [],
    'Wellness': [],
    'Other': [],
  };

  benefits.forEach(benefit => {
    // Simple categorization based on benefit name/description
    // TODO: Implement more sophisticated categorization
    if (benefit.name.toLowerCase().includes('room')) {
      categories['Room Rent'].push(benefit);
    } else if (benefit.name.toLowerCase().includes('hospital')) {
      categories['Pre & Post Hospitalization'].push(benefit);
    } else if (benefit.name.toLowerCase().includes('critical')) {
      categories['Critical Illness'].push(benefit);
    } else if (benefit.name.toLowerCase().includes('maternity')) {
      categories['Maternity'].push(benefit);
    } else if (benefit.name.toLowerCase().includes('wellness')) {
      categories['Wellness'].push(benefit);
    } else {
      categories['Other'].push(benefit);
    }
  });

  // Remove empty categories
  return Object.fromEntries(
    Object.entries(categories).filter(([_, benefits]) => benefits.length > 0)
  );
}

// Helper function to calculate premiums for different age groups
function calculatePremiumsForAges(plan: any) {
  const basePremium = plan.basePremium || 10000; // Default base premium
  
  return {
    ageGroups: [
      {
        ageRange: '18-25',
        premium: Math.round(basePremium * 0.8),
        discount: '20% Young Adult Discount'
      },
      {
        ageRange: '26-35',
        premium: basePremium,
        discount: 'Base Premium'
      },
      {
        ageRange: '36-45',
        premium: Math.round(basePremium * 1.2),
        discount: 'No Discount'
      },
      {
        ageRange: '46-55',
        premium: Math.round(basePremium * 1.5),
        discount: 'No Discount'
      },
      {
        ageRange: '56-65',
        premium: Math.round(basePremium * 2.0),
        discount: 'No Discount'
      },
    ],
  };
}
