import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

// Mark this route as dynamic for Vercel
export const dynamic = 'force-dynamic';

// Input validation schema
const FilterSchema = z.object({
  insurerId: z.string().optional(),
  planType: z.enum(['INDIVIDUAL', 'FAMILY', 'GROUP', 'MEDICARE', 'SENIOR_CITIZEN']).optional(),
  minCoverage: z.number().optional(),
  maxCoverage: z.number().optional(),
  minPremium: z.number().optional(),
  maxPremium: z.number().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['premium', 'coverage', 'rating', 'popularity', 'trending']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  ageGroup: z.number().optional(),
  location: z.string().optional(),
});

interface PlanWithCounts {
  id: string;
  name: string;
  description: string;
  planType: string;
  coverageAmount: Prisma.Decimal;
  features: Prisma.JsonValue;
  insurer: {
    id: string;
    name: string;
    logo: string;
    rating: number;
  };
  benefits: Array<{
    id: string;
    name: string;
    description: string;
    coverageAmount: Prisma.Decimal;
  }>;
  networkHospitals: Array<{
    hospital: {
      id: string;
      name: string;
      address: Prisma.JsonValue;
    };
  }>;
  _count: {
    policies: number;
    networkHospitals: number;
    quotes: number;
  };
  popularityScore?: number;
}

/**
 * Calculates a weighted popularity score based on multiple metrics
 */
function calculatePopularityScore(plan: PlanWithCounts): number {
  const weights = {
    policyCount: 0.6,    // Active policies
    quoteCount: 0.4,     // Quote requests
  };

  // Get base counts
  const policyCount = plan._count.policies || 0;
  const quoteCount = plan._count.quotes || 0;

  // Calculate normalized scores (0-1)
  const policyScore = Math.min(1, policyCount / 1000);
  const quoteScore = Math.min(1, quoteCount / 500);

  // Calculate weighted total
  return (
    policyScore * weights.policyCount +
    quoteScore * weights.quoteCount
  );
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Parse and validate query parameters
    const filters = FilterSchema.parse({
      ...params,
      minCoverage: params.minCoverage ? Number(params.minCoverage) : undefined,
      maxCoverage: params.maxCoverage ? Number(params.maxCoverage) : undefined,
      minPremium: params.minPremium ? Number(params.minPremium) : undefined,
      maxPremium: params.maxPremium ? Number(params.maxPremium) : undefined,
      limit: params.limit ? Number(params.limit) : 10,
    });

    // Build where clause for filtering
    const where: any = {
      AND: [],
    };

    if (filters.insurerId) {
      where.AND.push({ insurerId: filters.insurerId });
    }

    if (filters.planType) {
      where.AND.push({ planType: filters.planType });
    }

    if (filters.minCoverage || filters.maxCoverage) {
      where.AND.push({
        coverageAmount: {
          gte: filters.minCoverage,
          lte: filters.maxCoverage,
        },
      });
    }

    // Add search filter if provided
    if (filters.search) {
      where.AND.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    // Build orderBy clause for sorting
    let orderBy: any = {};
    if (filters.sortBy) {
      switch (filters.sortBy) {
        case 'premium':
          orderBy = { pricingTiers: filters.sortOrder || 'asc' };
          break;
        case 'coverage':
          orderBy = { coverageAmount: filters.sortOrder || 'desc' };
          break;
        case 'rating':
          orderBy = { insurer: { rating: filters.sortOrder || 'desc' } };
          break;
        case 'popularity':
          // Sort by weighted combination of metrics
          orderBy = [
            { policies: { _count: filters.sortOrder || 'desc' } },
            { quotes: { _count: filters.sortOrder || 'desc' } },
            { views: { _count: filters.sortOrder || 'desc' } },
          ];
          break;
        case 'trending':
          // Sort by recent activity (last 30 days)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          orderBy = [
            {
              policies: {
                _count: {
                  where: {
                    createdAt: { gte: thirtyDaysAgo },
                  },
                },
                orderBy: filters.sortOrder || 'desc',
              },
            },
            {
              quotes: {
                _count: {
                  where: {
                    createdAt: { gte: thirtyDaysAgo },
                  },
                },
                orderBy: filters.sortOrder || 'desc',
              },
            },
          ];
          break;
      }
    }

    // Fetch plans with pagination and metrics
    const plans = await prisma.productPlan.findMany({
      where,
      orderBy,
      take: filters.limit + 1,
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      include: {
        insurer: {
          select: {
            id: true,
            name: true,
            logo: true,
            rating: true,
          },
        },
        benefits: {
          select: {
            id: true,
            name: true,
            description: true,
            coverageAmount: true,
          },
        },
        networkHospitals: {
          select: {
            hospital: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
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
    }) as unknown as PlanWithCounts[];

    // Check if there are more results
    const hasMore = plans.length > filters.limit;
    const results = hasMore ? plans.slice(0, -1) : plans;

    // Calculate popularity scores if sorting by popularity
    let scoredResults = results;
    if (filters.sortBy === 'popularity') {
      scoredResults = results
        .map(plan => ({
          ...plan,
          popularityScore: calculatePopularityScore(plan),
        }))
        .sort((a, b) => 
          filters.sortOrder === 'asc'
            ? a.popularityScore! - b.popularityScore!
            : b.popularityScore! - a.popularityScore!
        );
    }

    // Format response
    const response = {
      plans: scoredResults.map(plan => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        planType: plan.planType,
        coverageAmount: plan.coverageAmount,
        features: plan.features,
        insurer: plan.insurer,
        benefits: plan.benefits,
        hospitalCount: plan._count.networkHospitals,
        policyCount: plan._count.policies,
        quoteCount: plan._count.quotes,
        popularityScore: 'popularityScore' in plan ? plan.popularityScore : undefined,
      })),
      pagination: {
        hasMore,
        nextCursor: hasMore ? results[results.length - 1].id : null,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Plans fetch error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    // Return mock data if database is not available
    if (error.message?.includes('Environment variable not found: DATABASE_URL')) {
      return NextResponse.json({
        plans: [
          {
            id: '1',
            name: 'Basic Health Plan',
            description: 'Comprehensive health coverage for individuals',
            coverageAmount: 300000,
            planType: 'INDIVIDUAL',
            features: ['Cashless Treatment', 'Room Rent Covered', 'Pre-existing Disease Cover'],
            insurer: {
              id: '1',
              name: 'Sample Insurance Co.',
              logo: '/placeholder-logo.png',
              rating: 4.2
            },
            hospitalCount: 1200,
            policyCount: 5000,
            quoteCount: 15000,
            viewCount: 50000,
            claimCount: 2000,
            popularityScore: 0.75
          },
          {
            id: '2',
            name: 'Family Floater Plan',
            description: 'Complete family health protection',
            coverageAmount: 500000,
            planType: 'FAMILY',
            features: ['Family Coverage', 'Maternity Benefits', 'Child Care', 'No Claim Bonus'],
            insurer: {
              id: '2',
              name: 'Family Health Insurance',
              logo: '/placeholder-logo.png',
              rating: 4.5
            },
            hospitalCount: 1800,
            policyCount: 8000,
            quoteCount: 25000,
            viewCount: 80000,
            claimCount: 3500,
            popularityScore: 0.85
          },
          {
            id: '3',
            name: 'Premium Health Plan',
            description: 'Premium coverage with enhanced benefits',
            coverageAmount: 1000000,
            planType: 'INDIVIDUAL',
            features: ['Premium Room', 'International Treatment', 'Wellness Benefits', 'Emergency Coverage'],
            insurer: {
              id: '3',
              name: 'Premium Insurance Ltd.',
              logo: '/placeholder-logo.png',
              rating: 4.7
            },
            hospitalCount: 2500,
            policyCount: 3000,
            quoteCount: 10000,
            viewCount: 30000,
            claimCount: 1000,
            popularityScore: 0.65
          }
        ],
        pagination: {
          hasMore: false,
          nextCursor: null
        }
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}