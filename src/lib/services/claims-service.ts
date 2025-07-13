import { prisma } from '../prisma'
import { CoinService } from '../coins'
import { Claim, ClaimStatus, ClaimType, Document } from '@prisma/client'
import { z } from 'zod'

// Types
export type ClaimWithDetails = Claim & {
  documents: Document[]
  policy: {
    id: string
    policyNumber: string
    productPlan: {
      name: string
      insurer: {
        name: string
      }
    }
  }
}

export type ClaimInput = {
  policyId: string
  type: ClaimType
  hospitalId?: string
  admissionDate?: Date
  dischargeDate?: Date
  diagnosis: string
  treatmentDetails: string
  claimAmount: number
  documents: {
    type: string
    url: string
    name: string
  }[]
}

// Validation schemas
export const ClaimInputSchema = z.object({
  policyId: z.string(),
  type: z.enum(['CASHLESS', 'REIMBURSEMENT', 'EMERGENCY']),
  hospitalId: z.string().optional(),
  admissionDate: z.date().optional(),
  dischargeDate: z.date().optional(),
  diagnosis: z.string(),
  treatmentDetails: z.string(),
  claimAmount: z.number().positive(),
  documents: z.array(
    z.object({
      type: z.string(),
      url: z.string().url(),
      name: z.string(),
    })
  ),
})

// Constants
const CLAIM_SUBMISSION_COINS = 100
const DOCUMENT_UPLOAD_COINS = 50

class ClaimService {
  private coinService = CoinService.getInstance()

  // Submit a new claim
  async submitClaim(userId: string, input: ClaimInput): Promise<ClaimWithDetails> {
    // Validate input
    const validatedInput = ClaimInputSchema.parse(input)

    // Check if policy exists and belongs to user
    const policy = await prisma.policy.findFirst({
      where: {
        id: validatedInput.policyId,
        userId,
      },
      include: {
        productPlan: {
          include: {
            insurer: true,
          },
        },
      },
    })

    if (!policy) {
      throw new Error('Policy not found or unauthorized')
    }

    // Start a transaction for claim creation and coin rewards
    const result = await prisma.$transaction(async (tx) => {
      // Create claim
      const claim = await tx.claim.create({
        data: {
          type: validatedInput.type,
          status: ClaimStatus.SUBMITTED,
          hospitalId: validatedInput.hospitalId,
          admissionDate: validatedInput.admissionDate,
          dischargeDate: validatedInput.dischargeDate,
          diagnosis: validatedInput.diagnosis,
          treatmentDetails: validatedInput.treatmentDetails,
          claimAmount: validatedInput.claimAmount,
          policy: { connect: { id: policy.id } },
          documents: {
            create: validatedInput.documents.map((doc) => ({
              type: doc.type,
              url: doc.url,
              name: doc.name,
            })),
          },
        },
        include: {
          documents: true,
          policy: {
            include: {
              productPlan: {
                include: {
                  insurer: true,
                },
              },
            },
          },
        },
      })

      // Award coins for claim submission
      await this.coinService.earnCoins(userId, 'DOCUMENT_UPLOAD', CLAIM_SUBMISSION_COINS, {
        claimId: claim.id,
        action: 'claim_submission',
      })

      // Award coins for each document
      for (const doc of validatedInput.documents) {
        await this.coinService.earnCoins(userId, 'DOCUMENT_UPLOAD', DOCUMENT_UPLOAD_COINS, {
          claimId: claim.id,
          documentName: doc.name,
          action: 'document_upload',
        })
      }

      return claim
    })

    return result
  }

  // Get claims for a user with filtering and pagination
  async getClaims(
    userId: string,
    {
      status,
      type,
      policyId,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    }: {
      status?: ClaimStatus
      type?: ClaimType
      policyId?: string
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    claims: ClaimWithDetails[]
    total: number
    page: number
    totalPages: number
  }> {
    const where = {
      policy: {
        userId,
        ...(policyId && { id: policyId }),
      },
      ...(status && { status }),
      ...(type && { type }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    }

    const [claims, total] = await Promise.all([
      prisma.claim.findMany({
        where,
        include: {
          documents: true,
          policy: {
            include: {
              productPlan: {
                include: {
                  insurer: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.claim.count({ where }),
    ])

    return {
      claims,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Get a single claim by ID
  async getClaimById(userId: string, claimId: string): Promise<ClaimWithDetails | null> {
    return prisma.claim.findFirst({
      where: {
        id: claimId,
        policy: {
          userId,
        },
      },
      include: {
        documents: true,
        policy: {
          include: {
            productPlan: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
    })
  }

  // Update claim status (admin only)
  async updateClaimStatus(
    claimId: string,
    status: ClaimStatus,
    adminUserId: string,
    notes?: string
  ): Promise<ClaimWithDetails> {
    // Verify admin permissions (implement your own admin check logic)
    const isAdmin = await this.verifyAdminPermissions(adminUserId)
    if (!isAdmin) {
      throw new Error('Unauthorized')
    }

    return prisma.claim.update({
      where: { id: claimId },
      data: {
        status,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: adminUserId,
        notes,
      },
      include: {
        documents: true,
        policy: {
          include: {
            productPlan: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
    })
  }

  // Add documents to an existing claim
  async addClaimDocuments(
    userId: string,
    claimId: string,
    documents: { type: string; url: string; name: string }[]
  ): Promise<ClaimWithDetails> {
    // Verify claim ownership
    const claim = await this.getClaimById(userId, claimId)
    if (!claim) {
      throw new Error('Claim not found or unauthorized')
    }

    // Add documents and award coins
    const result = await prisma.$transaction(async (tx) => {
      const updatedClaim = await tx.claim.update({
        where: { id: claimId },
        data: {
          documents: {
            create: documents.map((doc) => ({
              type: doc.type,
              url: doc.url,
              name: doc.name,
            })),
          },
        },
        include: {
          documents: true,
          policy: {
            include: {
              productPlan: {
                include: {
                  insurer: true,
                },
              },
            },
          },
        },
      })

      // Award coins for each document
      for (const doc of documents) {
        await this.coinService.earnCoins(userId, 'DOCUMENT_UPLOAD', DOCUMENT_UPLOAD_COINS, {
          claimId,
          documentName: doc.name,
          action: 'document_upload',
        })
      }

      return updatedClaim
    })

    return result
  }

  // Get claim statistics for a user
  async getClaimStatistics(userId: string): Promise<{
    totalClaims: number
    approvedClaims: number
    pendingClaims: number
    totalClaimAmount: number
    approvedClaimAmount: number
  }> {
    const claims = await prisma.claim.findMany({
      where: {
        policy: {
          userId,
        },
      },
      select: {
        status: true,
        claimAmount: true,
      },
    })

    return {
      totalClaims: claims.length,
      approvedClaims: claims.filter((c) => c.status === ClaimStatus.APPROVED).length,
      pendingClaims: claims.filter((c) => c.status === ClaimStatus.SUBMITTED || c.status === ClaimStatus.IN_REVIEW).length,
      totalClaimAmount: claims.reduce((sum, c) => sum + c.claimAmount, 0),
      approvedClaimAmount: claims
        .filter((c) => c.status === ClaimStatus.APPROVED)
        .reduce((sum, c) => sum + c.claimAmount, 0),
    }
  }

  // Private helper methods
  private async verifyAdminPermissions(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })
    return user?.role === 'ADMIN'
  }
}

export const claimService = new ClaimService() 