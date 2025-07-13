import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { useSession } from 'next-auth/react';
import { useToast } from './toaster';
import { CoinEarnReason } from '@prisma/client';

interface CoinEarningTasksProps {
  className?: string;
}

interface EarnRule {
  taskType: CoinEarnReason;
  coinAmount: number;
  cooldownPeriod: number;
  maxPerDay: number;
  isActive: boolean;
}

interface TaskProgress {
  taskType: CoinEarnReason;
  completedToday: number;
  nextAvailableAt?: Date;
}

export function CoinEarningTasks({ className = '' }: CoinEarningTasksProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [earnRules, setEarnRules] = useState<EarnRule[]>([]);
  const [taskProgress, setTaskProgress] = useState<TaskProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatingTask, setSimulatingTask] = useState<string | null>(null);

  useEffect(() => {
    if (!session?.user) return;
    fetchEarnRules();
  }, [session]);

  async function fetchEarnRules() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/coins/balance');
      if (!response.ok) throw new Error('Failed to fetch earn rules');
      
      const data = await response.json();
      setEarnRules(data.data.earnOpportunities);
      setTaskProgress(data.data.taskProgress || []);
      setError(null);
    } catch (err) {
      setError('Error loading earning opportunities');
      console.error('Earn rules fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function simulateTask(taskType: CoinEarnReason) {
    if (!session?.user || process.env.NODE_ENV !== 'development') return;

    try {
      setSimulatingTask(taskType);
      const response = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: taskType }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to simulate task');
      }

      const result = await response.json();
      toast({
        title: 'Task Completed!',
        description: `You earned ${result.data.transaction.amount} coins!`,
      });

      // Refresh task progress
      fetchEarnRules();
    } catch (err) {
      toast({
        title: 'Task Failed',
        description: err instanceof Error ? err.message : 'Failed to complete task',
        variant: 'destructive',
      });
    } finally {
      setSimulatingTask(null);
    }
  }

  function formatTaskType(type: string) {
    return type.replace(/_/g, ' ').toLowerCase();
  }

  function getTaskDescription(type: CoinEarnReason): string {
    switch (type) {
      case 'SIGN_UP':
        return 'Create a new account';
      case 'DAILY_LOGIN':
        return 'Log in to your account daily';
      case 'POLICY_PURCHASE':
        return 'Purchase a new insurance policy';
      case 'REFERRAL':
        return 'Refer a friend to join';
      case 'HEALTH_QUIZ':
        return 'Complete the health assessment quiz';
      case 'DOCUMENT_UPLOAD':
        return 'Upload required documents';
      case 'ADMIN_CREDIT':
        return 'Special reward from admin';
      default:
        return 'Complete this task to earn coins';
    }
  }

  function getTaskProgress(type: CoinEarnReason): TaskProgress | undefined {
    return taskProgress.find((p) => p.taskType === type);
  }

  if (!session?.user) return null;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Earn More Coins</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading tasks...</div>
        ) : earnRules.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No earning opportunities available
          </div>
        ) : (
          <div className="space-y-4">
            {earnRules.map((rule) => {
              const progress = getTaskProgress(rule.taskType);
              const isAvailable = !progress?.nextAvailableAt || new Date(progress.nextAvailableAt) <= new Date();
              const remainingTasks = rule.maxPerDay - (progress?.completedToday || 0);

              return (
                <div
                  key={rule.taskType}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/5"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {formatTaskType(rule.taskType)}
                        </h3>
                        <Badge variant="secondary">
                          +{rule.coinAmount} coins
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getTaskDescription(rule.taskType)}
                      </p>
                      {rule.maxPerDay > 1 && (
                        <p className="text-xs text-muted-foreground">
                          {remainingTasks} of {rule.maxPerDay} attempts remaining today
                        </p>
                      )}
                      {progress?.nextAvailableAt && !isAvailable && (
                        <p className="text-xs text-muted-foreground">
                          Available again at{' '}
                          {new Date(progress.nextAvailableAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    {process.env.NODE_ENV === 'development' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => simulateTask(rule.taskType)}
                        disabled={
                          !isAvailable ||
                          remainingTasks <= 0 ||
                          simulatingTask === rule.taskType
                        }
                      >
                        {simulatingTask === rule.taskType
                          ? 'Simulating...'
                          : !isAvailable
                          ? 'Cooldown'
                          : remainingTasks <= 0
                          ? 'Max Reached'
                          : 'Simulate'}
                      </Button>
                    )}
                  </div>
                  {rule.maxPerDay > 1 && (
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{
                          width: `${((progress?.completedToday || 0) / rule.maxPerDay) * 100}%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 