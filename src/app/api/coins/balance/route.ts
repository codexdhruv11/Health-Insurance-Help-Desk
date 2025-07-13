import { NextResponse } from 'next/server';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const revalidate = 0; // Disable caching for this route

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const coinService = CoinService.getInstance();
    const wallet = await coinService.getCoinBalance(session.user.id);

    // Get recent transactions
    const { transactions } = await coinService.getCoinTransactions(session.user.id, {
      take: 5,
    });

    // Get available earning opportunities
    const earnRules = await prisma.coinEarnRule.findMany({
      where: { isActive: true },
      select: {
        taskType: true,
        coinAmount: true,
        cooldownPeriod: true,
        maxPerDay: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        wallet: {
          balance: wallet.balance,
          totalEarned: wallet.totalEarned,
          totalSpent: wallet.totalSpent,
          lastUpdated: wallet.lastUpdated,
        },
        recentTransactions: transactions,
        earnOpportunities: earnRules,
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