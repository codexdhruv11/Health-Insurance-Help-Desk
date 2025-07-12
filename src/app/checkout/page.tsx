'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Parent-in-law',
  'Other',
] as const;

const FamilyMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  relationship: z.enum(RELATIONSHIPS),
  gender: z.enum(['Male', 'Female', 'Other']),
  isNominee: z.boolean().optional(),
});

const CheckoutFormSchema = z.object({
  familyMembers: z.array(FamilyMemberSchema).optional(),
  nominee: z.object({
    firstName: z.string().min(1, 'Nominee first name is required'),
    lastName: z.string().min(1, 'Nominee last name is required'),
    dateOfBirth: z.string().min(1, 'Nominee date of birth is required'),
    relationship: z.enum(RELATIONSHIPS),
    gender: z.enum(['Male', 'Female', 'Other']),
  }),
  address: z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().min(6, 'Invalid pincode').max(6, 'Invalid pincode'),
  }),
});

type CheckoutFormData = z.infer<typeof CheckoutFormSchema>;

interface QuoteItem {
  id: string;
  plan: {
    name: string;
    coverageAmount: number;
    insurer: {
      name: string;
    };
  };
  finalPremium: number;
  familyMembers?: Array<{
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    relationship: string;
    gender: string;
    isNominee?: boolean;
  }>;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteItemId = searchParams.get('quoteItemId');
  
  const [quoteItem, setQuoteItem] = useState<QuoteItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<CheckoutFormData>({
    resolver: zodResolver(CheckoutFormSchema),
    defaultValues: {
      familyMembers: [],
      nominee: {
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        relationship: 'Other',
        gender: 'Other',
      },
      address: {
        line1: '',
        line2: '',
        city: '',
        state: '',
        pincode: '',
      },
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'familyMembers',
  });

  const watchFamilyMembers = watch('familyMembers');
  const hasNominee = watchFamilyMembers?.some(member => member.isNominee);

  useEffect(() => {
    if (!quoteItemId) {
      router.push('/quote');
      return;
    }

    // Fetch quote item details
    const fetchQuoteItem = async () => {
      try {
        const response = await fetch(`/api/quote/${quoteItemId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch quote');
        }
        const data = await response.json();
        setQuoteItem(data);

        // Pre-fill family members if they exist
        if (data.familyMembers?.length) {
          data.familyMembers.forEach((member: any) => {
            append(member);
          });

          // If there's a nominee, pre-fill nominee details
          const nominee = data.familyMembers.find((m: any) => m.isNominee);
          if (nominee) {
            setValue('nominee', nominee);
          }
        }
      } catch (error) {
        console.error('Error fetching quote item:', error);
        router.push('/quote');
      } finally {
        setLoading(false);
      }
    };

    fetchQuoteItem();
  }, [quoteItemId, router, append, setValue]);

  const onSubmit = async (data: CheckoutFormData) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteItemId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const result = await response.json();
      
      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to proceed to payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container mx-auto py-8">Loading checkout details...</div>;
  }

  if (!quoteItem) {
    return <div className="container mx-auto py-8">Quote not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Checkout</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold">{quoteItem.plan.name}</h4>
                  <p className="text-sm text-gray-600">by {quoteItem.plan.insurer.name}</p>
                  <p className="text-sm">Coverage: ₹{quoteItem.plan.coverageAmount.toLocaleString()}</p>
                </div>
                
                <hr />
                
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Total Premium</span>
                  <span className="text-2xl font-bold text-green-600">
                    ₹{quoteItem.finalPremium.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Family Members */}
            <Card>
              <CardHeader>
                <CardTitle>Family Members</CardTitle>
                <CardDescription>
                  Add family members to be covered under this policy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-semibold">Family Member {index + 1}</h4>
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => remove(index)}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>First Name</Label>
                        <Input
                          {...register(`familyMembers.${index}.firstName`)}
                          placeholder="Enter first name"
                        />
                        {errors.familyMembers?.[index]?.firstName && (
                          <p className="text-sm text-red-600">
                            {errors.familyMembers[index]?.firstName?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Last Name</Label>
                        <Input
                          {...register(`familyMembers.${index}.lastName`)}
                          placeholder="Enter last name"
                        />
                        {errors.familyMembers?.[index]?.lastName && (
                          <p className="text-sm text-red-600">
                            {errors.familyMembers[index]?.lastName?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Date of Birth</Label>
                        <Input
                          type="date"
                          {...register(`familyMembers.${index}.dateOfBirth`)}
                        />
                        {errors.familyMembers?.[index]?.dateOfBirth && (
                          <p className="text-sm text-red-600">
                            {errors.familyMembers[index]?.dateOfBirth?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Relationship</Label>
                        <Select {...register(`familyMembers.${index}.relationship`)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                          <SelectContent>
                            {RELATIONSHIPS.map((rel) => (
                              <SelectItem key={rel} value={rel}>
                                {rel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.familyMembers?.[index]?.relationship && (
                          <p className="text-sm text-red-600">
                            {errors.familyMembers[index]?.relationship?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label>Gender</Label>
                        <Select {...register(`familyMembers.${index}.gender`)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.familyMembers?.[index]?.gender && (
                          <p className="text-sm text-red-600">
                            {errors.familyMembers[index]?.gender?.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        {...register(`familyMembers.${index}.isNominee`)}
                        disabled={hasNominee && !field.isNominee}
                        onChange={(e) => {
                          if (e.target.checked && watchFamilyMembers && watchFamilyMembers[index]) {
                            const member = watchFamilyMembers[index];
                            setValue('nominee', {
                              firstName: member.firstName,
                              lastName: member.lastName,
                              dateOfBirth: member.dateOfBirth,
                              relationship: member.relationship,
                              gender: member.gender,
                            });
                          }
                        }}
                      />
                      <Label>Set as nominee</Label>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => append({
                    firstName: '',
                    lastName: '',
                    dateOfBirth: '',
                    relationship: 'Other',
                    gender: 'Other',
                    isNominee: false,
                  })}
                >
                  Add Family Member
                </Button>
              </CardContent>
            </Card>

            {/* Nominee Information */}
            <Card>
              <CardHeader>
                <CardTitle>Nominee Information</CardTitle>
                <CardDescription>
                  Nominee is the person who will receive the benefits in case of unfortunate events
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      {...register('nominee.firstName')}
                      placeholder="Enter nominee's first name"
                    />
                    {errors.nominee?.firstName && (
                      <p className="text-sm text-red-600">{errors.nominee.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Last Name</Label>
                    <Input
                      {...register('nominee.lastName')}
                      placeholder="Enter nominee's last name"
                    />
                    {errors.nominee?.lastName && (
                      <p className="text-sm text-red-600">{errors.nominee.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <Input
                      type="date"
                      {...register('nominee.dateOfBirth')}
                    />
                    {errors.nominee?.dateOfBirth && (
                      <p className="text-sm text-red-600">{errors.nominee.dateOfBirth.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Relationship</Label>
                    <Select {...register('nominee.relationship')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        {RELATIONSHIPS.map((rel) => (
                          <SelectItem key={rel} value={rel}>
                            {rel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.nominee?.relationship && (
                      <p className="text-sm text-red-600">{errors.nominee.relationship.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Gender</Label>
                    <Select {...register('nominee.gender')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.nominee?.gender && (
                      <p className="text-sm text-red-600">{errors.nominee.gender.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle>Address Information</CardTitle>
                <CardDescription>
                  Please provide your correspondence address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Address Line 1</Label>
                  <Input
                    {...register('address.line1')}
                    placeholder="Enter your street address"
                  />
                  {errors.address?.line1 && (
                    <p className="text-sm text-red-600">{errors.address.line1.message}</p>
                  )}
                </div>

                <div>
                  <Label>Address Line 2 (Optional)</Label>
                  <Input
                    {...register('address.line2')}
                    placeholder="Enter apartment, suite, etc."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      {...register('address.city')}
                      placeholder="Enter city"
                    />
                    {errors.address?.city && (
                      <p className="text-sm text-red-600">{errors.address.city.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>State</Label>
                    <Input
                      {...register('address.state')}
                      placeholder="Enter state"
                    />
                    {errors.address?.state && (
                      <p className="text-sm text-red-600">{errors.address.state.message}</p>
                    )}
                  </div>

                  <div>
                    <Label>Pincode</Label>
                    <Input
                      {...register('address.pincode')}
                      placeholder="Enter pincode"
                    />
                    {errors.address?.pincode && (
                      <p className="text-sm text-red-600">{errors.address.pincode.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Processing...' : 'Proceed to Payment'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
