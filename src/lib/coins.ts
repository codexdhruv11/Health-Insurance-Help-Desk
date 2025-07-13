import { prisma } from './prisma';
import { rateLimit } from './rate-limit';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const CoinTransactionSchema = z.object({
  type: z.enum(['EARN', 'SPEND', 'REFUND']),
  amount: z.number().int().positive(),
  reason: z.enum(['SIGN_UP', 'DAILY_LOGIN', 'POLICY_PURCHASE', 'REFERRAL', 'HEALTH_QUIZ', 'DOCUMENT_UPLOAD', 'ADMIN_CREDIT']).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CoinTransaction = z.infer<typeof CoinTransactionSchema>;

export class CoinService {
  private static instance: CoinService;
  private rateLimiter = rateLimit;

  private constructor() {}

  public static getInstance(): CoinService {
    if (!CoinService.instance) {
      CoinService.instance = new CoinService();
    }
    return CoinService.instance;
  }

  async getOrCreateWallet(userId: string) {
    return prisma.coinWallet.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async validateEarnRule(userId: string, reason: string) {
    const rule = await prisma.coinEarnRule.findFirst({
      where: { taskType: reason as any, isActive: true },
    });

    if (!rule) {
      throw new Error(`No active earning rule found for ${reason}`);
    }

    const cooldownKey = `coin:earn:${userId}:${reason}`;
    const isRateLimited = await this.rateLimiter.isRateLimited(cooldownKey, {
      points: 1,
      duration: rule.cooldownPeriod * 60, // Convert to seconds
    });

    if (isRateLimited) {
      throw new Error('Rate limit exceeded for this earning action');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dailyTransactions = await prisma.coinTransaction.count({
      where: {
        wallet: { userId },
        type: 'EARN',
        reason: reason as any,
        createdAt: { gte: today },
      },
    });

    if (dailyTransactions >= rule.maxPerDay) {
      throw new Error('Daily limit reached for this earning action');
    }

    return rule;
  }

  async earnCoins(
    userId: string,
    reason: string,
    amount: number,
    metadata?: Record<string, any>
  ) {
    const rule = await this.validateEarnRule(userId, reason);
    const wallet = await this.getOrCreateWallet(userId);

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.coinTransaction.create({
        data: {
          type: 'EARN',
          amount: rule.coinAmount,
          reason: reason as any,
          metadata,
          wallet: { connect: { id: wallet.id } },
        },
      });

      const updatedWallet = await tx.coinWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: rule.coinAmount },
          totalEarned: { increment: rule.coinAmount },
        },
      });

      return { transaction, wallet: updatedWallet };
    });
  }

  async spendCoins(
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance < amount) {
      throw new Error('Insufficient coins');
    }

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.coinTransaction.create({
        data: {
          type: 'SPEND',
          amount,
          reason: reason as any,
          metadata,
          wallet: { connect: { id: wallet.id } },
        },
      });

      const updatedWallet = await tx.coinWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
        },
      });

      return { transaction, wallet: updatedWallet };
    });
  }

  async getCoinBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return wallet;
  }

  async getCoinTransactions(
    userId: string,
    {
      skip = 0,
      take = 10,
      type,
      startDate,
      endDate,
    }: {
      skip?: number;
      take?: number;
      type?: 'EARN' | 'SPEND' | 'REFUND';
      startDate?: Date;
      endDate?: Date;
    } = {}
  ) {
    const wallet = await this.getOrCreateWallet(userId);

    const where: Prisma.CoinTransactionWhereInput = {
      walletId: wallet.id,
      ...(type && { type }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    };

    const [transactions, total] = await Promise.all([
      prisma.coinTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.coinTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      hasMore: skip + take < total,
    };
  }

  async refundCoins(
    transactionId: string,
    adminUserId: string,
    metadata?: Record<string, any>
  ) {
    const transaction = await prisma.coinTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.type !== 'SPEND') {
      throw new Error('Can only refund SPEND transactions');
    }

    return prisma.$transaction(async (tx) => {
      const refundTransaction = await tx.coinTransaction.create({
        data: {
          type: 'REFUND',
          amount: transaction.amount,
          reason: transaction.reason,
          metadata: {
            ...metadata,
            originalTransactionId: transaction.id,
            adminUserId,
          },
          wallet: { connect: { id: transaction.walletId } },
        },
      });

      const updatedWallet = await tx.coinWallet.update({
        where: { id: transaction.walletId },
        data: {
          balance: { increment: transaction.amount },
          totalSpent: { decrement: transaction.amount },
        },
      });

      return { transaction: refundTransaction, wallet: updatedWallet };
    });
  }
} 