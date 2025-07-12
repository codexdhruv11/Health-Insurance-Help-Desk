import { prisma } from '@/lib/prisma';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'plan' | 'hospital' | 'insurer';
  metadata?: Record<string, any>;
}

export async function globalSearch(query: string, limit = 10): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  // Search plans
  const plans = await prisma.productPlan.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      insurer: true,
    },
    take: Math.ceil(limit / 3),
  });

  plans.forEach(plan => {
    results.push({
      id: plan.id,
      title: plan.name,
      description: plan.description,
      type: 'plan',
      metadata: {
        insurer: plan.insurer.name,
        coverage: plan.coverageAmount,
        planType: plan.planType,
      },
    });
  });

  // Search hospitals
  const hospitals = await prisma.hospital.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { specialties: { hasSome: [query] } },
      ],
    },
    take: Math.ceil(limit / 3),
  });

  hospitals.forEach(hospital => {
    results.push({
      id: hospital.id,
      title: hospital.name,
      description: `Specialties: ${hospital.specialties.join(', ')}`,
      type: 'hospital',
      metadata: {
        address: hospital.address,
        rating: hospital.rating,
        emergencyServices: hospital.emergencyServices,
      },
    });
  });

  // Search insurers
  const insurers = await prisma.insurer.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    },
    take: Math.ceil(limit / 3),
  });

  insurers.forEach(insurer => {
    results.push({
      id: insurer.id,
      title: insurer.name,
      description: insurer.description,
      type: 'insurer',
      metadata: {
        rating: insurer.rating,
        establishedYear: insurer.establishedYear,
      },
    });
  });

  return results.slice(0, limit);
}

export async function searchPlans(
  query: string,
  filters: {
    planType?: string;
    minCoverage?: number;
    maxCoverage?: number;
    insurerId?: string;
  } = {},
  limit = 20
) {
  const where: any = {
    AND: [
      {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
    ],
  };

  if (filters.planType) {
    where.AND.push({ planType: filters.planType });
  }

  if (filters.minCoverage || filters.maxCoverage) {
    where.AND.push({
      coverageAmount: {
        gte: filters.minCoverage,
        lte: filters.maxCoverage,
      },
    });
  }

  if (filters.insurerId) {
    where.AND.push({ insurerId: filters.insurerId });
  }

  return await prisma.productPlan.findMany({
    where,
    include: {
      insurer: true,
      benefits: true,
      _count: {
        select: {
          networkHospitals: true,
          policies: true,
        },
      },
    },
    take: limit,
  });
}

interface GeoPoint {
  lat: number;
  lng: number;
}

interface SearchOptions {
  city?: string;
  state?: string;
  specialties?: string[];
  planId?: string;
  cashless?: boolean;
  search?: string;
  location?: GeoPoint;
  radius?: number; // in kilometers
  cursor?: string;
  limit?: number;
}

/**
 * Calculates the Haversine distance between two points on Earth
 * @param point1 First point with latitude and longitude
 * @param point2 Second point with latitude and longitude
 * @returns Distance in kilometers
 */
function calculateHaversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Converts degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Calculates bounding box coordinates for a given point and radius
 * @param center Center point
 * @param radius Radius in kilometers
 * @returns Bounding box coordinates
 */
function calculateBoundingBox(center: GeoPoint, radius: number) {
  const latRange = radius / 111; // Approximate km per degree latitude
  const lngRange = radius / (111 * Math.cos(center.lat * Math.PI / 180));
  
  return {
    minLat: center.lat - latRange,
    maxLat: center.lat + latRange,
    minLng: center.lng - lngRange,
    maxLng: center.lng + lngRange,
  };
}

/**
 * Searches for hospitals based on various criteria including location
 */
export async function searchHospitals(options: SearchOptions) {
  const {
    city,
    state,
    specialties,
    planId,
    cashless,
    search,
    location,
    radius = 10, // Default 10km radius
    cursor,
    limit = 10,
  } = options;

  // Build base query
  const where: any = {
    AND: [],
  };

  // Location-based filtering
  if (city) {
    where.AND.push({
      address: {
        path: ['city'],
        equals: city,
      },
    });
  }

  if (state) {
    where.AND.push({
      address: {
        path: ['state'],
        equals: state,
      },
    });
  }

  // Specialty filtering
  if (specialties?.length) {
    where.AND.push({
      specialties: {
        hasSome: specialties,
      },
    });
  }

  // Plan and cashless filtering
  if (planId) {
    where.AND.push({
      networkPlans: {
        some: {
          planId,
          ...(cashless !== undefined && { cashless }),
        },
      },
    });
  }

  // Text search
  if (search) {
    where.AND.push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        {
          specialties: {
            hasSome: [search],
          },
        },
      ],
    });
  }

  // Geospatial search
  if (location) {
    const bbox = calculateBoundingBox(location, radius);
    
    where.AND.push({
      AND: [
        {
          location: {
            path: ['lat'],
            gte: bbox.minLat,
          },
        },
        {
          location: {
            path: ['lat'],
            lte: bbox.maxLat,
          },
        },
        {
          location: {
            path: ['lng'],
            gte: bbox.minLng,
          },
        },
        {
          location: {
            path: ['lng'],
            lte: bbox.maxLng,
          },
        },
      ],
    });
  }

  // Fetch hospitals
  const hospitals = await prisma.hospital.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      networkPlans: {
        where: planId ? { planId } : undefined,
        include: {
          plan: {
            select: {
              id: true,
              name: true,
              insurer: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Post-process results for exact distance filtering
  let results = hospitals;
  if (location) {
    results = hospitals
      .map(hospital => ({
        ...hospital,
        distance: calculateHaversineDistance(location, {
          lat: (hospital.location as any).lat,
          lng: (hospital.location as any).lng,
        }),
      }))
      .filter(hospital => hospital.distance <= radius)
      .sort((a, b) => a.distance - b.distance);
  }

  // Handle pagination
  const hasMore = results.length > limit;
  const paginatedResults = hasMore ? results.slice(0, limit) : results;

  return {
    hospitals: paginatedResults.map(hospital => ({
      id: hospital.id,
      name: hospital.name,
      address: hospital.address,
      location: hospital.location,
      specialties: hospital.specialties,
      facilities: hospital.facilities,
      emergencyServices: hospital.emergencyServices,
      rating: hospital.rating,
      distance: 'distance' in hospital ? hospital.distance : undefined,
      networkPlans: hospital.networkPlans.map(np => ({
        planId: np.plan.id,
        planName: np.plan.name,
        insurerId: np.plan.insurer.id,
        insurerName: np.plan.insurer.name,
        cashless: np.cashless,
      })),
    })),
    pagination: {
      hasMore,
      nextCursor: hasMore ? paginatedResults[paginatedResults.length - 1].id : null,
    },
  };
}
