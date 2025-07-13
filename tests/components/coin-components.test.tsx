import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { CoinBalance } from '@/components/ui/coin-balance';
import { CoinTransactionList } from '@/components/ui/coin-transaction-list';
import { CoinEarningTasks } from '@/components/ui/coin-earning-tasks';
import { RewardsStore } from '@/components/ui/rewards-store';

// Mock dependencies
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('Coin Components', () => {
  const mockUser = {
    id: 'test-user-id',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockSession = {
    data: {
      user: mockUser,
    },
    status: 'authenticated',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSession as jest.Mock).mockReturnValue(mockSession);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: {} }),
    });
  });

  describe('CoinBalance', () => {
    const mockWalletData = {
      balance: 1000,
      totalEarned: 2000,
      totalSpent: 1000,
      lastUpdated: new Date().toISOString(),
      recentTransactions: [
        {
          id: 'tx-1',
          type: 'EARN',
          amount: 100,
          reason: 'SIGN_UP',
          createdAt: new Date(),
        },
      ],
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { wallet: mockWalletData } }),
      });
    });

    it('renders compact variant correctly', async () => {
      render(<CoinBalance variant="compact" />);

      await waitFor(() => {
        expect(screen.getByText('1000 coins')).toBeInTheDocument();
      });
    });

    it('renders full variant with recent transactions', async () => {
      render(<CoinBalance variant="detailed" />);

      await waitFor(() => {
        expect(screen.getByText('Total Earned')).toBeInTheDocument();
        expect(screen.getByText('Total Spent')).toBeInTheDocument();
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      });
    });

    it('handles error state', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      render(<CoinBalance />);

      await waitFor(() => {
        expect(screen.getByText('Error loading coin balance')).toBeInTheDocument();
      });
    });
  });

  describe('CoinTransactionList', () => {
    const mockTransactions = [
      {
        id: 'tx-1',
        type: 'EARN',
        amount: 100,
        reason: 'SIGN_UP',
        createdAt: new Date(),
      },
      {
        id: 'tx-2',
        type: 'SPEND',
        amount: 50,
        reason: 'REWARD',
        createdAt: new Date(),
      },
    ];

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              transactions: mockTransactions,
              pagination: {
                total: 2,
                hasMore: false,
                currentPage: 1,
                pageSize: 10,
              },
            },
          }),
      });
    });

    it('renders transaction list correctly', async () => {
      render(<CoinTransactionList />);

      await waitFor(() => {
        expect(screen.getByText('SIGN_UP')).toBeInTheDocument();
        expect(screen.getByText('REWARD')).toBeInTheDocument();
      });
    });

    it('handles pagination', async () => {
      render(<CoinTransactionList />);

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      expect(nextButton).toBeDisabled();
    });

    it('handles filtering', async () => {
      render(<CoinTransactionList />);

      await waitFor(() => {
        const earnButton = screen.getByText('Earned');
        fireEvent.click(earnButton);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('type=EARN')
        );
      });
    });
  });

  describe('CoinEarningTasks', () => {
    const mockEarnRules = [
      {
        taskType: 'SIGN_UP',
        coinAmount: 100,
        cooldownPeriod: 0,
        maxPerDay: 1,
        isActive: true,
      },
      {
        taskType: 'DAILY_LOGIN',
        coinAmount: 50,
        cooldownPeriod: 86400,
        maxPerDay: 1,
        isActive: true,
      },
    ];

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              earnOpportunities: mockEarnRules,
              taskProgress: [],
            },
          }),
      });
    });

    it('renders task list correctly', async () => {
      render(<CoinEarningTasks />);

      await waitFor(() => {
        expect(screen.getByText('sign up')).toBeInTheDocument();
        expect(screen.getByText('daily login')).toBeInTheDocument();
      });
    });

    it('handles task simulation in development', async () => {
      const mockEnv = { ...process.env };
      jest.replaceProperty(process, 'env', { ...mockEnv, NODE_ENV: 'development' });

      render(<CoinEarningTasks />);

      await waitFor(() => {
        const simulateButton = screen.getAllByText('Simulate')[0];
        fireEvent.click(simulateButton);
        expect(global.fetch).toHaveBeenCalledWith('/api/simulate', expect.any(Object));
      });

      jest.replaceProperty(process, 'env', mockEnv);
    });
  });

  describe('RewardsStore', () => {
    const mockRewards = [
      {
        id: 'reward-1',
        name: 'Test Reward',
        description: 'A test reward',
        coinCost: 500,
        category: 'ELECTRONICS',
        stock: 10,
        isAvailable: true,
        redemptionCount: 5,
      },
    ];

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              rewards: mockRewards,
              pagination: {
                total: 1,
                hasMore: false,
                currentPage: 1,
                pageSize: 12,
              },
              filters: {
                categories: [{ category: 'ELECTRONICS', _count: 1 }],
                priceRange: { min: 500, max: 500 },
              },
            },
          }),
      });
    });

    it('renders rewards list correctly', async () => {
      render(<RewardsStore />);

      await waitFor(() => {
        expect(screen.getByText('Test Reward')).toBeInTheDocument();
        expect(screen.getByText('500 coins')).toBeInTheDocument();
      });
    });

    it('handles category filtering', async () => {
      render(<RewardsStore />);

      await waitFor(() => {
        const categoryButton = screen.getByText('electronics (1)');
        fireEvent.click(categoryButton);
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('category=ELECTRONICS')
        );
      });
    });

    it('handles reward redemption', async () => {
      render(<RewardsStore />);

      await waitFor(() => {
        const redeemButton = screen.getByText('Redeem Now');
        fireEvent.click(redeemButton);
        expect(global.fetch).toHaveBeenCalledWith('/api/coins/redeem', expect.any(Object));
      });
    });
  });
}); 