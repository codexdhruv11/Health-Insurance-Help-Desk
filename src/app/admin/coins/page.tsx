'use client';

import { CoinTransactionList } from '@/components/ui/coin-transaction-list';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function AdminCoinsPage() {
  return (
    <div className="container py-8">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-4xl font-bold">Coin System Administration</h1>
          <p className="mt-2 text-muted-foreground">
            Manage coin balances, view system statistics, and monitor transactions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Total Coins"
            value="0"
            description="Total coins in circulation"
          />
          <StatsCard
            title="Active Users"
            value="0"
            description="Users with coin wallets"
          />
          <StatsCard
            title="Today's Transactions"
            value="0"
            description="Total transactions today"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Manual Coin Management</CardTitle>
              </CardHeader>
              <CardContent>
                <CoinManagementForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Rate Limiter Status</span>
                    <Badge variant="outline">Healthy</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Database Connections</span>
                    <Badge variant="outline">Connected</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Cache Status</span>
                    <Badge variant="outline">Active</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <CoinTransactionList pageSize={5} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function CoinManagementForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const userId = formData.get('userId') as string;
    const amount = parseInt(formData.get('amount') as string);
    const reason = formData.get('reason') as string;
    const action = formData.get('action') as 'credit' | 'debit';

    if (!userId || !amount || !reason) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/coins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          userId,
          amount,
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process request');
      }

      toast({
        title: 'Success',
        description: `Successfully ${action}ed ${amount} coins to user ${userId}`,
      });

      // Reset form
      e.currentTarget.reset();
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to process request',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="userId" className="text-sm font-medium">
          User ID
        </label>
        <Input
          id="userId"
          name="userId"
          placeholder="Enter user ID"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="amount" className="text-sm font-medium">
          Amount
        </label>
        <Input
          id="amount"
          name="amount"
          type="number"
          min="1"
          placeholder="Enter coin amount"
          required
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="reason" className="text-sm font-medium">
          Reason
        </label>
        <Input
          id="reason"
          name="reason"
          placeholder="Enter reason for adjustment"
          required
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="submit"
          name="action"
          value="credit"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Credit Coins'}
        </Button>
        <Button
          type="submit"
          name="action"
          value="debit"
          variant="destructive"
          disabled={isLoading}
        >
          {isLoading ? 'Processing...' : 'Debit Coins'}
        </Button>
      </div>
    </form>
  );
} 