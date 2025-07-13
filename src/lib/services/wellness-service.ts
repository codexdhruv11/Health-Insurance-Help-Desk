import { prisma } from '../prisma'
import { CoinService } from '../coins'
import { WellnessActivityType } from '@prisma/client'
import { z } from 'zod'

// Types
export type HealthMetrics = {
  height: number // in cm
  weight: number // in kg
  bloodPressure?: {
    systolic: number
    diastolic: number
  }
  bloodSugar?: number // in mg/dL
  cholesterol?: {
    total: number
    hdl: number
    ldl: number
  }
}

export type WellnessActivity = {
  type: WellnessActivityType
  duration?: number // in minutes
  calories?: number
  details?: Record<string, any>
}

// Validation schemas
export const HealthMetricsSchema = z.object({
  height: z.number().positive(),
  weight: z.number().positive(),
  bloodPressure: z
    .object({
      systolic: z.number().int().min(70).max(200),
      diastolic: z.number().int().min(40).max(130),
    })
    .optional(),
  bloodSugar: z.number().positive().optional(),
  cholesterol: z
    .object({
      total: z.number().positive(),
      hdl: z.number().positive(),
      ldl: z.number().positive(),
    })
    .optional(),
})

export const WellnessActivitySchema = z.object({
  type: z.enum(['EXERCISE', 'HEALTH_CHECK', 'VACCINATION', 'MEDITATION', 'DIET_TRACKING']),
  duration: z.number().positive().optional(),
  calories: z.number().positive().optional(),
  details: z.record(z.any()).optional(),
})

// Constants
const ACTIVITY_COIN_REWARDS: Record<WellnessActivityType, number> = {
  EXERCISE: 50,
  HEALTH_CHECK: 100,
  VACCINATION: 200,
  MEDITATION: 30,
  DIET_TRACKING: 20,
}

class WellnessService {
  private coinService = CoinService.getInstance()

  // Track health metrics
  async trackHealthMetrics(userId: string, metrics: HealthMetrics): Promise<void> {
    // Validate metrics
    const validatedMetrics = HealthMetricsSchema.parse(metrics)

    // Calculate BMI
    const heightInMeters = validatedMetrics.height / 100
    const bmi = validatedMetrics.weight / (heightInMeters * heightInMeters)

    // Store metrics
    await prisma.healthMetrics.create({
      data: {
        userId,
        metrics: validatedMetrics as any,
        bmi,
      },
    })

    // Award coins for health tracking
    await this.coinService.earnCoins(userId, 'HEALTH_QUIZ', 50, {
      action: 'health_metrics_tracking',
    })
  }

  // Get health metrics history
  async getHealthMetricsHistory(
    userId: string,
    {
      startDate,
      endDate,
      page = 1,
      limit = 10,
    }: {
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    metrics: {
      id: string
      metrics: HealthMetrics
      bmi: number
      createdAt: Date
    }[]
    total: number
    page: number
    totalPages: number
  }> {
    const where = {
      userId,
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    }

    const [metrics, total] = await Promise.all([
      prisma.healthMetrics.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          metrics: true,
          bmi: true,
          createdAt: true,
        },
      }),
      prisma.healthMetrics.count({ where }),
    ])

    return {
      metrics: metrics.map((m: any) => ({
        ...m,
        metrics: m.metrics as HealthMetrics,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Get latest health metrics
  async getLatestHealthMetrics(userId: string): Promise<{
    metrics: HealthMetrics
    bmi: number
    createdAt: Date
  } | null> {
    const latest = await prisma.healthMetrics.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        metrics: true,
        bmi: true,
        createdAt: true,
      },
    })

    if (!latest) return null

    return {
      metrics: latest.metrics as HealthMetrics,
      bmi: latest.bmi,
      createdAt: latest.createdAt,
    }
  }

  // Track wellness activity
  async trackActivity(userId: string, activity: WellnessActivity): Promise<void> {
    // Validate activity
    const validatedActivity = WellnessActivitySchema.parse(activity)

    // Store activity
    await prisma.wellnessActivity.create({
      data: {
        userId,
        type: validatedActivity.type,
        duration: validatedActivity.duration,
        calories: validatedActivity.calories,
        details: validatedActivity.details as any,
      },
    })

    // Award coins based on activity type
    await this.coinService.earnCoins(userId, 'HEALTH_QUIZ', ACTIVITY_COIN_REWARDS[validatedActivity.type], {
      action: 'wellness_activity',
      activityType: validatedActivity.type,
    })
  }

  // Get wellness activity history
  async getActivityHistory(
    userId: string,
    {
      type,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    }: {
      type?: WellnessActivityType
      startDate?: Date
      endDate?: Date
      page?: number
      limit?: number
    } = {}
  ): Promise<{
    activities: {
      id: string
      type: WellnessActivityType
      duration?: number
      calories?: number
      details?: Record<string, any>
      createdAt: Date
    }[]
    total: number
    page: number
    totalPages: number
  }> {
    const where = {
      userId,
      ...(type && { type }),
      ...(startDate && { createdAt: { gte: startDate } }),
      ...(endDate && { createdAt: { lte: endDate } }),
    }

    const [activities, total] = await Promise.all([
      prisma.wellnessActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          type: true,
          duration: true,
          calories: true,
          details: true,
          createdAt: true,
        },
      }),
      prisma.wellnessActivity.count({ where }),
    ])

    return {
      activities: activities.map((a: any) => ({
        ...a,
        details: a.details as Record<string, any>,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Get activity statistics
  async getActivityStatistics(userId: string): Promise<{
    totalActivities: number
    activityTypeDistribution: Record<WellnessActivityType, number>
    totalDuration: number
    totalCalories: number
    streakDays: number
  }> {
    const activities = await prisma.wellnessActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        type: true,
        duration: true,
        calories: true,
        createdAt: true,
      },
    })

    const activityTypeDistribution = activities.reduce(
      (acc: Record<WellnessActivityType, number>, activity: { type: WellnessActivityType }) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1
        return acc
      },
      {} as Record<WellnessActivityType, number>
    )

    const totalDuration = activities.reduce((sum, activity) => sum + (activity.duration || 0), 0)
    const totalCalories = activities.reduce((sum, activity) => sum + (activity.calories || 0), 0)

    // Calculate streak
    let streakDays = 0
    let currentDate = new Date()
    currentDate.setHours(0, 0, 0, 0)

    for (let i = 0; i < activities.length; i++) {
      const activityDate = new Date(activities[i].createdAt)
      activityDate.setHours(0, 0, 0, 0)

      if (currentDate.getTime() - activityDate.getTime() === streakDays * 24 * 60 * 60 * 1000) {
        streakDays++
      } else {
        break
      }
    }

    return {
      totalActivities: activities.length,
      activityTypeDistribution,
      totalDuration,
      totalCalories,
      streakDays,
    }
  }

  // Get health risk assessment
  async getHealthRiskAssessment(userId: string): Promise<{
    bmiCategory: string
    bmiRisk: 'LOW' | 'MODERATE' | 'HIGH'
    bloodPressureCategory?: string
    bloodPressureRisk?: 'LOW' | 'MODERATE' | 'HIGH'
    recommendations: string[]
  }> {
    const latestMetrics = await this.getLatestHealthMetrics(userId)
    if (!latestMetrics) {
      throw new Error('No health metrics found')
    }

    // BMI Categories
    const bmiAssessment = this.assessBMI(latestMetrics.bmi)

    // Blood Pressure Assessment
    let bloodPressureAssessment
    if (latestMetrics.metrics.bloodPressure) {
      bloodPressureAssessment = this.assessBloodPressure(
        latestMetrics.metrics.bloodPressure.systolic,
        latestMetrics.metrics.bloodPressure.diastolic
      )
    }

    // Generate recommendations
    const recommendations = this.generateHealthRecommendations(
      bmiAssessment,
      bloodPressureAssessment
    )

    return {
      ...bmiAssessment,
      ...(bloodPressureAssessment && {
        bloodPressureCategory: bloodPressureAssessment.category,
        bloodPressureRisk: bloodPressureAssessment.risk,
      }),
      recommendations,
    }
  }

  // Private helper methods
  private assessBMI(bmi: number): {
    bmiCategory: string
    bmiRisk: 'LOW' | 'MODERATE' | 'HIGH'
  } {
    if (bmi < 18.5) {
      return { bmiCategory: 'Underweight', bmiRisk: 'MODERATE' }
    } else if (bmi < 25) {
      return { bmiCategory: 'Normal', bmiRisk: 'LOW' }
    } else if (bmi < 30) {
      return { bmiCategory: 'Overweight', bmiRisk: 'MODERATE' }
    } else {
      return { bmiCategory: 'Obese', bmiRisk: 'HIGH' }
    }
  }

  private assessBloodPressure(
    systolic: number,
    diastolic: number
  ): {
    category: string
    risk: 'LOW' | 'MODERATE' | 'HIGH'
  } {
    if (systolic < 120 && diastolic < 80) {
      return { category: 'Normal', risk: 'LOW' }
    } else if (systolic < 130 && diastolic < 80) {
      return { category: 'Elevated', risk: 'MODERATE' }
    } else {
      return { category: 'High', risk: 'HIGH' }
    }
  }

  private generateHealthRecommendations(
    bmiAssessment: { bmiCategory: string; bmiRisk: 'LOW' | 'MODERATE' | 'HIGH' },
    bloodPressureAssessment?: { category: string; risk: 'LOW' | 'MODERATE' | 'HIGH' }
  ): string[] {
    const recommendations: string[] = []

    // BMI recommendations
    if (bmiAssessment.bmiRisk === 'HIGH') {
      recommendations.push(
        'Consider consulting a healthcare provider about weight management',
        'Focus on balanced nutrition and regular exercise',
        'Aim for 150 minutes of moderate exercise per week'
      )
    } else if (bmiAssessment.bmiRisk === 'MODERATE') {
      if (bmiAssessment.bmiCategory === 'Underweight') {
        recommendations.push(
          'Consider increasing caloric intake with nutrient-rich foods',
          'Consult a nutritionist for personalized advice',
          'Include strength training in your exercise routine'
        )
      } else {
        recommendations.push(
          'Maintain a balanced diet with portion control',
          'Include regular physical activity in your routine',
          'Track your food intake and exercise'
        )
      }
    }

    // Blood pressure recommendations
    if (bloodPressureAssessment?.risk === 'HIGH') {
      recommendations.push(
        'Consult a healthcare provider about blood pressure management',
        'Reduce sodium intake',
        'Practice stress management techniques',
        'Monitor blood pressure regularly'
      )
    } else if (bloodPressureAssessment?.risk === 'MODERATE') {
      recommendations.push(
        'Monitor blood pressure regularly',
        'Maintain a heart-healthy diet',
        'Consider stress reduction techniques'
      )
    }

    // General recommendations
    recommendations.push(
      'Stay hydrated by drinking adequate water',
      'Get 7-9 hours of quality sleep',
      'Practice regular stress management'
    )

    return recommendations
  }
}

export const wellnessService = new WellnessService() 