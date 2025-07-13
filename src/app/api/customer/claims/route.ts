import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UserRole, ClaimStatus } from '@prisma/client'

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ClaimStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Get customer's policies
    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
      select: {
        id: true,
        policies: {
          select: {
            id: true,
          },
        },
      },
    })

    if (!customer) {
      return new NextResponse('Customer not found', { status: 404 })
    }

    type PolicyWithId = {
      id: string
    }

    const policyIds = customer.policies.map((policy: PolicyWithId) => policy.id)

    // Build where clause
    const where = {
      policyId: {
        in: policyIds,
      },
      ...(status && Object.values(ClaimStatus).includes(status) ? { status } : {}),
    }

    // Get claims with pagination
    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          submittedDate: 'desc',
        },
        include: {
          policy: {
            select: {
              policyNumber: true,
              plan: {
                select: {
                  planType: true,
                  name: true,
                },
              },
            },
          },
          documents: {
            select: {
              id: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.claim.count({ where }),
    ])

    return NextResponse.json({
      claims,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Claims fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 