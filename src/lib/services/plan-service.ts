import { prisma } from '../prisma'
import { calculateQuote, QuoteInput, QuoteInputSchema } from '../quote-engine'
import { ProductPlan, PlanBenefit, Insurer, PlanType, WaitingPeriod } from '@prisma/client'
import { z } from 'zod'

// Types
export type PlanWithDetails = ProductPlan & {
  insurer: Insurer
  benefits: PlanBenefit[]
  waitingPeriods: WaitingPeriod[]
}

export type PlanFilterOptions = {
  coverageMin?: number
  coverageMax?: number
  premiumMin?: number
  premiumMax?: number
  insurerId?: string
  planType?: PlanType
  features?: string[]
  sortBy?: 'premium' | 'coverage' | 'popularity'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export const PlanFilterSchema = z.object({
  coverageMin: z.number().optional(),
  coverageMax: z.number().optional(),
  premiumMin: z.number().optional(),
  premiumMax: z.number().optional(),
  insurerId: z.string().optional(),
  planType: z.enum(['INDIVIDUAL', 'FAMILY', 'SENIOR', 'GROUP']).optional(),
  features: z.array(z.string()).optional(),
  sortBy: z.enum(['premium', 'coverage', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
})

class PlanService {
  // Get plans with filtering and pagination
  async getPlans(filters: PlanFilterOptions = {}): Promise<{
    plans: PlanWithDetails[]
    total: number
    page: number
    totalPages: number
  }> {
    const {
      coverageMin,
      coverageMax,
      premiumMin,
      premiumMax,
      insurerId,
      planType,
      features,
      sortBy = 'premium',
      sortOrder = 'asc',
      page = 1,
      limit = 10,
    } = filters

    const where: any = {
      ...(coverageMin && { coverageAmount: { gte: coverageMin } }),
      ...(coverageMax && { coverageAmount: { lte: coverageMax } }),
      ...(premiumMin && { basePremium: { gte: premiumMin } }),
      ...(premiumMax && { basePremium: { lte: premiumMax } }),
      ...(insurerId && { insurerId }),
      ...(planType && { type: planType }),
      ...(features?.length && {
        benefits: {
          some: {
            name: { in: features },
          },
        },
      }),
    }

    const [plans, total] = await Promise.all([
      prisma.productPlan.findMany({
        where,
        include: {
          insurer: true,
          benefits: true,
          waitingPeriods: true,
        },
        orderBy: {
          [sortBy === 'popularity' ? 'purchaseCount' : sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.productPlan.count({ where }),
    ])

    return {
      plans,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Get detailed plan information
  async getPlanById(planId: string): Promise<PlanWithDetails | null> {
    return prisma.productPlan.findUnique({
      where: { id: planId },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
    })
  }

  // Compare multiple plans
  async comparePlans(planIds: string[]): Promise<PlanWithDetails[]> {
    return prisma.productPlan.findMany({
      where: {
        id: { in: planIds },
      },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
    })
  }

  // Calculate premium for a specific plan
  async calculatePlanPremium(planId: string, quoteInput: QuoteInput): Promise<{
    plan: PlanWithDetails
    premium: number
    breakdown: {
      basePremium: number
      riskFactor: number
      cityMultiplier: number
      familyDiscount: number
      finalPremium: number
    }
  }> {
    // Validate quote input
    const validatedInput = QuoteInputSchema.parse(quoteInput)

    // Get plan details
    const plan = await this.getPlanById(planId)
    if (!plan) {
      throw new Error('Plan not found')
    }

    // Calculate quote using existing engine
    const quote = await calculateQuote({
      ...validatedInput,
      coverageAmount: plan.coverageAmount,
    })

    return {
      plan,
      premium: quote.finalPremium,
      breakdown: {
        basePremium: quote.basePremium,
        riskFactor: quote.riskFactor,
        cityMultiplier: quote.cityMultiplier,
        familyDiscount: quote.familyDiscount,
        finalPremium: quote.finalPremium,
      },
    }
  }

  // Get recommended plans based on user profile
  async getRecommendedPlans(quoteInput: QuoteInput): Promise<{
    plans: PlanWithDetails[]
    premiums: Record<string, number>
  }> {
    // Validate quote input
    const validatedInput = QuoteInputSchema.parse(quoteInput)

    // Calculate quote for coverage amount
    const quote = await calculateQuote(validatedInput)

    // Get plans around the target premium
    const targetPremium = quote.finalPremium
    const plans = await prisma.productPlan.findMany({
      where: {
        basePremium: {
          gte: targetPremium * 0.8,
          lte: targetPremium * 1.2,
        },
      },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
      orderBy: {
        purchaseCount: 'desc',
      },
      take: 5,
    })

    // Calculate actual premiums for each plan
    const premiums: Record<string, number> = {}
    for (const plan of plans) {
      const planQuote = await this.calculatePlanPremium(plan.id, validatedInput)
      premiums[plan.id] = planQuote.premium
    }

    return {
      plans,
      premiums,
    }
  }

  // Search plans by keyword
  async searchPlans(query: string): Promise<PlanWithDetails[]> {
    return prisma.productPlan.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          {
            benefits: {
              some: {
                name: { contains: query, mode: 'insensitive' },
              },
            },
          },
        ],
      },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
    })
  }

  // Get popular plans
  async getPopularPlans(limit = 5): Promise<PlanWithDetails[]> {
    return prisma.productPlan.findMany({
      orderBy: {
        purchaseCount: 'desc',
      },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
      take: limit,
    })
  }

  // Get plans by insurer
  async getPlansByInsurer(insurerId: string): Promise<PlanWithDetails[]> {
    return prisma.productPlan.findMany({
      where: {
        insurerId,
      },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
    })
  }

  // Get plans by type
  async getPlansByType(planType: PlanType): Promise<PlanWithDetails[]> {
    return prisma.productPlan.findMany({
      where: {
        type: planType,
      },
      include: {
        insurer: true,
        benefits: true,
        waitingPeriods: true,
      },
    })
  }
}

export const planService = new PlanService() 