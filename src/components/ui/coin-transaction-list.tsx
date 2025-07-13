import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { useSession } from 'next-auth/react';
import { CoinTransaction } from '@prisma/client';

interface TransactionListProps {
  className?: string;
  pageSize?: number;
}

interface TransactionResponse {
  transactions: CoinTransaction[];
  pagination: {
    total: number;
    hasMore: boolean;
    currentPage: number;
    pageSize: number;
  };
}

export function CoinTransactionList({ className = '', pageSize = 10 }: TransactionListProps) {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
    currentPage: 1,
    pageSize,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    type?: 'EARN' | 'SPEND' | 'REFUND';
    startDate?: string;
    endDate?: string;
  }>({});

  useEffect(() => {
    if (!session?.user) return;
    fetchTransactions();
  }, [session, filter, pagination.currentPage, pageSize]);

  async function fetchTransactions() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: String((pagination.currentPage - 1) * pageSize),
        take: String(pageSize),
        ...(filter.type && { type: filter.type }),
        ...(filter.startDate && { startDate: filter.startDate }),
        ...(filter.endDate && { endDate: filter.endDate }),
      });

      const response = await fetch(`/api/coins/transactions?${params}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      const result = data.data as TransactionResponse;
      
      setTransactions(result.transactions);
      setPagination(result.pagination);
      setError(null);
    } catch (err) {
      setError('Error loading transactions');
      console.error('Transaction fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(date: string | Date) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatReason(reason: string) {
    return reason.replace(/_/g, ' ').toLowerCase();
  }

  if (!session?.user) return null;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Transaction History</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilter({})}
              disabled={!filter.type}
            >
              All
            </Button>
            <Button
              variant={filter.type === 'EARN' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter({ ...filter, type: 'EARN' })}
            >
              Earned
            </Button>
            <Button
              variant={filter.type === 'SPEND' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter({ ...filter, type: 'SPEND' })}
            >
              Spent
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No transactions found
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        tx.type === 'EARN'
                          ? 'default'
                          : tx.type === 'SPEND'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {tx.type}
                    </Badge>
                    <span className="text-sm font-medium">
                      {formatReason(tx.reason || '')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(tx.createdAt)}
                  </div>
                </div>
                <div
                  className={`text-lg font-medium ${
                    tx.type === 'EARN'
                      ? 'text-green-600'
                      : tx.type === 'SPEND'
                      ? 'text-red-600'
                      : 'text-blue-600'
                  }`}
                >
                  {tx.type === 'EARN' ? '+' : '-'}
                  {tx.amount}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((p) => ({ ...p, currentPage: p.currentPage - 1 }))
                }
                disabled={pagination.currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.currentPage} of{' '}
                {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPagination((p) => ({ ...p, currentPage: p.currentPage + 1 }))
                }
                disabled={!pagination.hasMore}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 