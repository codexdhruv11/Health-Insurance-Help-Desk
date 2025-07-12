import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import QuoteEngine, { QuoteInputSchema } from '@/lib/quote-engine';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Get user session for rate limiting
    const session = await getServerSession(authOptions);
    const rateLimitKey = session?.user?.id || req.headers.get('x-forwarded-for') || 'anonymous';
    
    // Rate limiting
    const rateLimitInfo = await rateLimit(rateLimitKey, {
      maxRequests: 10,
      windowMs: 60 * 1000, // 1 minute
      prefix: 'quote:'
    });
    
    if (!rateLimitInfo.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate input
    const validatedInput = QuoteInputSchema.parse(body);

    // Use session from rate limiting check
    const customerId = session?.user?.id;

    // Generate quotes
    const quoteItems = await QuoteEngine.generateQuotes(validatedInput);

    // Store quote in database if user is logged in
    let quote: any = null;
    if (customerId) {
      quote = await prisma.quote.create({
        data: {
          customerId,
          age: validatedInput.age,
          city: validatedInput.city,
          coverageAmount: validatedInput.coverageAmount,
          familySize: validatedInput.familySize,
          medicalHistory: validatedInput.medicalHistory || {},
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days expiry
          quoteItems: {
            create: quoteItems.map(item => ({
              planId: item.planId,
              premium: item.premium,
              discounts: item.discounts,
              finalPremium: item.finalPremium,
            })),
          },
        },
        include: {
          quoteItems: {
            include: {
              plan: {
                include: {
                  insurer: true,
                  benefits: true,
                },
              },
            },
          },
        },
      });
    }

    // Return quotes with plan details
    const response = {
      quoteId: quote?.id,
      expiresAt: quote?.expiresAt,
      quotes: quoteItems.map(item => ({
        ...item,
        plan: quote?.quoteItems.find((qi: any) => qi.planId === item.planId)?.plan,
      })),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Quote generation error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate quotes' },
      { status: 500 }
    );
  }
}

// Get quote by ID
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const quoteId = url.searchParams.get('id');

    if (!quoteId) {
      return NextResponse.json(
        { error: 'Quote ID is required' },
        { status: 400 }
      );
    }

    const quote = await prisma.quote.findUnique({
      where: {
        id: quoteId,
        customerId: session.user.id,
      },
      include: {
        quoteItems: {
          include: {
            plan: {
              include: {
                insurer: true,
                benefits: true,
              },
            },
          },
        },
      },
    });

    if (!quote) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve quote' },
      { status: 500 }
    );
  }
} 