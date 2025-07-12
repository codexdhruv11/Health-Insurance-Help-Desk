'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PlansPage: React.FC = () => {
  const [plans, setPlans] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Fetch from API instead of direct database call
        const response = await fetch('/api/plans');
        if (response.ok) {
          const data = await response.json();
          setPlans(data.plans || []);
        } else {
          setError('Failed to fetch plans');
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
        setError('Error fetching plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <div>
      <h1>Insurance Plans</h1>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>
            <div>{plan.name}</div>
            <div>{plan.description}</div>
            <div>Coverage: {plan.coverageAmount}</div>
            <div>Insurer: {plan.insurer.name}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlansPage;
