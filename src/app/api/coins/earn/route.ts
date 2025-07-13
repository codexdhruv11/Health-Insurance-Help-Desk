import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const earnCoinsSchema = z.object({
  reason: z.enum([
    'SIGN_UP',
    'DAILY_LOGIN',
    'POLICY_PURCHASE',
    'REFERRAL',
    'HEALTH_QUIZ',
    'DOCUMENT_UPLOAD',
    'ADMIN_CREDIT',
  ]),
  metadata: z.record(z.any()).optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = earnCoinsSchema.parse(body);

    const coinService = CoinService.getInstance();
    const { transaction, wallet } = await coinService.earnCoins(
      session.user.id,
      validatedData.reason,
      0, // Amount is determined by the earn rule
      validatedData.metadata
    );

    return NextResponse.json({
      success: true,
      data: {
        transaction,
        wallet: {
          balance: wallet.balance,
          totalEarned: wallet.totalEarned,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    console.error('Coin earn error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 