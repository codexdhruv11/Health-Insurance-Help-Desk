import { prisma } from './prisma';
import { rateLimit } from './rate-limit';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

export const CoinTransactionSchema = z.object({
  type: z.enum(['EARN', 'SPEND', 'REFUND']),
  amount: z.number().int().positive(),
  reason: z.enum(['SIGN_UP', 'DAILY_LOGIN', 'POLICY_PURCHASE', 'REFERRAL', 'HEALTH_QUIZ', 'DOCUMENT_UPLOAD', 'ADMIN_CREDIT', 'REWARD']).optional(),
  metadata: z.record(z.any()).optional(),
});

export type CoinTransaction = z.infer<typeof CoinTransactionSchema>;

// Rate limit configurations
const SPEND_RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'coin:spend:',
};

const MAX_SPEND_AMOUNT = 100000; // Maximum coins that can be spent in one transaction

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
      create: { userId, balance: 0, totalEarned: 0, totalSpent: 0 },
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
    const { success } = await this.rateLimiter(cooldownKey, {
      maxRequests: 1,
      windowMs: rule.cooldownPeriod * 60 * 1000, // Convert to milliseconds
      prefix: 'earn:',
    });

    if (!success) {
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

    // Use provided amount if it's an admin credit, otherwise use rule amount
    const coinAmount = reason === 'ADMIN_CREDIT' ? amount : rule.coinAmount;

    try {
      const result = await prisma.$transaction(async (tx) => {
        const transaction = await tx.coinTransaction.create({
          data: {
            type: 'EARN',
            amount: coinAmount,
            reason: reason as any,
            metadata,
            wallet: { connect: { id: wallet.id } },
          },
        });

        const updatedWallet = await tx.coinWallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: coinAmount },
            totalEarned: { increment: coinAmount },
            lastUpdated: new Date(),
          },
        });

        return { transaction, wallet: updatedWallet };
      });

      return result;
    } catch (error) {
      console.error('Error in earnCoins transaction:', error);
      throw new Error('Failed to process coin earning');
    }
  }

  async spendCoins(
    userId: string,
    amount: number,
    reason: string,
    metadata?: Record<string, any>
  ) {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }

    if (amount > MAX_SPEND_AMOUNT) {
      throw new Error(`Cannot spend more than ${MAX_SPEND_AMOUNT} coins in one transaction`);
    }

    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.balance < amount) {
      throw new Error('Insufficient coins');
    }

    // Apply rate limiting for spending
    const spendKey = `coin:spend:${userId}`;
    const { success } = await this.rateLimiter(spendKey, {
      maxRequests: SPEND_RATE_LIMIT.maxRequests,
      windowMs: SPEND_RATE_LIMIT.windowMs,
      prefix: SPEND_RATE_LIMIT.prefix,
    });

    if (!success) {
      throw new Error('Too many spending attempts. Please try again later.');
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
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
            lastUpdated: new Date(),
          },
        });

        return { transaction, wallet: updatedWallet };
      });

      return result;
    } catch (error) {
      console.error('Error in spendCoins transaction:', error);
      throw new Error('Failed to process coin spending');
    }
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