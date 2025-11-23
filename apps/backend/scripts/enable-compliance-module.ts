import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Enable compliance module for a cooperative
 * Usage: tsx scripts/enable-compliance-module.ts <cooperativeId>
 */
async function enableComplianceModule(cooperativeId?: string) {
  try {
    let cooperatives;

    if (cooperativeId) {
      // Enable for specific cooperative
      cooperatives = await prisma.cooperative.findMany({
        where: { id: cooperativeId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });
    } else {
      // Enable for all cooperatives
      cooperatives = await prisma.cooperative.findMany({
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });
    }

    if (cooperatives.length === 0) {
      console.log('No cooperatives found');
      return;
    }

    for (const coop of cooperatives) {
      if (!coop.subscription?.plan) {
        console.log(`⚠️  Cooperative ${coop.name} has no active subscription`);
        continue;
      }

      const plan = coop.subscription.plan;
      const enabledModules = (plan.enabledModules as string[]) || [];

      if (enabledModules.includes('compliance')) {
        console.log(`✅ Compliance module already enabled for ${coop.name}`);
        continue;
      }

      // Add compliance to enabled modules
      const updatedModules = [...enabledModules, 'compliance'];

      await prisma.plan.update({
        where: { id: plan.id },
        data: {
          enabledModules: updatedModules,
        },
      });

      console.log(`✅ Enabled compliance module for ${coop.name}`);
    }

    console.log('\n✅ Compliance module enabled successfully!');
    console.log('\nNext steps:');
    console.log('1. Assign ComplianceOfficer role to users:');
    console.log('   tsx scripts/seed-aml-data.ts');
    console.log('2. Login and refresh your browser');
    console.log('3. You should now see "Compliance" in the navigation menu');
  } catch (error) {
    console.error('Error enabling compliance module:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
const cooperativeId = process.argv[2];

if (cooperativeId) {
  console.log(`Enabling compliance module for cooperative: ${cooperativeId}`);
} else {
  console.log('Enabling compliance module for ALL cooperatives...');
}

enableComplianceModule(cooperativeId)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

export { enableComplianceModule };
