'use client';

import React from 'react';
import { Card } from './card';
import { ScrollArea } from './scroll-area';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface ComparisonTableProps {
  plans: Array<{
    id: string;
    name: string;
    insurerName: string;
    coverageAmount: number;
    planType: string;
    features: string[];
    premium?: number;
    networkHospitals?: number;
    claimSettlementRatio?: number;
  }>;
  className?: string;
}

export const ComparisonTable: React.FC<ComparisonTableProps> = ({ plans, className }) => {
  // Get all unique features across all plans
  const allFeatures = Array.from(
    new Set(plans.flatMap(plan => plan.features))
  ).sort();

  return (
    <Card className={cn('overflow-hidden', className)}>
      <ScrollArea className="h-full w-full" orientation="both">
        <div className="min-w-[800px]">
          <table className="w-full caption-bottom text-sm">
            <thead>
              <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Plan Details</th>
                {plans.map(plan => (
                  <th key={plan.id} className="h-12 px-4 text-left align-middle font-medium">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle font-medium">Insurer</td>
                {plans.map(plan => (
                  <td key={plan.id} className="p-4 align-middle">
                    {plan.insurerName}
                  </td>
                ))}
              </tr>
              <tr className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle font-medium">Coverage Amount</td>
                {plans.map(plan => (
                  <td key={plan.id} className="p-4 align-middle">
                    ₹{plan.coverageAmount.toLocaleString()}
                  </td>
                ))}
              </tr>
              <tr className="border-b transition-colors hover:bg-muted/50">
                <td className="p-4 align-middle font-medium">Plan Type</td>
                {plans.map(plan => (
                  <td key={plan.id} className="p-4 align-middle">
                    {plan.planType}
                  </td>
                ))}
              </tr>
              {plans.some(plan => plan.premium !== undefined) && (
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">Premium</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="p-4 align-middle">
                      {plan.premium ? `₹${plan.premium.toLocaleString()}/year` : '-'}
                    </td>
                  ))}
                </tr>
              )}
              {plans.some(plan => plan.networkHospitals !== undefined) && (
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">Network Hospitals</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="p-4 align-middle">
                      {plan.networkHospitals?.toLocaleString() || '-'}
                    </td>
                  ))}
                </tr>
              )}
              {plans.some(plan => plan.claimSettlementRatio !== undefined) && (
                <tr className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle font-medium">Claim Settlement Ratio</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="p-4 align-middle">
                      {plan.claimSettlementRatio ? `${plan.claimSettlementRatio}%` : '-'}
                    </td>
                  ))}
                </tr>
              )}
              <tr className="border-b transition-colors">
                <td className="p-4 align-middle font-medium" colSpan={plans.length + 1}>
                  Features
                </td>
              </tr>
              {allFeatures.map(feature => (
                <tr key={feature} className="border-b transition-colors hover:bg-muted/50">
                  <td className="p-4 align-middle">{feature}</td>
                  {plans.map(plan => (
                    <td key={plan.id} className="p-4 align-middle">
                      {plan.features.includes(feature) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-destructive" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </Card>
  );
};

export default ComparisonTable;

