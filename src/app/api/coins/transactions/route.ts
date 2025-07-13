import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const querySchema = z.object({
  skip: z.coerce.number().int().nonnegative().default(0),
  take: z.coerce.number().int().positive().max(50).default(10),
  type: z.enum(['EARN', 'SPEND', 'REFUND']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const validatedQuery = querySchema.parse({
      skip: searchParams.get('skip'),
      take: searchParams.get('take'),
      type: searchParams.get('type'),
      startDate: searchParams.get('startDate'),
      endDate: searchParams.get('endDate'),
    });

    const coinService = CoinService.getInstance();
    const { transactions, total, hasMore } = await coinService.getCoinTransactions(
      session.user.id,
      validatedQuery
    );

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: {
          total,
          hasMore,
          currentPage: Math.floor(validatedQuery.skip / validatedQuery.take) + 1,
          pageSize: validatedQuery.take,
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

    console.error('Coin transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 