import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

// Input validation schema
const FilterSchema = z.object({
  insurerId: z.string().optional(),
  planType: z.enum(['INDIVIDUAL', 'FAMILY', 'GROUP', 'MEDICARE', 'SENIOR_CITIZEN']).optional(),
  minCoverage: z.number().optional(),
  maxCoverage: z.number().optional(),
  minPremium: z.number().optional(),
  maxPremium: z.number().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
  page: z.number().min(1).default(1),
});

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'plans:',
};

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Apply rate limiting
    const identifier = req.ip || 'anonymous';
    const { success } = await rateLimit(identifier, RATE_LIMIT);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

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
      page: params.page ? Number(params.page) : 1,
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

    if (filters.minPremium || filters.maxPremium) {
      where.AND.push({
        basePremium: {
          gte: filters.minPremium,
          lte: filters.maxPremium,
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

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit;

    // Fetch plans with pagination
    const [plans, total] = await Promise.all([
      prisma.productPlan.findMany({
        where,
        skip,
        take: filters.limit,
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
          _count: {
            select: {
              policies: true,
              networkHospitals: true,
            },
          },
        },
        orderBy: {
          coverageAmount: 'asc',
        },
      }),
      prisma.productPlan.count({ where }),
    ]);

    return NextResponse.json({
      plans,
      pagination: {
        total,
        pages: Math.ceil(total / filters.limit),
        currentPage: filters.page,
        limit: filters.limit,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Plans fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}