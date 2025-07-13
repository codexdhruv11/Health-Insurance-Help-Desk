import { PrismaClient, UserRole, PlanType, CoinEarnReason, RewardCategory } from '@prisma/client'
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

    // Create test users with initial coins
    const testUsers = [
      {
        email: 'test1@example.com',
        name: 'Test User 1',
        initialCoins: 5000,
      },
      {
        email: 'test2@example.com',
        name: 'Test User 2',
        initialCoins: 2500,
      },
      {
        email: 'test3@example.com',
        name: 'Test User 3',
        initialCoins: 7500,
      },
    ]

    for (const testUser of testUsers) {
      const user = await prisma.user.upsert({
        where: { email: testUser.email },
        update: {},
        create: {
          email: testUser.email,
          passwordHash: userPassword,
          role: UserRole.CUSTOMER,
          customer: {
            create: {
              firstName: testUser.name.split(' ')[0],
              lastName: testUser.name.split(' ')[1] || '',
              dateOfBirth: new Date('1990-01-01'), // Default date for test users
            }
          }
        },
      })

      // Create coin wallet for the user
      const wallet = await prisma.coinWallet.upsert({
        where: { userId: user.id },
        update: { balance: testUser.initialCoins },
        create: {
          userId: user.id,
          balance: testUser.initialCoins,
          totalEarned: testUser.initialCoins,
          totalSpent: 0,
        },
      })

      // Add initial coin transaction
      await prisma.coinTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARN',
          amount: testUser.initialCoins,
          reason: CoinEarnReason.SIGN_UP,
          metadata: {
            description: 'Initial coins for development',
            timestamp: new Date().toISOString(),
          },
        },
      })
    }

    // Create coin wallets for existing role-based users
    const existingUsers = await prisma.user.findMany({
      where: {
        role: UserRole.CUSTOMER,
        email: { endsWith: '@example.com' },
      },
    })

    for (const user of existingUsers) {
      const initialCoins = 1000
      const wallet = await prisma.coinWallet.upsert({
        where: { userId: user.id },
        update: { balance: initialCoins },
        create: {
          userId: user.id,
          balance: initialCoins,
          totalEarned: initialCoins,
          totalSpent: 0,
        },
      })

      // Add initial coin transaction
      await prisma.coinTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'EARN',
          amount: initialCoins,
          reason: CoinEarnReason.SIGN_UP,
          metadata: {
            description: 'Initial coins for development',
            timestamp: new Date().toISOString(),
          },
        },
      })
    }

    // Create some sample transactions for test users
    const transactionTypes = [
      { reason: CoinEarnReason.DAILY_LOGIN, amount: 10 },
      { reason: CoinEarnReason.HEALTH_QUIZ, amount: 50 },
      { reason: CoinEarnReason.DOCUMENT_UPLOAD, amount: 20 },
      { reason: CoinEarnReason.REFERRAL, amount: 200 },
    ]

    for (const testUser of testUsers) {
      const user = await prisma.user.findUnique({
        where: { email: testUser.email },
        include: { coinWallet: true },
      })

      if (!user || !user.coinWallet) continue

      // Add some random transactions
      for (const type of transactionTypes) {
        const count = Math.floor(Math.random() * 3) + 1 // 1-3 transactions per type
        for (let i = 0; i < count; i++) {
          await prisma.coinTransaction.create({
            data: {
              walletId: user.coinWallet.id,
              type: 'EARN',
              amount: type.amount,
              reason: type.reason,
              metadata: {
                description: `Earned from ${type.reason.toLowerCase()}`,
                timestamp: new Date().toISOString(),
              },
            },
          })

          // Update wallet balance and total earned
          await prisma.coinWallet.update({
            where: { id: user.coinWallet.id },
            data: { 
              balance: { increment: type.amount },
              totalEarned: { increment: type.amount },
            },
          })
        }
      }
    }

    // Create coin earn rules
    const earnRules = [
      {
        taskType: CoinEarnReason.SIGN_UP,
        coinAmount: 100,
        cooldownPeriod: 0, // One-time reward
        maxPerDay: 1,
        isActive: true,
      },
      {
        taskType: CoinEarnReason.DAILY_LOGIN,
        coinAmount: 10,
        cooldownPeriod: 1440, // 24 hours in minutes
        maxPerDay: 1,
        isActive: true,
      },
      {
        taskType: CoinEarnReason.POLICY_PURCHASE,
        coinAmount: 500,
        cooldownPeriod: 0, // No cooldown
        maxPerDay: 5,
        isActive: true,
      },
      {
        taskType: CoinEarnReason.REFERRAL,
        coinAmount: 200,
        cooldownPeriod: 0, // No cooldown
        maxPerDay: 10,
        isActive: true,
      },
      {
        taskType: CoinEarnReason.HEALTH_QUIZ,
        coinAmount: 50,
        cooldownPeriod: 10080, // 7 days in minutes
        maxPerDay: 1,
        isActive: true,
      },
      {
        taskType: CoinEarnReason.DOCUMENT_UPLOAD,
        coinAmount: 20,
        cooldownPeriod: 0, // No cooldown
        maxPerDay: 5,
        isActive: true,
      },
    ]

    for (const rule of earnRules) {
      await prisma.coinEarnRule.upsert({
        where: { id: `${rule.taskType}_${rule.isActive}` },
        update: rule,
        create: {
          ...rule,
          id: `${rule.taskType}_${rule.isActive}`,
        },
      })
    }

    // Create reward items
    const rewards = [
      {
        name: 'Premium Smartwatch',
        description: 'Track your health with this premium fitness smartwatch',
        coinCost: 5000,
        category: RewardCategory.ELECTRONICS,
        stock: 10,
        isAvailable: true,
        imageUrl: '/rewards/smartwatch.jpg',
      },
      {
        name: 'Health Check-up Voucher',
        description: 'Comprehensive health check-up at partner hospitals',
        coinCost: 2000,
        category: RewardCategory.HEALTH,
        stock: 50,
        isAvailable: true,
        imageUrl: '/rewards/health-checkup.jpg',
      },
      {
        name: 'Gym Membership',
        description: '1-month gym membership at partner fitness centers',
        coinCost: 3000,
        category: RewardCategory.HEALTH,
        stock: 20,
        isAvailable: true,
        imageUrl: '/rewards/gym.jpg',
      },
      {
        name: 'E-commerce Gift Card',
        description: '₹1000 gift card for online shopping',
        coinCost: 1000,
        category: RewardCategory.VOUCHERS,
        stock: 100,
        isAvailable: true,
        imageUrl: '/rewards/gift-card.jpg',
      },
      {
        name: 'Wireless Earbuds',
        description: 'Premium wireless earbuds for music and calls',
        coinCost: 4000,
        category: RewardCategory.ELECTRONICS,
        stock: 15,
        isAvailable: true,
        imageUrl: '/rewards/earbuds.jpg',
      },
      {
        name: 'Spa Voucher',
        description: 'Relaxing spa session at luxury wellness centers',
        coinCost: 2500,
        category: RewardCategory.LIFESTYLE,
        stock: 30,
        isAvailable: true,
        imageUrl: '/rewards/spa.jpg',
      },
      {
        name: 'Movie Tickets',
        description: 'Two premium movie tickets at partner theaters',
        coinCost: 1500,
        category: RewardCategory.LIFESTYLE,
        stock: 50,
        isAvailable: true,
        imageUrl: '/rewards/movie.jpg',
      },
      {
        name: 'Restaurant Voucher',
        description: '₹2000 dining voucher at premium restaurants',
        coinCost: 2000,
        category: RewardCategory.VOUCHERS,
        stock: 40,
        isAvailable: true,
        imageUrl: '/rewards/restaurant.jpg',
      },
    ]

    for (const reward of rewards) {
      await prisma.rewardItem.upsert({
        where: { id: `${reward.name}_${reward.category}` },
        update: reward,
        create: {
          ...reward,
          id: `${reward.name}_${reward.category}`,
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
