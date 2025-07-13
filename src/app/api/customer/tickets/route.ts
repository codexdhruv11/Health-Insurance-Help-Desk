import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { UserRole, TicketStatus, TicketPriority, SupportChannel } from '@prisma/client'
import { z } from 'zod'

const createTicketSchema = z.object({
  subject: z.string().min(1).max(255),
  description: z.string().min(1),
  priority: z.nativeEnum(TicketPriority),
  channel: z.nativeEnum(SupportChannel),
})

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
    const status = searchParams.get('status') as TicketStatus | null
    const priority = searchParams.get('priority') as TicketPriority | null
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
      ...(status && Object.values(TicketStatus).includes(status) ? { status } : {}),
      ...(priority && Object.values(TicketPriority).includes(priority) ? { priority } : {}),
    }

    // Get tickets with pagination
    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          {
            priority: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
        include: {
          assignedAgent: {
            select: {
              email: true,
              supportAgent: {
                select: {
                  firstName: true,
                  lastName: true,
                  department: true,
                },
              },
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
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
      prisma.supportTicket.count({ where }),
    ])

    return NextResponse.json({
      tickets,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    })
  } catch (error) {
    console.error('Tickets fetch error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (session.user.role !== UserRole.CUSTOMER) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const json = await request.json()
    const body = createTicketSchema.parse(json)

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

    // Create ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        customerId: customer.id,
        subject: body.subject,
        description: body.description,
        priority: body.priority,
        channel: body.channel,
        status: 'OPEN',
      },
      include: {
        assignedAgent: {
          select: {
            email: true,
            supportAgent: {
              select: {
                firstName: true,
                lastName: true,
                department: true,
              },
            },
          },
        },
      },
    })

    return NextResponse.json(ticket)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 })
    }

    console.error('Ticket creation error:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
} 