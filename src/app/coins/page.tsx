import { CoinBalance } from '@/components/ui/coin-balance';
import { CoinTransactionList } from '@/components/ui/coin-transaction-list';
import { CoinEarningTasks } from '@/components/ui/coin-earning-tasks';

export default function CoinsDashboardPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-bold">Coin Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Track your coin balance, transactions, and earning opportunities
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <CoinBalance variant="detailed" />
            <CoinEarningTasks />
          </div>
          <div>
            <CoinTransactionList />
          </div>
        </div>
      </div>
    </div>
  );
} 