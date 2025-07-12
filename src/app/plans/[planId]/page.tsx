'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PlanDetails {
  id: string;
  name: string;
  description: string;
  coverageAmount: number;
  planType: string;
  features: string[];
  waitingPeriods: Record<string, string>;
  insurer: {
    id: string;
    name: string;
    logo: string;
    rating: number;
  };
  benefits: Array<{
    id: string;
    name: string;
    coverageAmount: number;
    conditions: string[];
  }>;
  networkHospitals: Array<{
    hospital: {
      id: string;
      name: string;
      address: any;
      specialties: string[];
    };
    cashless: boolean;
  }>;
}

export default function PlanDetailsPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [plan, setPlan] = useState<PlanDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlanDetails = async () => {
      try {
        const response = await fetch(`/api/plans/${planId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch plan details');
        }
        const data = await response.json();
        setPlan(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      fetchPlanDetails();
    }
  }, [planId]);

  const handleGetQuote = () => {
    window.location.href = `/quote?planId=${planId}`;
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading plan details...</div>;
  }

  if (error || !plan) {
    return <div className="container mx-auto py-8">Error: {error || 'Plan not found'}</div>;
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Plan Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={plan.insurer.logo}
                alt={plan.insurer.name}
                className="h-12 w-12 object-contain"
              />
              <div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>by {plan.insurer.name}</CardDescription>
              </div>
            </div>
            <Badge variant="outline">{plan.planType}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <h4 className="font-semibold">Coverage Amount</h4>
              <p className="text-2xl font-bold text-green-600">₹{plan.coverageAmount.toLocaleString()}</p>
            </div>
            <div>
              <h4 className="font-semibold">Insurer Rating</h4>
              <p className="text-xl">⭐ {plan.insurer.rating}/5</p>
            </div>
            <div>
              <h4 className="font-semibold">Network Hospitals</h4>
              <p className="text-xl">{plan.networkHospitals.length}</p>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{plan.description}</p>
          <Button onClick={handleGetQuote} className="w-full md:w-auto">
            Get Quote
          </Button>
        </CardContent>
      </Card>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {plan.features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-green-500">✓</span>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Benefits & Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plan.benefits.map((benefit) => (
              <div key={benefit.id} className="border-l-4 border-blue-500 pl-4">
                <h4 className="font-semibold">{benefit.name}</h4>
                <p className="text-green-600 font-medium">₹{benefit.coverageAmount.toLocaleString()}</p>
                {benefit.conditions.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">Conditions:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {benefit.conditions.map((condition, idx) => (
                        <li key={idx}>{condition}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Waiting Periods */}
      <Card>
        <CardHeader>
          <CardTitle>Waiting Periods</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(plan.waitingPeriods).map(([condition, period]) => (
              <div key={condition} className="flex justify-between">
                <span className="font-medium">{condition}:</span>
                <span>{period}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Hospitals Sample */}
      <Card>
        <CardHeader>
          <CardTitle>Network Hospitals (Sample)</CardTitle>
          <CardDescription>
            Showing first 10 hospitals. Total: {plan.networkHospitals.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.networkHospitals.slice(0, 10).map((nh, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{nh.hospital.name}</h4>
                  <p className="text-sm text-gray-600">
                    {nh.hospital.address.city}, {nh.hospital.address.state}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {nh.hospital.specialties.slice(0, 3).map((specialty, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  {nh.cashless && (
                    <Badge variant="outline" className="text-green-600">
                      Cashless
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
