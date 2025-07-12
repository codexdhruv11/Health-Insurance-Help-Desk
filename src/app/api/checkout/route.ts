import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Input validation schema
const CheckoutInputSchema = z.object({
  quoteItemId: z.string(),
  familyMembers: z.array(z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    relationship: z.string(),
  })).optional(),
  nominee: z.object({
    firstName: z.string(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    relationship: z.string(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    const input = CheckoutInputSchema.parse(body);

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer profile not found' },
        { status: 404 }
      );
    }

    // Get quote item details
    const quoteItem = await prisma.quoteItem.findUnique({
      where: { id: input.quoteItemId },
      include: {
        quote: true,
        plan: {
          include: {
            insurer: true,
          },
        },
      },
    });

    if (!quoteItem) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    if (quoteItem.quote.status === 'EXPIRED') {
      return NextResponse.json(
        { error: 'Quote has expired. Please generate a new quote.' },
        { status: 400 }
      );
    }

    // Create policy record (pending status)
    const policy = await prisma.policy.create({
      data: {
        customerId: customer.id,
        planId: quoteItem.plan.id,
        policyNumber: generatePolicyNumber(),
        status: 'PENDING',
        effectiveDate: new Date(), // Will be updated after payment
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        premiumAmount: quoteItem.finalPremium,
        deductible: 0, // TODO: Handle deductible from plan
        coverageDetails: {
          familyMembers: input.familyMembers || [],
          nominee: input.nominee,
        },
      },
    });

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        policyId: policy.id,
        customerId: customer.id,
        amount: quoteItem.finalPremium,
        status: 'PENDING',
        paymentMethod: 'STRIPE',
      },
    });

    // Create Stripe checkout session
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${quoteItem.plan.name} - Health Insurance Policy`,
              description: `Coverage: ₹${quoteItem.plan.coverageAmount}`,
              images: [quoteItem.plan.insurer.logo],
            },
            unit_amount: Math.round(Number(quoteItem.finalPremium) * 100), // Convert to paise
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/cancel`,
      customer_email: customer.user.email,
      metadata: {
        policyId: policy.id,
        paymentId: payment.id,
        customerId: customer.id,
      },
    });

    // Update quote status
    await prisma.quote.update({
      where: { id: quoteItem.quote.id },
      data: { status: 'CONVERTED' },
    });

    return NextResponse.json({
      checkoutUrl: stripeSession.url,
      policyId: policy.id,
    });
  } catch (error: any) {
    console.error('Checkout error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// Helper function to generate policy number
function generatePolicyNumber(): string {
  const prefix = 'POL';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
} 