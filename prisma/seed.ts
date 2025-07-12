// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Create sample insurers
  const insurer1 = await prisma.insurer.upsert({
    where: { name: 'Insurer A' },
    update: {},
    create: {
      name: 'Insurer A',
      rating: 4.5,
      establishedYear: 1990,
      // ... other fields
    },
  });

  // Create sample product plans for insurer1
  const plan1 = await prisma.productPlan.upsert({
    where: { name: 'Plan 1' },
    update: {},
    create: {
      name: 'Plan 1',
      planType: 'INDIVIDUAL',
      insurer: { connect: { id: insurer1.id } },
      // ... other fields
    },
  });

  // Create sample hospitals
  const hospital1 = await prisma.hospital.upsert({
    where: { name: 'Hospital A' },
    update: {},
    create: {
      name: 'Hospital A',
      // ... other fields
    },
  });

  // Create network relationships
  await prisma.networkHospital.create({
    data: {
      hospitalId: hospital1.id,
      planId: plan1.id,
    },
  });

  // Create plan benefits
  await prisma.planBenefit.create({
    data: {
      plan: { connect: { id: plan1.id } },
      // ... benefit fields
    },
  });

  // Create admin user
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin',
      role: 'ADMIN',
      // ... other fields
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
