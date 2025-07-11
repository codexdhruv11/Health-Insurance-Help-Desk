import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

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

    const customer = await prisma.customer.findUnique({
      where: {
        userId: session.user.id,
      },
      include: {
        policies: {
          select: {
            id: true,
            policyNumber: true,
            planType: true,
            status: true,
            effectiveDate: true,
            expirationDate: true,
            premiumAmount: true,
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