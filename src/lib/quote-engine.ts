import { prisma } from './prisma'
import { z } from 'zod'
import { Plan, PlanBenefit, Insurer } from '@prisma/client'

// City tier data
const CITY_TIERS = {
  TIER_1: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad'],
  TIER_2: ['Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'],
  TIER_3: ['default'], // All other cities
}

// Risk scores for medical conditions
const MEDICAL_CONDITION_RISKS = {
  diabetes: 1.3,
  hypertension: 1.2,
  heartDisease: 1.5,
  asthma: 1.15,
  cancer: 2.0,
  none: 1.0,
}

// Age-based risk factors
const getAgeRiskFactor = (age: number): number => {
  if (age <= 25) return 1.0
  if (age <= 35) return 1.1
  if (age <= 45) return 1.2
  if (age <= 55) return 1.3
  if (age <= 65) return 1.5
  return 1.8
}

// City tier multiplier
const getCityTierMultiplier = (city: string): number => {
  const normalizedCity = city.toLowerCase()
  if (CITY_TIERS.TIER_1.some(c => c.toLowerCase() === normalizedCity)) return 1.2
  if (CITY_TIERS.TIER_2.some(c => c.toLowerCase() === normalizedCity)) return 1.1
  return 1.0 // TIER_3
}

// Family size discount
const getFamilySizeDiscount = (familySize: number): number => {
  if (familySize >= 4) return 0.15
  if (familySize >= 2) return 0.10
  return 0
}

interface QuoteInput {
  age: number
  gender: 'MALE' | 'FEMALE' | 'OTHER'
  city: string
  hasMedicalConditions: boolean
  medicalConditions?: string[]
  familySize: number
  coverageAmount: number
}

interface QuoteResult {
  basePremium: number
  riskFactor: number
  cityMultiplier: number
  familyDiscount: number
  finalPremium: number
  coverageAmount: number
  recommendedPlans: Array<{
    planId: string
    planName: string
    insurerName: string
    premium: number
    features: string[]
  }>
}

type PlanWithRelations = Plan & {
  insurer: Insurer
  benefits: PlanBenefit[]
}

export async function calculateQuote(input: QuoteInput): Promise<QuoteResult> {
  try {
    // Calculate base premium (1% of coverage amount)
    const basePremium = input.coverageAmount * 0.01

    // Calculate risk factors
    const ageRisk = getAgeRiskFactor(input.age)
    const cityMultiplier = getCityTierMultiplier(input.city)
    
    // Calculate medical condition risk
    let medicalRisk = 1.0
    if (input.hasMedicalConditions && input.medicalConditions) {
      medicalRisk = input.medicalConditions.reduce((risk, condition) => {
        return risk * (MEDICAL_CONDITION_RISKS[condition as keyof typeof MEDICAL_CONDITION_RISKS] || 1.0)
      }, 1.0)
    }

    // Combined risk factor
    const riskFactor = ageRisk * medicalRisk

    // Calculate discounts
    const familyDiscount = getFamilySizeDiscount(input.familySize)

    // Calculate final premium
    const finalPremium = Math.round(
      basePremium * riskFactor * cityMultiplier * (1 - familyDiscount)
    )

    // Get recommended plans
    const plans = await prisma.plan.findMany({
      where: {
        minCoverageAmount: { lte: input.coverageAmount },
        maxCoverageAmount: { gte: input.coverageAmount },
        status: 'ACTIVE',
      },
      include: {
        insurer: true,
        benefits: true,
      },
      take: 3,
    }) as PlanWithRelations[]

    const recommendedPlans = plans.map(plan => ({
      planId: plan.id,
      planName: plan.name,
      insurerName: plan.insurer.name,
      premium: Math.round(finalPremium * (plan.premiumMultiplier || 1)),
      features: plan.benefits.map(b => b.name),
    }))

    return {
      basePremium,
      riskFactor,
      cityMultiplier,
      familyDiscount,
      finalPremium,
      coverageAmount: input.coverageAmount,
      recommendedPlans,
    }
  } catch (error) {
    console.error('Error calculating quote:', error)
    throw new Error('Failed to calculate insurance quote')
  }
}

// Export the schema for validation
export const QuoteInputSchema = z.object({
  age: z.number().min(0).max(120),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  city: z.string().min(1),
  hasMedicalConditions: z.boolean(),
  medicalConditions: z.array(z.string()).optional(),
  familySize: z.number().min(1).max(10),
  coverageAmount: z.number().min(100000),
})