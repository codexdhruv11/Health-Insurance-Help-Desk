import { PrismaClient, UserRole, PlanType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Create admin user
    const adminPassword = await hash('admin123', 12)
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        passwordHash: adminPassword,
        role: UserRole.ADMIN,
      },
    })

    // Create test users for each role
    const userPassword = await hash('user123', 12)
    const roles = [UserRole.CUSTOMER, UserRole.AGENT, UserRole.MANAGER]
    
    for (const role of roles) {
      await prisma.user.upsert({
        where: { email: `${role.toLowerCase()}@example.com` },
        update: {},
        create: {
          email: `${role.toLowerCase()}@example.com`,
          passwordHash: userPassword,
          role: role,
        },
      })
    }

    // Create insurers
    const insurers = [
      {
        name: 'HealthGuard Insurance',
        description: 'Leading health insurance provider with 25 years of experience',
        logo: 'healthguard-logo.png',
        rating: 4.5,
        establishedYear: 1998,
        regulatoryInfo: {
          licenseNumber: 'HI-123456',
          validUntil: '2025-12-31',
        },
      },
      {
        name: 'MediCare Plus',
        description: 'Innovative health coverage solutions for modern healthcare needs',
        logo: 'medicare-plus-logo.png',
        rating: 4.3,
        establishedYear: 2005,
        regulatoryInfo: {
          licenseNumber: 'HI-789012',
          validUntil: '2025-12-31',
        },
      },
      {
        name: 'WellLife Insurance',
        description: 'Comprehensive health protection for you and your family',
        logo: 'welllife-logo.png',
        rating: 4.7,
        establishedYear: 1990,
        regulatoryInfo: {
          licenseNumber: 'HI-345678',
          validUntil: '2025-12-31',
        },
      },
    ]

    for (const insurer of insurers) {
      await prisma.insurer.upsert({
        where: { name: insurer.name },
        update: {},
        create: insurer,
      })
    }

    // Create plans for each insurer
    const planTypes = [PlanType.INDIVIDUAL, PlanType.FAMILY, PlanType.SENIOR_CITIZEN, PlanType.GROUP]
    const insurerEntities = await prisma.insurer.findMany()

    for (const insurer of insurerEntities) {
      for (const planType of planTypes) {
        const planName = `${insurer.name} ${planType.charAt(0)}${planType.slice(1).toLowerCase()}`
        
        const plan = await prisma.productPlan.upsert({
          where: { id: `${insurer.id}_${planType}` },
          update: {},
          create: {
            name: planName,
            description: `${planType} health insurance plan by ${insurer.name}`,
            insurerId: insurer.id,
            planType,
            coverageAmount: 5000000,
            features: {
              networkHospitals: 5000,
              cashless: true,
              preExistingCover: 2,
              noClaimBonus: 0.5,
            },
            benefitsDetail: {
              roomRent: { limit: 'Single Private Room', subLimit: null },
              icu: { limit: '100%', subLimit: null },
              ambulance: { limit: 2000, subLimit: 'per hospitalization' },
            },
            exclusions: ['Cosmetic Surgery', 'Self-inflicted Injuries', 'Dental Treatment'],
            waitingPeriods: {
              preExisting: 24,
              specific: 12,
              general: 30,
            },
            pricingTiers: {
              '18-35': 1.0,
              '36-50': 1.2,
              '51-65': 1.5,
              '66+': 2.0,
            },
          },
        })

        // Create benefits for the plan
        const benefits = [
          {
            name: 'Hospitalization Cover',
            description: 'Covers in-patient hospitalization expenses',
            coverageAmount: 100,
            waitingPeriod: 30,
          },
          {
            name: 'Pre & Post Hospitalization',
            description: 'Covers medical expenses before and after hospitalization',
            coverageAmount: 30000,
            waitingPeriod: 30,
          },
          {
            name: 'Day Care Procedures',
            description: 'Covers specified day care treatments',
            coverageAmount: 100,
            waitingPeriod: 0,
          },
          {
            name: 'Ambulance Cover',
            description: 'Covers ambulance charges',
            coverageAmount: 2000,
            waitingPeriod: 0,
          },
        ]

        for (const benefit of benefits) {
          await prisma.planBenefit.upsert({
            where: { id: `${plan.id}_${benefit.name}` },
      update: {},
      create: {
              ...benefit,
              planId: plan.id,
      },
    })
  }
      }
    }

    // Create sample hospitals
    const hospitals = [
      {
        name: 'City General Hospital',
        address: {
          street: '123 Healthcare Ave',
          area: 'Andheri East',
          landmark: 'Near Metro Station',
        },
        location: {
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          coordinates: {
            latitude: 19.0760,
            longitude: 72.8777,
          },
        },
        specialties: ['Cardiology', 'Orthopedics', 'Neurology'],
        facilities: ['24x7 Emergency', 'ICU', 'Operation Theatre', 'Pharmacy'],
        emergencyServices: true,
        rating: 4.5,
      },
      {
        name: 'LifeCare Medical Center',
        address: {
          street: '456 Wellness Road',
          area: 'Connaught Place',
          landmark: 'Near Central Park',
        },
        location: {
          city: 'Delhi',
          state: 'Delhi',
          pincode: '110001',
          coordinates: {
            latitude: 28.6139,
            longitude: 77.2090,
          },
        },
        specialties: ['Oncology', 'Pediatrics', 'General Surgery'],
        facilities: ['24x7 Emergency', 'Blood Bank', 'Diagnostic Center'],
        emergencyServices: true,
        rating: 4.8,
      },
      {
        name: 'Health First Hospital',
        address: {
          street: '789 Care Street',
          area: 'Indiranagar',
          landmark: 'Near Metro Station',
        },
        location: {
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          coordinates: {
            latitude: 12.9716,
            longitude: 77.5946,
          },
        },
        specialties: ['Gynecology', 'Dermatology', 'ENT'],
        facilities: ['24x7 Emergency', 'Maternity Ward', 'NICU'],
        emergencyServices: true,
        rating: 4.3,
      },
    ]

    for (const hospital of hospitals) {
      await prisma.hospital.upsert({
        where: { id: hospital.name }, // Using name as a unique identifier
        update: {},
        create: hospital,
      })
    }

    console.log('Database seeded successfully')
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
