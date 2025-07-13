import { prisma } from '../prisma'
import { Hospital } from '@prisma/client'
import { z } from 'zod'

// Types
export type HospitalWithDetails = Hospital & {
  networkPlans: {
    plan: {
      id: string
      name: string
      insurer: {
        id: string
        name: string
      }
    }
    cashless: boolean
  }[]
}

export type HospitalSearchOptions = {
  query?: string
  latitude?: number
  longitude?: number
  radius?: number // in kilometers
  specialties?: string[]
  insurerId?: string
  page?: number
  limit?: number
}

// Validation schemas
export const HospitalSearchSchema = z.object({
  query: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().positive().optional(),
  specialties: z.array(z.string()).optional(),
  insurerId: z.string().optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(50).optional(),
})

class HospitalService {
  // Search hospitals with filtering and geolocation
  async searchHospitals(options: HospitalSearchOptions = {}): Promise<{
    hospitals: HospitalWithDetails[]
    total: number
    page: number
    totalPages: number
  }> {
    const {
      query,
      specialties,
      insurerId,
      page = 1,
      limit = 10,
    } = HospitalSearchSchema.parse(options)

    let where: any = {}

    // Text search
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { address: { path: ['street'], contains: query, mode: 'insensitive' } },
        { address: { path: ['city'], contains: query, mode: 'insensitive' } },
      ]
    }

    // Specialty filter
    if (specialties?.length) {
      where.specialties = {
        hasSome: specialties,
      }
    }

    // Insurer filter
    if (insurerId) {
      where.networkPlans = {
        some: {
          plan: {
            insurerId,
          },
        },
      }
    }

    const [hospitals, total] = await Promise.all([
      prisma.hospital.findMany({
        where,
        include: {
          networkPlans: {
            include: {
              plan: {
                include: {
                  insurer: true,
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.hospital.count({ where }),
    ])

    return {
      hospitals,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    }
  }

  // Get detailed hospital information
  async getHospitalById(hospitalId: string): Promise<HospitalWithDetails | null> {
    return prisma.hospital.findUnique({
      where: { id: hospitalId },
      include: {
        networkPlans: {
          include: {
            plan: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
    })
  }

  // Check if hospital is in network for a specific policy
  async checkNetworkStatus(
    hospitalId: string,
    policyId: string
  ): Promise<{
    isInNetwork: boolean
    cashless: boolean
  }> {
    const [hospital, policy] = await Promise.all([
      prisma.hospital.findUnique({
        where: { id: hospitalId },
        include: {
          networkPlans: {
            include: {
              plan: true,
            },
          },
        },
      }),
      prisma.policy.findUnique({
        where: { id: policyId },
        include: {
          plan: true,
        },
      }),
    ])

    if (!hospital || !policy) {
      throw new Error('Hospital or policy not found')
    }

    const networkPlan = hospital.networkPlans.find(
      (np) => np.plan.id === policy.planId
    )

    return {
      isInNetwork: !!networkPlan,
      cashless: networkPlan?.cashless ?? false,
    }
  }

  // Get nearby hospitals
  // Note: This is a simplified version without actual geolocation
  // Would need PostGIS for proper implementation
  async getNearbyHospitals(
    _latitude: number,
    _longitude: number,
    _radius: number = 5, // Default 5km radius
    limit: number = 10
  ): Promise<HospitalWithDetails[]> {
    // For now, just return hospitals sorted by name
    return prisma.hospital.findMany({
      include: {
        networkPlans: {
          include: {
            plan: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      take: limit,
    })
  }

  // Get hospitals by specialty
  async getHospitalsBySpecialty(specialty: string): Promise<HospitalWithDetails[]> {
    return prisma.hospital.findMany({
      where: {
        specialties: {
          has: specialty,
        },
      },
      include: {
        networkPlans: {
          include: {
            plan: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
    })
  }

  // Get hospitals by insurer
  async getHospitalsByInsurer(insurerId: string): Promise<HospitalWithDetails[]> {
    return prisma.hospital.findMany({
      where: {
        networkPlans: {
          some: {
            plan: {
              insurerId,
            },
          },
        },
      },
      include: {
        networkPlans: {
          include: {
            plan: {
              include: {
                insurer: true,
              },
            },
          },
        },
      },
    })
  }

  // Get hospital statistics
  async getHospitalStatistics(): Promise<{
    totalHospitals: number
    networkHospitals: number
    specialtyDistribution: Record<string, number>
    cityDistribution: Record<string, number>
  }> {
    const hospitals = await prisma.hospital.findMany({
      select: {
        address: true,
        specialties: true,
        networkPlans: {
          select: {
            id: true,
          },
        },
      },
    })

    const cityDistribution: Record<string, number> = {}
    const specialtyDistribution: Record<string, number> = {}

    hospitals.forEach((hospital) => {
      // Count cities
      const address = hospital.address as any
      const city = address.city
      if (city) {
        cityDistribution[city] = (cityDistribution[city] || 0) + 1
      }

      // Count specialties
      hospital.specialties.forEach((specialty) => {
        specialtyDistribution[specialty] = (specialtyDistribution[specialty] || 0) + 1
      })
    })

    return {
      totalHospitals: hospitals.length,
      networkHospitals: hospitals.filter((h) => h.networkPlans.length > 0).length,
      specialtyDistribution,
      cityDistribution,
    }
  }
}

export const hospitalService = new HospitalService() 