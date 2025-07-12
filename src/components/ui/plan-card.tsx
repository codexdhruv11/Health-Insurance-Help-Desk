"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Heart, Users, Shield } from 'lucide-react';

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
  };
  premium?: number;
  isComparisonMode?: boolean;
  isSelected?: boolean;
  onCompareToggle?: (planId: string) => void;
  onViewDetails?: (planId: string) => void;
  onGetQuote?: (planId: string) => void;
  onBuyNow?: (planId: string) => void;
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
}: PlanCardProps) {
  const topBenefits = plan.benefits?.slice(0, 3) || [];
  
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
            {plan.insurer.logo && (
              <img 
                src={plan.insurer.logo} 
                alt={plan.insurer.name}
                className="w-8 h-8 object-contain"
              />
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

      <CardContent className="flex-1 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Coverage Amount</span>
            <span className="text-lg font-bold text-primary">
              ₹{plan.coverageAmount.toLocaleString()}
            </span>
          </div>
          
          {premium && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Premium</span>
              <span className="text-lg font-bold text-green-600">
                ₹{premium.toLocaleString()}/year
              </span>
            </div>
          )}
        </div>

        {topBenefits.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Key Benefits</h4>
            <ul className="space-y-1">
              {topBenefits.map((benefit) => (
                <li key={benefit.id} className="flex items-center space-x-2 text-sm">
                  <Shield className="w-3 h-3 text-green-500 flex-shrink-0" />
                  <span className="truncate">{benefit.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {plan.hospitalCount && (
            <div className="flex items-center space-x-1">
              <Users className="w-3 h-3" />
              <span>{plan.hospitalCount.toLocaleString()} hospitals</span>
            </div>
          )}
          {plan.policyCount && (
            <div className="flex items-center space-x-1">
              <Heart className="w-3 h-3" />
              <span>{plan.policyCount.toLocaleString()} policies</span>
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
