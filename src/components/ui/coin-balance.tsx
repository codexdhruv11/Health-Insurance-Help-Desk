import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Badge } from './badge';
import { Tooltip } from './tooltip';
import { useSession } from 'next-auth/react';
import { CoinTransaction } from '@prisma/client';

interface CoinBalanceProps {
  variant?: 'compact' | 'full' | 'detailed';
  className?: string;
}

interface WalletData {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: string;
  recentTransactions?: CoinTransaction[];
  earnOpportunities?: {
    taskType: string;
    coinAmount: number;
    cooldownPeriod: number;
    maxPerDay: number;
  }[];
}

export function CoinBalance({ variant = 'full', className = '' }: CoinBalanceProps) {
  const { data: session } = useSession();
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;

    async function fetchWalletData() {
      try {
        const response = await fetch('/api/coins/balance');
        if (!response.ok) throw new Error('Failed to fetch wallet data');
        const data = await response.json();
        setWalletData(data.data.wallet);
        setError(null);
      } catch (err) {
        setError('Error loading coin balance');
        console.error('Coin balance error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWalletData();
  }, [session]);

  if (!session?.user) return null;
  if (error) return <div className="text-red-500">{error}</div>;

  if (variant === 'compact') {
    return (
      <Tooltip content="Your coin balance">
        <Badge variant="secondary" className={className}>
          {isLoading ? '...' : walletData?.balance || 0} coins
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Your Coins</span>
          {variant === 'detailed' && (
            <Badge variant="outline">
              Last updated: {walletData?.lastUpdated ? new Date(walletData.lastUpdated).toLocaleString() : 'Never'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">
              {isLoading ? '...' : walletData?.balance || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Total coins available
            </div>
          </div>

          {variant === 'detailed' && (
            <>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Earned</div>
                  <div className="text-lg font-medium text-green-600">
                    +{walletData?.totalEarned || 0}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Total Spent</div>
                  <div className="text-lg font-medium text-red-600">
                    -{walletData?.totalSpent || 0}
                  </div>
                </div>
              </div>

              {walletData?.recentTransactions && walletData.recentTransactions.length > 0 && (
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {walletData.recentTransactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{tx.reason}</span>
                        <span
                          className={
                            tx.type === 'EARN'
                              ? 'text-green-600'
                              : tx.type === 'SPEND'
                              ? 'text-red-600'
                              : 'text-blue-600'
                          }
                        >
                          {tx.type === 'EARN' ? '+' : '-'}
                          {tx.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {walletData?.earnOpportunities && walletData.earnOpportunities.length > 0 && (
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-2">Earning Opportunities</h4>
                  <div className="space-y-2">
                    {walletData.earnOpportunities.map((opp) => (
                      <div
                        key={opp.taskType}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{opp.taskType.replace(/_/g, ' ').toLowerCase()}</span>
                        <Badge variant="secondary">+{opp.coinAmount}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 