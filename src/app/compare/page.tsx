'use client';

import React from 'react';
import { ComparisonTable } from '@/components/ui/comparison-table';
import { useSearchParams } from 'next/navigation';

const ComparePage: React.FC = () => {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const searchParams = useSearchParams();

  React.useEffect(() => {
    const planIds = searchParams.getAll('planId');
    if (planIds.length < 2) {
      setError('Please select at least two plans to compare.');
      return;
    }

    const fetchComparison = async () => {
      try {
        const response = await fetch('/api/compare', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ planIds }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch comparison');
        }

        const data = await response.json();
        setPlans(data.plans);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    };

    fetchComparison();
  }, [searchParams]);

  if (error) {
    return <div className="container mx-auto py-8">Error: {error}</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold">Compare Plans</h1>
      {plans.length > 0 ? (
        <ComparisonTable plans={plans} />
      ) : (
        <div>Loading comparison...</div>
      )}
    </div>
  );
};

export default ComparePage;

