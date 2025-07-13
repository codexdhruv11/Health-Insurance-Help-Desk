import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UserRole, PolicyStatus } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'

// Rate limit configuration
const RATE_LIMIT = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
  prefix: 'policies:',
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as PolicyStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get customer ID
    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    })

    if (!customer) {
      return new NextResponse('Customer not found', { status: 404 })
    }

    // Build where clause
    const where = {
      customerId: customer.id,
      ...(status && Object.values(PolicyStatus).includes(status) ? { status } : {}),
    }

    // Get policies with pagination
    const [policies, total] = await Promise.all([
      prisma.policy.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          effectiveDate: 'desc',
        },
        include: {
          claims: {
            select: {
              id: true,
              status: true,
              totalAmount: true,
              approvedAmount: true,
            },
          },
          plan: {
            select: {
              name: true,
              planType: true,
              coverageAmount: true,
              insurer: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.policy.count({ where }),
    ])

    return NextResponse.json({
      policies,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Policies fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 