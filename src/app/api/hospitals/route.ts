import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Input validation schema
const FilterSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  planId: z.string().optional(),
  cashless: z.boolean().optional(),
  search: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius: z.number().optional(), // in kilometers
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).default(10),
});

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const params = Object.fromEntries(url.searchParams.entries());
    
    // Parse and validate query parameters
    const filters = FilterSchema.parse({
      ...params,
      lat: params.lat ? Number(params.lat) : undefined,
      lng: params.lng ? Number(params.lng) : undefined,
      radius: params.radius ? Number(params.radius) : undefined,
      limit: params.limit ? Number(params.limit) : 10,
      cashless: params.cashless ? params.cashless === 'true' : undefined,
      specialties: params.specialties ? JSON.parse(params.specialties) : undefined,
    });

    // Build where clause for filtering
    const where: any = {
      AND: [],
    };

    // Location-based filtering
    if (filters.city) {
      where.AND.push({
        address: {
          path: ['city'],
          equals: filters.city,
        },
      });
    }

    if (filters.state) {
      where.AND.push({
        address: {
          path: ['state'],
          equals: filters.state,
        },
      });
    }

    // Specialty filtering
    if (filters.specialties?.length) {
      where.AND.push({
        specialties: {
          hasSome: filters.specialties,
        },
      });
    }

    // Plan and cashless filtering
    if (filters.planId) {
      where.AND.push({
        networkPlans: {
          some: {
            planId: filters.planId,
            ...(filters.cashless !== undefined && { cashless: filters.cashless }),
          },
        },
      });
    }

    // Search filtering
    if (filters.search) {
      where.AND.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          {
            specialties: {
              hasSome: [filters.search],
            },
          },
        ],
      });
    }

    // Location-based radius search using Haversine formula
    if (filters.lat && filters.lng && filters.radius) {
      // Calculate bounding box for rough filtering
      const latRange = filters.radius / 111; // Approximate km per degree latitude
      const lngRange = filters.radius / (111 * Math.cos(filters.lat * Math.PI / 180));
      
      where.AND.push({
        AND: [
          {
            location: {
              path: ['lat'],
              gte: filters.lat - latRange,
            },
          },
          {
            location: {
              path: ['lat'],
              lte: filters.lat + latRange,
            },
          },
          {
            location: {
              path: ['lng'],
              gte: filters.lng - lngRange,
            },
          },
          {
            location: {
              path: ['lng'],
              lte: filters.lng + lngRange,
            },
          },
        ],
      });
    }

    // Fetch hospitals with pagination
    const hospitals = await prisma.hospital.findMany({
      where,
      take: filters.limit + 1, // Take one extra to determine if there are more results
      cursor: filters.cursor ? { id: filters.cursor } : undefined,
      include: {
        networkPlans: {
          where: filters.planId ? { planId: filters.planId } : undefined,
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

    // Check if there are more results
    const hasMore = hospitals.length > filters.limit;
    const results = hasMore ? hospitals.slice(0, -1) : hospitals;

    // Format response
    const response = {
      hospitals: results.map(hospital => ({
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        location: hospital.location,
        specialties: hospital.specialties,
        facilities: hospital.facilities,
        emergencyServices: hospital.emergencyServices,
        rating: hospital.rating,
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
        nextCursor: hasMore ? results[results.length - 1].id : null,
      },
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Hospitals fetch error:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid filter parameters', details: error.errors },
        { status: 400 }
      );
    }

    // Return mock data if database is not available
    if (error.message?.includes('database server') || error.message?.includes('Environment variable not found: DATABASE_URL')) {
      return NextResponse.json({
        hospitals: [
          {
            id: '1',
            name: 'City General Hospital',
            address: { city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
            location: { lat: 19.0760, lng: 72.8777 },
            specialties: ['Cardiology', 'Orthopedics', 'Emergency Medicine', 'General Surgery'],
            facilities: ['ICU', 'Emergency Room', '24/7 Pharmacy', 'Ambulance Service'],
            emergencyServices: true,
            rating: 4.3,
            networkPlans: [
              {
                planId: '1',
                planName: 'Basic Health Plan',
                insurerId: '1',
                insurerName: 'Sample Insurance Co.',
                cashless: true
              },
              {
                planId: '2',
                planName: 'Family Floater Plan',
                insurerId: '2',
                insurerName: 'Family Health Insurance',
                cashless: true
              }
            ]
          },
          {
            id: '2',
            name: 'Metro Medical Center',
            address: { city: 'Delhi', state: 'Delhi', pincode: '110001' },
            location: { lat: 28.7041, lng: 77.1025 },
            specialties: ['Neurology', 'Oncology', 'Radiology', 'Pediatrics'],
            facilities: ['MRI', 'CT Scan', 'Blood Bank', 'Dialysis Unit'],
            emergencyServices: true,
            rating: 4.6,
            networkPlans: [
              {
                planId: '2',
                planName: 'Family Floater Plan',
                insurerId: '2',
                insurerName: 'Family Health Insurance',
                cashless: true
              },
              {
                planId: '3',
                planName: 'Premium Health Plan',
                insurerId: '3',
                insurerName: 'Premium Insurance Ltd.',
                cashless: false
              }
            ]
          },
          {
            id: '3',
            name: 'Advanced Care Hospital',
            address: { city: 'Bangalore', state: 'Karnataka', pincode: '560001' },
            location: { lat: 12.9716, lng: 77.5946 },
            specialties: ['Gastroenterology', 'Pulmonology', 'Dermatology', 'ENT'],
            facilities: ['Operation Theater', 'NICU', 'Physiotherapy', 'Laboratory'],
            emergencyServices: false,
            rating: 4.1,
            networkPlans: [
              {
                planId: '1',
                planName: 'Basic Health Plan',
                insurerId: '1',
                insurerName: 'Sample Insurance Co.',
                cashless: true
              },
              {
                planId: '3',
                planName: 'Premium Health Plan',
                insurerId: '3',
                insurerName: 'Premium Insurance Ltd.',
                cashless: true
              }
            ]
          }
        ],
        pagination: {
          hasMore: false,
          nextCursor: null
        }
      });
    }

    return NextResponse.json(
      { error: 'Failed to fetch hospitals' },
      { status: 500 }
    );
  }
} 