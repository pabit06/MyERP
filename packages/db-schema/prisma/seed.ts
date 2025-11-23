import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default plans (using findFirst + create pattern since id is auto-generated)
  const existingBasic = await prisma.plan.findFirst({
    where: { name: 'Basic' },
  });

  const basicPlan =
    existingBasic ||
    (await prisma.plan.create({
      data: {
        name: 'Basic',
        monthlyPrice: 0,
        enabledModules: [],
      },
    }));

  const existingStandard = await prisma.plan.findFirst({
    where: { name: 'Standard' },
  });

  const standardPlan =
    existingStandard ||
    (await prisma.plan.create({
      data: {
        name: 'Standard',
        monthlyPrice: 49.99,
        enabledModules: ['cbs'],
      },
    }));

  const existingPremium = await prisma.plan.findFirst({
    where: { name: 'Premium' },
  });

  const premiumPlan =
    existingPremium ||
    (await prisma.plan.create({
      data: {
        name: 'Premium',
        monthlyPrice: 99.99,
        enabledModules: ['cbs', 'dms', 'hrm'],
      },
    }));

  const existingEnterprise = await prisma.plan.findFirst({
    where: { name: 'Enterprise' },
  });

  const enterprisePlan =
    existingEnterprise ||
    (await prisma.plan.create({
      data: {
        name: 'Enterprise',
        monthlyPrice: 199.99,
        enabledModules: ['cbs', 'dms', 'hrm', 'governance', 'inventory', 'compliance'],
      },
    }));

  console.log('✅ Plans seeded:', {
    basic: basicPlan.name,
    standard: standardPlan.name,
    premium: premiumPlan.name,
    enterprise: enterprisePlan.name,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
