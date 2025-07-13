import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'profile:',
};

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (session.user.role !== UserRole.CUSTOMER) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Apply rate limiting
    const { success } = await rateLimit(session.user.id, RATE_LIMIT);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        policies: {
          select: {
            id: true,
            policyNumber: true,
            status: true,
            effectiveDate: true,
            expirationDate: true,
            premiumAmount: true,
            plan: {
              select: {
                planType: true,
                name: true,
              },
            },
          },
        },
        tickets: {
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS'],
            },
          },
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
        coinWallet: {
          select: {
            balance: true,
            totalEarned: true,
            totalSpent: true,
            lastUpdated: true,
          },
        },
      },
    })

    if (!customer) {
      return new NextResponse('Customer not found', { status: 404 })
    }

    // Remove sensitive data
    const { ssnEncrypted, ...safeCustomer } = customer

    return NextResponse.json(safeCustomer)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 