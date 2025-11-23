import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed AML-related data:
 * - Create ComplianceOfficer role if it doesn't exist
 * - Seed risk categories (already in enum, but can add default config)
 */
async function seedAmlData() {
  try {
    // Get all cooperatives
    const cooperatives = await prisma.cooperative.findMany();

    for (const coop of cooperatives) {
      // Create ComplianceOfficer role if it doesn't exist
      const existingRole = await prisma.role.findFirst({
        where: {
          cooperativeId: coop.id,
          name: 'ComplianceOfficer',
        },
      });

      if (!existingRole) {
        await prisma.role.create({
          data: {
            name: 'ComplianceOfficer',
            cooperativeId: coop.id,
            permissions: [
              'compliance:view',
              'compliance:ttr:view',
              'compliance:ttr:approve',
              'compliance:ttr:reject',
              'compliance:cases:view',
              'compliance:cases:create',
              'compliance:cases:close',
              'compliance:kym:view',
              'compliance:risk:view',
              'compliance:risk:update',
              'compliance:watchlist:view',
              'compliance:watchlist:whitelist',
              'compliance:str:generate',
            ],
          },
        });
        console.log(`Created ComplianceOfficer role for ${coop.name}`);
      }
    }

    console.log('AML data seeding completed');
  } catch (error) {
    console.error('Error seeding AML data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedAmlData()
    .then(() => {
      console.log('Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export { seedAmlData };
