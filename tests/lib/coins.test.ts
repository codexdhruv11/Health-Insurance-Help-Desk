import { CoinService } from '@/lib/coins';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    coinWallet: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    coinTransaction: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    coinEarnRule: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(),
}));

describe('CoinService', () => {
  let coinService: CoinService;
  const userId = 'test-user-id';

  beforeEach(() => {
    coinService = CoinService.getInstance();
    jest.clearAllMocks();
  });

  describe('getOrCreateWallet', () => {
    it('should create a new wallet if one does not exist', async () => {
      const mockWallet = { id: 'wallet-id', userId, balance: 0 };
      (prisma.coinWallet.upsert as jest.Mock).mockResolvedValue(mockWallet);

      const result = await coinService.getOrCreateWallet(userId);

      expect(result).toEqual(mockWallet);
      expect(prisma.coinWallet.upsert).toHaveBeenCalledWith({
        where: { userId },
        create: { userId },
        update: {},
      });
    });
  });

  describe('validateEarnRule', () => {
    const mockRule = {
      taskType: 'SIGN_UP',
      coinAmount: 100,
      cooldownPeriod: 0,
      maxPerDay: 1,
      isActive: true,
    };

    beforeEach(() => {
      (prisma.coinEarnRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (rateLimit as jest.Mock).mockResolvedValue({ success: true });
      (prisma.coinTransaction.count as jest.Mock).mockResolvedValue(0);
    });

    it('should validate earn rule successfully', async () => {
      const result = await coinService.validateEarnRule(userId, 'SIGN_UP');

      expect(result).toEqual(mockRule);
      expect(prisma.coinEarnRule.findFirst).toHaveBeenCalledWith({
        where: { taskType: 'SIGN_UP', isActive: true },
      });
    });

    it('should throw error if rule does not exist', async () => {
      (prisma.coinEarnRule.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(coinService.validateEarnRule(userId, 'INVALID')).rejects.toThrow(
        'No active earning rule found for INVALID'
      );
    });

    it('should throw error if rate limited', async () => {
      (rateLimit as jest.Mock).mockResolvedValue({ success: false });

      await expect(coinService.validateEarnRule(userId, 'SIGN_UP')).rejects.toThrow(
        'Rate limit exceeded for this earning action'
      );
    });

    it('should throw error if daily limit reached', async () => {
      (prisma.coinTransaction.count as jest.Mock).mockResolvedValue(1);

      await expect(coinService.validateEarnRule(userId, 'SIGN_UP')).rejects.toThrow(
        'Daily limit reached for this earning action'
      );
    });
  });

  describe('earnCoins', () => {
    const mockWallet = { id: 'wallet-id', userId, balance: 0 };
    const mockRule = {
      taskType: 'SIGN_UP',
      coinAmount: 100,
      cooldownPeriod: 0,
      maxPerDay: 1,
      isActive: true,
    };

    beforeEach(() => {
      (prisma.coinWallet.upsert as jest.Mock).mockResolvedValue(mockWallet);
      (prisma.coinEarnRule.findFirst as jest.Mock).mockResolvedValue(mockRule);
      (rateLimit as jest.Mock).mockResolvedValue({ success: true });
      (prisma.coinTransaction.count as jest.Mock).mockResolvedValue(0);
      (prisma.coinTransaction.create as jest.Mock).mockImplementation((data) => data);
      (prisma.coinWallet.update as jest.Mock).mockImplementation((data) => data);
    });

    it('should earn coins successfully', async () => {
      const result = await coinService.earnCoins(userId, 'SIGN_UP', 0);

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('wallet');
      expect(prisma.coinTransaction.create).toHaveBeenCalled();
      expect(prisma.coinWallet.update).toHaveBeenCalled();
    });
  });

  describe('spendCoins', () => {
    const mockWallet = { id: 'wallet-id', userId, balance: 1000 };

    beforeEach(() => {
      (prisma.coinWallet.upsert as jest.Mock).mockResolvedValue(mockWallet);
      (prisma.coinTransaction.create as jest.Mock).mockImplementation((data) => data);
      (prisma.coinWallet.update as jest.Mock).mockImplementation((data) => data);
    });

    it('should spend coins successfully', async () => {
      const result = await coinService.spendCoins(userId, 500, 'REWARD');

      expect(result).toHaveProperty('transaction');
      expect(result).toHaveProperty('wallet');
      expect(prisma.coinTransaction.create).toHaveBeenCalled();
      expect(prisma.coinWallet.update).toHaveBeenCalled();
    });

    it('should throw error if insufficient balance', async () => {
      await expect(coinService.spendCoins(userId, 2000, 'REWARD')).rejects.toThrow(
        'Insufficient coins'
      );
    });
  });

  describe('getCoinTransactions', () => {
    const mockTransactions = [
      { id: 1, type: 'EARN', amount: 100 },
      { id: 2, type: 'SPEND', amount: 50 },
    ];

    beforeEach(() => {
      (prisma.coinWallet.upsert as jest.Mock).mockResolvedValue({ id: 'wallet-id' });
      (prisma.coinTransaction.findMany as jest.Mock).mockResolvedValue(mockTransactions);
      (prisma.coinTransaction.count as jest.Mock).mockResolvedValue(2);
    });

    it('should get transactions with pagination', async () => {
      const result = await coinService.getCoinTransactions(userId, {
        skip: 0,
        take: 10,
      });

      expect(result.transactions).toEqual(mockTransactions);
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('should apply filters correctly', async () => {
      await coinService.getCoinTransactions(userId, {
        type: 'EARN',
        startDate: new Date(),
        endDate: new Date(),
      });

      expect(prisma.coinTransaction.findMany).toHaveBeenCalled();
      expect(prisma.coinTransaction.count).toHaveBeenCalled();
    });
  });
}); 