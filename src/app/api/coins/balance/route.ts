import { NextResponse } from 'next/server';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import { rateLimit } from '@/lib/rate-limit';

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 30,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'balance:',
};

const prisma = new PrismaClient();

export const revalidate = 0; // Disable caching for this route

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const { success } = await rateLimit(session.user.id, RATE_LIMIT);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const coinService = CoinService.getInstance();

    // Use Promise.all to fetch data in parallel
    const [wallet, transactions, earnRules] = await Promise.all([
      coinService.getCoinBalance(session.user.id),
      coinService.getCoinTransactions(session.user.id, { take: 5 }),
      prisma.coinEarnRule.findMany({
        where: { isActive: true },
        select: {
          taskType: true,
          coinAmount: true,
          cooldownPeriod: true,
          maxPerDay: true,
        },
      }),
    ]);

    // Get task progress
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskProgress = await Promise.all(
      earnRules.map(async (rule) => {
        const completedToday = await prisma.coinTransaction.count({
          where: {
            wallet: { userId: session.user.id },
            type: 'EARN',
            reason: rule.taskType,
            createdAt: { gte: today },
          },
        });

        // Get last transaction for cooldown
        const lastTransaction = await prisma.coinTransaction.findFirst({
          where: {
            wallet: { userId: session.user.id },
            type: 'EARN',
            reason: rule.taskType,
          },
          orderBy: { createdAt: 'desc' },
        });

        let nextAvailableAt: Date | undefined;
        if (lastTransaction) {
          nextAvailableAt = new Date(lastTransaction.createdAt);
          nextAvailableAt.setMinutes(nextAvailableAt.getMinutes() + rule.cooldownPeriod);
        }

        return {
          taskType: rule.taskType,
          completedToday,
          nextAvailableAt: nextAvailableAt?.toISOString(),
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          balance: wallet.balance,
          totalEarned: wallet.totalEarned,
          totalSpent: wallet.totalSpent,
          lastUpdated: wallet.lastUpdated,
        },
        recentTransactions: transactions.transactions,
        earnOpportunities: earnRules,
        taskProgress,
      },
    });
  } catch (error) {
    console.error('Coin balance error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 