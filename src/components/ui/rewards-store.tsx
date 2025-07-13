import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { useSession } from 'next-auth/react';
import { RewardItem, RewardCategory } from '@prisma/client';
import { useToast } from './toaster';

interface RewardsStoreProps {
  className?: string;
  pageSize?: number;
}

interface RewardsResponse {
  rewards: (RewardItem & { redemptionCount: number })[];
  pagination: {
    total: number;
    hasMore: boolean;
    currentPage: number;
    pageSize: number;
  };
  filters: {
    categories: { category: RewardCategory; _count: number }[];
    priceRange: {
      min: number;
      max: number;
    };
  };
}

export function RewardsStore({ className = '', pageSize = 12 }: RewardsStoreProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<(RewardItem & { redemptionCount: number })[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    hasMore: false,
    currentPage: 1,
    pageSize,
  });
  const [filters, setFilters] = useState<{
    categories: { category: RewardCategory; _count: number }[];
    priceRange: { min: number; max: number };
  }>({
    categories: [],
    priceRange: { min: 0, max: 0 },
  });
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeemingItemId, setRedeemingItemId] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, [session, selectedCategory, pagination.currentPage, pageSize]);

  async function fetchRewards() {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        skip: String((pagination.currentPage - 1) * pageSize),
        take: String(pageSize),
        ...(selectedCategory && { category: selectedCategory }),
      });

      const response = await fetch(`/api/rewards?${params}`);
      if (!response.ok) throw new Error('Failed to fetch rewards');
      
      const data = await response.json();
      const result = data.data as RewardsResponse;
      
      setRewards(result.rewards);
      setPagination(result.pagination);
      setFilters(result.filters);
      setError(null);
    } catch (err) {
      setError('Error loading rewards');
      console.error('Rewards fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRedeem(rewardId: string) {
    if (!session?.user) return;

    try {
      setRedeemingItemId(rewardId);
      const response = await fetch('/api/coins/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rewardItemId: rewardId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to redeem reward');
      }

      const result = await response.json();
      toast({
        title: 'Reward Redeemed!',
        description: 'Your reward has been successfully redeemed.',
      });

      // Refresh rewards list
      fetchRewards();
    } catch (err) {
      toast({
        title: 'Redemption Failed',
        description: err instanceof Error ? err.message : 'Failed to redeem reward',
        variant: 'destructive',
      });
    } finally {
      setRedeemingItemId(null);
    }
  }

  if (!session?.user) return null;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Rewards Store</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedCategory(null)}
            disabled={!selectedCategory}
          >
            All Categories
          </Button>
          {filters.categories.map(({ category, _count }) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category.toLowerCase()} ({_count})
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading rewards...</div>
      ) : rewards.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No rewards available in this category
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rewards.map((reward) => (
            <Card key={reward.id}>
              {reward.imageUrl && (
                <div className="aspect-square overflow-hidden">
                  <img
                    src={reward.imageUrl}
                    alt={reward.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{reward.name}</CardTitle>
                    <CardDescription>{reward.description}</CardDescription>
                  </div>
                  <Badge>{reward.coinCost} coins</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <Badge variant="outline">{reward.category.toLowerCase()}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Stock</span>
                    <span>{reward.stock} available</span>
                  </div>
                  {reward.redemptionCount > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Redeemed</span>
                      <span>{reward.redemptionCount} times</span>
                    </div>
                  )}
                  <Button
                    className="w-full mt-4"
                    onClick={() => handleRedeem(reward.id)}
                    disabled={!reward.isAvailable || reward.stock === 0 || redeemingItemId === reward.id}
                  >
                    {redeemingItemId === reward.id
                      ? 'Redeeming...'
                      : !reward.isAvailable
                      ? 'Not Available'
                      : reward.stock === 0
                      ? 'Out of Stock'
                      : 'Redeem Now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
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
          onClick={() =>
            setPagination((p) => ({ ...p, currentPage: p.currentPage + 1 }))
          }
          disabled={!pagination.hasMore}
        >
          Next
        </Button>
      </div>
    </div>
  );
} 