import { http, HttpResponse } from 'msw'

export const handlers = [
  // Auth handlers
  http.post('/api/auth/signin', async () => {
    return HttpResponse.json({
      url: '/dashboard',
      ok: true,
    })
  }),

  http.post('/api/auth/signout', () => {
    return HttpResponse.json({ ok: true })
  }),

  // Quote handlers
  http.post('/api/quote', async ({ request }) => {
    const data = await request.json() as { coverageAmount?: number } | null
    return HttpResponse.json({
      basePremium: 10000,
      riskFactor: 1.2,
      cityMultiplier: 1.1,
      familyDiscount: 0.1,
      finalPremium: 11880,
      coverageAmount: data?.coverageAmount || 500000,
      recommendedPlans: [
        {
          planId: 'plan-1',
          planName: 'Gold Health Individual',
          insurerName: 'HealthGuard Insurance',
          premium: 11880,
          features: ['Hospitalization', 'Pre & Post Care', 'Day Care'],
        },
      ],
    })
  }),

  http.get('/api/quote', () => {
    return HttpResponse.json([
      {
        id: 'quote-1',
        basePremium: 10000,
        finalPremium: 11880,
        coverageAmount: 500000,
        createdAt: new Date().toISOString(),
      },
    ])
  }),

  // Plan handlers
  http.get('/api/plans', () => {
    return HttpResponse.json([
      {
        id: 'plan-1',
        name: 'Gold Health Individual',
        description: 'Comprehensive individual health plan',
        insurerName: 'HealthGuard Insurance',
        coverageAmount: 500000,
        features: ['Hospitalization', 'Pre & Post Care', 'Day Care'],
      },
    ])
  }),

  http.get('/api/plans/:planId', ({ params }) => {
    return HttpResponse.json({
      id: params.planId,
      name: 'Gold Health Individual',
      description: 'Comprehensive individual health plan',
      insurerName: 'HealthGuard Insurance',
      coverageAmount: 500000,
      features: ['Hospitalization', 'Pre & Post Care', 'Day Care'],
      benefits: [
        {
          name: 'Hospitalization Cover',
          description: 'Covers in-patient hospitalization expenses',
          coverageAmount: 100,
          type: 'PERCENTAGE',
        },
      ],
    })
  }),

  // Hospital handlers
  http.get('/api/hospitals', () => {
    return HttpResponse.json([
      {
        id: 'hospital-1',
        name: 'City General Hospital',
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        specialties: ['Cardiology', 'Orthopedics'],
        rating: 4.5,
      },
    ])
  }),

  // Customer handlers
  http.get('/api/customer/profile', () => {
    return HttpResponse.json({
      id: 'customer-1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '1234567890',
      dateOfBirth: '1990-01-01',
    })
  }),

  http.get('/api/customer/policies', () => {
    return HttpResponse.json([
      {
        id: 'policy-1',
        policyNumber: 'POL123456',
        planName: 'Gold Health Individual',
        status: 'ACTIVE',
        premiumAmount: 12000,
        effectiveDate: '2024-01-01',
        expirationDate: '2024-12-31',
      },
    ])
  }),

  http.get('/api/customer/claims', () => {
    return HttpResponse.json([
      {
        id: 'claim-1',
        claimNumber: 'CLM123456',
        status: 'APPROVED',
        totalAmount: 50000,
        approvedAmount: 45000,
        submittedDate: '2024-02-01',
      },
    ])
  }),

  // Compare handlers
  http.post('/api/compare', async ({ request }) => {
    const data = await request.json() as { planIds?: string[] } | null
    return HttpResponse.json({
      id: 'comparison-1',
      plans: (data?.planIds || []).map((id: string) => ({
        id,
        name: 'Gold Health Individual',
        insurerName: 'HealthGuard Insurance',
        coverageAmount: 500000,
        premium: 12000,
        features: ['Hospitalization', 'Pre & Post Care', 'Day Care'],
      })),
    })
  }),
] 