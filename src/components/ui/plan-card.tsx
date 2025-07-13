"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Heart, Users, Shield, Building2, Stethoscope, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PlanCardProps {
  plan: {
    id: string;
    name: string;
    description: string;
    coverageAmount: number;
    planType: string;
    insurer: {
      id: string;
      name: string;
      logo?: string;
      rating: number;
    };
    benefits?: Array<{
      id: string;
      name: string;
      description: string;
      coverageAmount: number;
    }>;
    hospitalCount?: number;
    policyCount?: number;
    claimSettlementRatio?: number;
  };
  premium?: number;
  isComparisonMode?: boolean;
  isSelected?: boolean;
  onCompareToggle?: (planId: string) => void;
  onViewDetails?: (planId: string) => void;
  onGetQuote?: (planId: string) => void;
  onBuyNow?: (planId: string) => void;
  isLoading?: boolean;
}

export function PlanCardSkeleton() {
  return (
    <Card className="relative h-full flex flex-col">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded" />
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16 mt-1" />
            </div>
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6 mt-1" />
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </CardContent>
      <CardFooter className="pt-4 space-y-2">
        <div className="flex space-x-2 w-full">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-full" />
      </CardFooter>
    </Card>
  );
}

export function PlanCard({
  plan,
  premium,
  isComparisonMode = false,
  isSelected = false,
  onCompareToggle,
  onViewDetails,
  onGetQuote,
  onBuyNow,
  isLoading = false,
}: PlanCardProps) {
  if (isLoading) {
    return <PlanCardSkeleton />;
  }

  const topBenefits = plan.benefits?.slice(0, 3) || [];
  const formatAmount = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return `₹${amount.toLocaleString()}`;
  };
  
  return (
    <Card className="relative h-full flex flex-col hover:shadow-lg transition-shadow duration-200">
      {isComparisonMode && (
        <div className="absolute top-4 right-4 z-10">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onCompareToggle?.(plan.id)}
          />
        </div>
      )}
      
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {plan.insurer.logo ? (
              <img 
                src={plan.insurer.logo} 
                alt={plan.insurer.name}
                className="w-8 h-8 object-contain"
              />
            ) : (
              <Building2 className="w-8 h-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm text-muted-foreground">{plan.insurer.name}</p>
              <div className="flex items-center space-x-1">
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs text-muted-foreground">{plan.insurer.rating}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary">{plan.planType}</Badge>
        </div>
        
        <CardTitle className="text-lg leading-tight">{plan.name}</CardTitle>
        <CardDescription className="text-sm line-clamp-2">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Coverage</span>
            <span className="font-medium">{formatAmount(plan.coverageAmount)}</span>
          </div>
          
          {premium !== undefined && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Premium</span>
              <span className="font-medium">{formatAmount(premium)}/year</span>
            </div>
          )}

          {plan.hospitalCount && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Stethoscope className="w-4 h-4" />
              <span>{plan.hospitalCount.toLocaleString()} Network Hospitals</span>
            </div>
          )}

          {plan.claimSettlementRatio && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Activity className="w-4 h-4" />
              <span>{plan.claimSettlementRatio}% Claim Settlement Ratio</span>
            </div>
          )}

          {topBenefits.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Key Benefits</p>
              <ul className="space-y-1">
                {topBenefits.map(benefit => (
                  <li key={benefit.id} className="flex items-start space-x-2 text-sm">
                    <Shield className="w-4 h-4 mt-0.5 text-primary" />
                    <span>{benefit.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4 space-y-2">
        <div className="flex space-x-2 w-full">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onViewDetails?.(plan.id)}
          >
            View Details
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => onGetQuote?.(plan.id)}
          >
            Get Quote
          </Button>
        </div>
        <Button 
          className="w-full" 
          onClick={() => onBuyNow?.(plan.id)}
        >
          Buy Now
        </Button>
      </CardFooter>
    </Card>
  );
}
