import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { rateLimit } from '@/lib/rate-limit'
import { calculateQuote } from '@/lib/quote-engine'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Quote request schema
const quoteSchema = z.object({
  age: z.number().min(0).max(120),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  city: z.string().min(1),
  hasMedicalConditions: z.boolean(),
  medicalConditions: z.array(z.string()).optional(),
  familySize: z.number().min(1).max(10),
  coverageAmount: z.number().min(100000),
})

export async function POST(request: NextRequest) {
  try {
    // Rate limiting based on IP for anonymous users, user ID for authenticated
    const session = await getServerSession()
    const identifier = session?.user?.id || request.ip || 'anonymous'
    const { success } = await rateLimit(identifier)
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = quoteSchema.parse(body)

    // Calculate quote using the quote engine
    const quote = await calculateQuote(validatedData)

    // For authenticated users, store the quote in the database
    if (session?.user) {
      await prisma.quote.create({
        data: {
          ...quote,
          userId: session.user.id,
          status: 'PENDING',
          quoteData: validatedData,
        },
      })
    }

    return NextResponse.json(quote)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Quote generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession()

  // Only authenticated users can view their quotes
  if (!session?.user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  try {
    const quotes = await prisma.quote.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(quotes)
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    )
  }
} 