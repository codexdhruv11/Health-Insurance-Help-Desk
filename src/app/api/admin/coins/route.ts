import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { CoinTransaction, User } from '@prisma/client';

const adminActionSchema = z.object({
  action: z.enum(['credit', 'debit', 'refund']),
  userId: z.string(),
  amount: z.number().int().positive(),
  reason: z.string(),
  metadata: z.record(z.any()).optional(),
});

const batchActionSchema = z.object({
  action: z.enum(['credit', 'debit']),
  userIds: z.array(z.string()).min(1),
  amount: z.number().int().positive(),
  reason: z.string(),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const isBatchAction = Array.isArray(body.userIds);

    if (isBatchAction) {
      const validatedData = batchActionSchema.parse(body);
      const results = await Promise.allSettled(
        validatedData.userIds.map((userId) =>
          processSingleAction({
            action: validatedData.action,
            userId,
            amount: validatedData.amount,
            reason: validatedData.reason,
            metadata: {
              ...validatedData.metadata,
              batchOperation: true,
              adminId: session.user.id,
            },
          })
        )
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const failedCount = results.filter((r) => r.status === 'rejected').length;

      return NextResponse.json({
        success: true,
        data: {
          totalProcessed: results.length,
          successCount,
          failedCount,
          results: results.map((r, i) => ({
            userId: validatedData.userIds[i],
            success: r.status === 'fulfilled',
            error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
          })),
        },
      });
    } else {
      const validatedData = adminActionSchema.parse(body);
      const result = await processSingleAction({
        ...validatedData,
        metadata: {
          ...validatedData.metadata,
          adminId: session.user.id,
        },
      });

      return NextResponse.json({
        success: true,
        data: result,
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Admin coin action error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function processSingleAction({
  action,
  userId,
  amount,
  reason,
  metadata,
}: {
  action: 'credit' | 'debit' | 'refund';
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}) {
  const coinService = CoinService.getInstance();

  switch (action) {
    case 'credit':
      return coinService.earnCoins(userId, 'ADMIN_CREDIT', amount, {
        ...metadata,
        adminReason: reason,
      });

    case 'debit':
      return coinService.spendCoins(userId, amount, 'ADMIN_CREDIT', {
        ...metadata,
        adminReason: reason,
      });

    case 'refund':
      if (!metadata?.transactionId) {
        throw new Error('Transaction ID is required for refunds');
      }
      return coinService.refundCoins(metadata.transactionId, userId, {
        ...metadata,
        adminReason: reason,
      });

    default:
      throw new Error(`Invalid action: ${action}`);
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    // Get system-wide statistics
    const stats = await prisma.coinWallet.aggregate({
      _sum: {
        balance: true,
        totalEarned: true,
        totalSpent: true,
      },
      _avg: {
        balance: true,
      },
      _max: {
        balance: true,
      },
      _min: {
        balance: true,
      },
    });

    // Get recent transactions
    const recentTransactions = await prisma.coinTransaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Get user-specific data if requested
    let userData = null;
    if (userId) {
      userData = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          coinWallet: true,
          transactions: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
    }

    type TransactionWithUser = CoinTransaction & {
      wallet: {
        user: Pick<User, 'id' | 'name' | 'email'>;
      };
    };

    return NextResponse.json({
      success: true,
      data: {
        systemStats: {
          totalCoins: stats._sum.balance || 0,
          totalEarned: stats._sum.totalEarned || 0,
          totalSpent: stats._sum.totalSpent || 0,
          averageBalance: Math.round(stats._avg.balance || 0),
          maxBalance: stats._max.balance || 0,
          minBalance: stats._min.balance || 0,
        },
        recentTransactions: (recentTransactions as TransactionWithUser[]).map((tx) => ({
          ...tx,
          user: tx.wallet.user,
          wallet: undefined,
        })),
        userData,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 