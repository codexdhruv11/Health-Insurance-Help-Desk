import { RewardsStore } from '@/components/ui/rewards-store';
import { CoinBalance } from '@/components/ui/coin-balance';

export default function RewardsPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold">Rewards Store</h1>
            <p className="mt-2 text-muted-foreground">
              Redeem your coins for exclusive rewards and benefits
            </p>
          </div>
          <CoinBalance variant="detailed" className="w-[300px]" />
        </div>
        <RewardsStore />
      </div>
    </div>
  );
} 