'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteForm } from '@/components/ui/quote-form';
import { z } from 'zod';

const QuoteFormSchema = z.object({
  age: z.number().min(18, 'Age must be at least 18').max(100, 'Age must be less than 100'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  gender: z.enum(['Male', 'Female', 'Other']),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  familyMembers: z.array(z.object({
    relationship: z.enum(['Spouse', 'Child', 'Parent', 'Sibling', 'Parent-in-law', 'Other']),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    age: z.number().min(0, 'Age must be positive').max(100, 'Age must be less than 100'),
    gender: z.enum(['Male', 'Female', 'Other']),
    medicalConditions: z.array(z.string()).optional(),
    isNominee: z.boolean().optional(),
  })).optional(),
  medicalConditions: z.array(z.string()).optional(),
  location: z.object({
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(6, 'Invalid pincode').max(6, 'Invalid pincode'),
  }),
});

type QuoteFormData = z.infer<typeof QuoteFormSchema>;

interface QuoteItem {
  id: string;
  plan: {
    id: string;
    name: string;
    coverageAmount: number;
    insurer: {
      name: string;
    };
  };
  basePremium: number;
  finalPremium: number;
  appliedDiscounts: string[];
}

export default function QuotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<QuoteItem[]>([]);
  const [step, setStep] = useState(1);

  const handleSubmit = async (data: QuoteFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          planId: planId || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate quote');
      }

      const result = await response.json();
      setQuotes(result.quotes);
      setStep(2);
    } catch (error) {
      console.error('Quote generation error:', error);
      alert('Failed to generate quote. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToCheckout = (quoteItemId: string) => {
    router.push(`/checkout?quoteItemId=${quoteItemId}`);
  };

  if (step === 2) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Your Quotes</h1>
        
        <div className="grid gap-6">
          {quotes.map((quote) => (
            <Card key={quote.id}>
              <CardHeader>
                <CardTitle>{quote.plan.name}</CardTitle>
                <CardDescription>by {quote.plan.insurer.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium">Coverage Amount</h4>
                    <p className="text-xl font-bold text-green-600">
                      ₹{quote.plan.coverageAmount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Base Premium</h4>
                    <p className="text-xl">₹{quote.basePremium.toLocaleString()}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Final Premium</h4>
                    <p className="text-2xl font-bold text-blue-600">
                      ₹{quote.finalPremium.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {quote.appliedDiscounts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium mb-2">Applied Discounts</h4>
                    <ul className="list-disc list-inside text-sm text-green-600">
                      {quote.appliedDiscounts.map((discount, index) => (
                        <li key={index}>{discount}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  onClick={() => handleProceedToCheckout(quote.id)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Get Your Quote</h1>
      <QuoteForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
}
