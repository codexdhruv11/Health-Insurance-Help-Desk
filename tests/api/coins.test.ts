import { createMocks } from 'node-mocks-http';
import { getServerSession } from 'next-auth';
import { CoinService } from '@/lib/coins';
import { POST as earnCoins } from '@/app/api/coins/earn/route';
import { GET as getCoinBalance } from '@/app/api/coins/balance/route';
import { GET as getCoinTransactions } from '@/app/api/coins/transactions/route';
import { POST as redeemCoins } from '@/app/api/coins/redeem/route';

// Mock dependencies
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/coins', () => ({
  CoinService: {
    getInstance: jest.fn(() => ({
      earnCoins: jest.fn(),
      getOrCreateWallet: jest.fn(),
      getCoinTransactions: jest.fn(),
      spendCoins: jest.fn(),
    })),
  },
}));

describe('Coin API Endpoints', () => {
  const mockUser = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockSession = {
    user: mockUser,
  };

  const mockWallet = {
    id: 'wallet-id',
    userId: mockUser.id,
    balance: 1000,
    totalEarned: 2000,
    totalSpent: 1000,
    lastUpdated: new Date(),
  };

  const mockTransaction = {
    id: 'tx-id',
    type: 'EARN',
    amount: 100,
    reason: 'SIGN_UP',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue(mockSession);
  });

  describe('POST /api/coins/earn', () => {
    it('should earn coins successfully', async () => {
      const coinService = CoinService.getInstance();
      (coinService.earnCoins as jest.Mock).mockResolvedValue({
        transaction: mockTransaction,
        wallet: mockWallet,
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          reason: 'SIGN_UP',
          metadata: { test: true },
        },
      });

      await earnCoins(req);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.transaction).toBeDefined();
      expect(data.data.wallet).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'POST',
        body: { reason: 'SIGN_UP' },
      });

      await earnCoins(req);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('GET /api/coins/balance', () => {
    it('should get coin balance successfully', async () => {
      const coinService = CoinService.getInstance();
      (coinService.getOrCreateWallet as jest.Mock).mockResolvedValue(mockWallet);
      (coinService.getCoinTransactions as jest.Mock).mockResolvedValue({
        transactions: [mockTransaction],
        total: 1,
        hasMore: false,
      });

      const { req, res } = createMocks({
        method: 'GET',
      });

      await getCoinBalance(req);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.wallet).toBeDefined();
      expect(data.data.recentTransactions).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const { req, res } = createMocks({
        method: 'GET',
      });

      await getCoinBalance(req);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('GET /api/coins/transactions', () => {
    it('should get transactions with pagination', async () => {
      const coinService = CoinService.getInstance();
      (coinService.getCoinTransactions as jest.Mock).mockResolvedValue({
        transactions: [mockTransaction],
        total: 1,
        hasMore: false,
      });

      const { req, res } = createMocks({
        method: 'GET',
        query: {
          skip: '0',
          take: '10',
        },
      });

      await getCoinTransactions(req);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.transactions).toBeDefined();
      expect(data.data.pagination).toBeDefined();
    });

    it('should handle invalid query parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          skip: 'invalid',
          take: 'invalid',
        },
      });

      await getCoinTransactions(req);

      expect(res._getStatusCode()).toBe(400);
    });
  });

  describe('POST /api/coins/redeem', () => {
    const mockRewardItem = {
      id: 'reward-id',
      name: 'Test Reward',
      coinCost: 500,
      isAvailable: true,
      stock: 10,
    };

    it('should redeem reward successfully', async () => {
      const coinService = CoinService.getInstance();
      (coinService.spendCoins as jest.Mock).mockResolvedValue({
        transaction: {
          ...mockTransaction,
          type: 'SPEND',
          amount: mockRewardItem.coinCost,
        },
        wallet: {
          ...mockWallet,
          balance: mockWallet.balance - mockRewardItem.coinCost,
        },
      });

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          rewardItemId: mockRewardItem.id,
          quantity: 1,
        },
      });

      await redeemCoins(req);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.data.redemption).toBeDefined();
      expect(data.data.wallet).toBeDefined();
    });

    it('should handle insufficient coins', async () => {
      const coinService = CoinService.getInstance();
      (coinService.spendCoins as jest.Mock).mockRejectedValue(
        new Error('Insufficient coins')
      );

      const { req, res } = createMocks({
        method: 'POST',
        body: {
          rewardItemId: mockRewardItem.id,
          quantity: 1,
        },
      });

      await redeemCoins(req);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toBe('Insufficient coins');
    });
  });
}); 