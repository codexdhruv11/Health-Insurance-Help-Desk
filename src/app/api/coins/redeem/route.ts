import { NextResponse } from 'next/server';
import { z } from 'zod';
import { CoinService } from '@/lib/coins';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'redeem:',
};

const MAX_QUANTITY = 5; // Maximum items that can be redeemed at once

const redeemSchema = z.object({
  rewardItemId: z.string().uuid(),
  quantity: z.number().int().positive().max(MAX_QUANTITY).default(1),
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Apply rate limiting
    const { success } = await rateLimit(session.user.id, RATE_LIMIT);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Too many redemption attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validatedData = redeemSchema.parse(body);

    // Get reward item and check availability
    const rewardItem = await prisma.rewardItem.findUnique({
      where: { 
        id: validatedData.rewardItemId,
        isActive: true, // Only allow redeeming active rewards
      },
    });

    if (!rewardItem) {
      return NextResponse.json(
        { success: false, error: 'Reward item not found or not available' },
        { status: 404 }
      );
    }

    if (!rewardItem.isAvailable || rewardItem.stock < validatedData.quantity) {
      return NextResponse.json(
        { success: false, error: 'Reward item not available or insufficient stock' },
        { status: 400 }
      );
    }

    // Check if user has already redeemed this item today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyRedemptions = await prisma.rewardRedemption.count({
      where: {
        rewardItemId: rewardItem.id,
        wallet: { userId: session.user.id },
        createdAt: { gte: today },
      },
    });

    if (dailyRedemptions >= rewardItem.maxPerDay) {
      return NextResponse.json(
        { success: false, error: 'Daily redemption limit reached for this reward' },
        { status: 400 }
      );
    }

    const totalCost = rewardItem.coinCost * validatedData.quantity;

    // Start a transaction for the redemption process
    const coinService = CoinService.getInstance();
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Spend coins
        const { transaction, wallet } = await coinService.spendCoins(
          session.user.id,
          totalCost,
          'REWARD',
          { 
            rewardItemId: rewardItem.id,
            quantity: validatedData.quantity,
            rewardName: rewardItem.name,
          }
        );

        // Create redemption record
        const redemption = await tx.rewardRedemption.create({
          data: {
            walletId: wallet.id,
            rewardItemId: rewardItem.id,
            coinsCost: totalCost,
            quantity: validatedData.quantity,
            status: 'PENDING',
            fulfillmentData: {
              userId: session.user.id,
              quantity: validatedData.quantity,
              timestamp: new Date().toISOString(),
              rewardName: rewardItem.name,
              rewardType: rewardItem.type,
            },
          },
        });

        // Update reward item stock
        await tx.rewardItem.update({
          where: { id: rewardItem.id },
          data: {
            stock: { decrement: validatedData.quantity },
            redeemedCount: { increment: validatedData.quantity },
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
      if (error instanceof Error && error.message === 'Insufficient coins') {
        return NextResponse.json(
          { success: false, error: 'Insufficient coins' },
          { status: 400 }
        );
      }
      throw error;
    }
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