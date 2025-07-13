import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { RewardItem, Prisma } from '@prisma/client';

const querySchema = z.object({
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(50).default(10),
  category: z.enum(['ELECTRONICS', 'VOUCHERS', 'HEALTH', 'LIFESTYLE']).optional(),
  minCost: z.coerce.number().int().nonnegative().optional(),
  maxCost: z.coerce.number().int().nonnegative().optional(),
  sortBy: z.enum(['popularity', 'cost_asc', 'cost_desc', 'newest']).default('popularity'),
});

type RewardWithCount = RewardItem & {
  _count: {
    redemptions: number;
  };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const validatedQuery = querySchema.parse({
      skip: searchParams.get('skip'),
      take: searchParams.get('take'),
      category: searchParams.get('category'),
      minCost: searchParams.get('minCost'),
      maxCost: searchParams.get('maxCost'),
      sortBy: searchParams.get('sortBy'),
    });

    // Build where clause
    const where: Prisma.RewardItemWhereInput = {
      isAvailable: true,
      stock: { gt: 0 },
      ...(validatedQuery.category && { category: validatedQuery.category }),
      ...(validatedQuery.minCost && { coinCost: { gte: validatedQuery.minCost } }),
      ...(validatedQuery.maxCost && { coinCost: { lte: validatedQuery.maxCost } }),
    };

    // Build order by clause
    const orderBy = (() => {
      switch (validatedQuery.sortBy) {
        case 'cost_asc':
          return { coinCost: 'asc' as const };
        case 'cost_desc':
          return { coinCost: 'desc' as const };
        case 'newest':
          return { createdAt: 'desc' as const };
        case 'popularity':
        default:
          return [
            { redemptions: { _count: 'desc' as const } },
            { coinCost: 'asc' as const },
          ];
      }
    })();

    // Get rewards with pagination
    const [rewards, total] = await Promise.all([
      prisma.rewardItem.findMany({
        where,
        orderBy,
        skip: validatedQuery.skip,
        take: validatedQuery.take,
        include: {
          _count: {
            select: { redemptions: true },
          },
        },
      }),
      prisma.rewardItem.count({ where }),
    ]);

    // Get category counts for filtering
    const categoryCounts = await prisma.rewardItem.groupBy({
      by: ['category'],
      where: { isAvailable: true, stock: { gt: 0 } },
      _count: true,
    });

    // Get price range for filtering
    const priceRange = await prisma.rewardItem.aggregate({
      where: { isAvailable: true, stock: { gt: 0 } },
      _min: { coinCost: true },
      _max: { coinCost: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        rewards: (rewards as RewardWithCount[]).map((reward) => ({
          ...reward,
          redemptionCount: reward._count.redemptions,
          _count: undefined,
        })),
        pagination: {
          total,
          hasMore: validatedQuery.skip + validatedQuery.take < total,
          currentPage: Math.floor(validatedQuery.skip / validatedQuery.take) + 1,
          pageSize: validatedQuery.take,
        },
        filters: {
          categories: categoryCounts,
          priceRange: {
            min: priceRange._min.coinCost,
            max: priceRange._max.coinCost,
          },
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Rewards fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 