import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const redeemSchema = z.object({
  rewardItemId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const validatedData = redeemSchema.parse(body);

    // Get reward item and check availability
    const rewardItem = await prisma.rewardItem.findUnique({
      where: { id: validatedData.rewardItemId },
    });

    if (!rewardItem) {
      return NextResponse.json(
        { success: false, error: 'Reward item not found' },
        { status: 404 }
      );
    }

    if (!rewardItem.isAvailable || rewardItem.stock < validatedData.quantity) {
      return NextResponse.json(
        { success: false, error: 'Reward item not available or insufficient stock' },
        { status: 400 }
      );
    }

    const totalCost = rewardItem.coinCost * validatedData.quantity;

    // Start a transaction for the redemption process
    const coinService = CoinService.getInstance();
    const result = await prisma.$transaction(async (tx) => {
      // Spend coins
      const { transaction, wallet } = await coinService.spendCoins(
        session.user.id,
        totalCost,
        'REWARD',
        { rewardItemId: rewardItem.id, quantity: validatedData.quantity }
      );

      // Create redemption record
      const redemption = await tx.rewardRedemption.create({
        data: {
          walletId: wallet.id,
          rewardItemId: rewardItem.id,
          coinsCost: totalCost,
          status: 'PENDING',
          fulfillmentData: {
            userId: session.user.id,
            quantity: validatedData.quantity,
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Update reward item stock
      await tx.rewardItem.update({
        where: { id: rewardItem.id },
        data: {
          stock: { decrement: validatedData.quantity },
        },
      });

      return { transaction, wallet, redemption };
    });

    return NextResponse.json({
      success: true,
      data: {
        redemption: result.redemption,
        wallet: {
          balance: result.wallet.balance,
          totalSpent: result.wallet.totalSpent,
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

    console.error('Coin redemption error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 