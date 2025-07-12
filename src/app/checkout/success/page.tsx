'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [policy, setPolicy] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      // In a real implementation, you would fetch the policy details
      // based on the session ID from your backend
      setPolicy({
        policyNumber: 'POL' + Date.now().toString().slice(-8),
        planName: 'Comprehensive Health Plan',
        insurerName: 'Health Insurance Co.',
        coverageAmount: 500000,
        premiumAmount: 12000,
        effectiveDate: new Date().toLocaleDateString(),
      });
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">
              Payment Successful!
            </CardTitle>
            <p className="text-gray-600">
              Your health insurance policy has been activated
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {policy && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                <h3 className="font-semibold text-lg">Policy Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Policy Number</p>
                    <p className="font-semibold">{policy.policyNumber}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Plan Name</p>
                    <p className="font-semibold">{policy.planName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Insurer</p>
                    <p className="font-semibold">{policy.insurerName}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Coverage Amount</p>
                    <p className="font-semibold">₹{policy.coverageAmount.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Premium Paid</p>
                    <p className="font-semibold">₹{policy.premiumAmount.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Effective Date</p>
                    <p className="font-semibold">{policy.effectiveDate}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-semibold">What's Next?</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>A confirmation email has been sent to your registered email address</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Your policy documents will be available in your dashboard within 24 hours</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>You can download your policy certificate from the customer portal</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>Your insurance card will be mailed to your registered address</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={() => window.location.href = '/customer/dashboard'} className="flex-1">
                Go to Dashboard
              </Button>
              <Button 
                variant="outline" 
                onClick={() => window.print()} 
                className="flex-1"
              >
                Print Confirmation
              </Button>
            </div>

            <div className="text-center text-sm text-gray-600">
              Need help? Contact our support team at{' '}
              <a href="mailto:support@healthinsurance.com" className="text-blue-600">
                support@healthinsurance.com
              </a>{' '}
              or call 1-800-HEALTH
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
