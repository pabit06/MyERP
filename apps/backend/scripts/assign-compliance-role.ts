import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Assign ComplianceOfficer role to a user
 * Usage: tsx scripts/assign-compliance-role.ts <userEmail>
 */
async function assignComplianceRole(userEmail: string) {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        cooperative: true,
      },
    });

    if (!user) {
      console.error(`❌ User with email ${userEmail} not found`);
      process.exit(1);
    }

    if (!user.cooperative) {
      console.error(`❌ User is not associated with a cooperative`);
      process.exit(1);
    }

    console.log(`Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`Cooperative: ${user.cooperative.name}`);

    if (!user.cooperativeId) {
      console.error(`❌ User does not have a cooperativeId`);
      process.exit(1);
    }

    // Find or create ComplianceOfficer role
    let role = await prisma.role.findFirst({
      where: {
        cooperativeId: user.cooperativeId,
        name: 'ComplianceOfficer',
      },
    });

    if (!role) {
      console.log('Creating ComplianceOfficer role...');
      role = await prisma.role.create({
        data: {
          name: 'ComplianceOfficer',
          cooperativeId: user.cooperativeId,
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
      console.log('✅ ComplianceOfficer role created');
    } else {
      console.log('✅ ComplianceOfficer role already exists');
    }

    // Assign role to user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        roleId: role.id,
      },
    });

    console.log(`✅ ComplianceOfficer role assigned to ${user.email}`);
    console.log('\n📝 Next steps:');
    console.log('1. Logout and login again');
    console.log('2. You should now see "Compliance" menu');
    console.log('3. You can access all AML features including the Compliance Dashboard');
  } catch (error) {
    console.error('Error assigning role:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Usage: tsx scripts/assign-compliance-role.ts <userEmail>');
  console.error('Example: tsx scripts/assign-compliance-role.ts admin@example.com');
  process.exit(1);
}

assignComplianceRole(userEmail)
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });

export { assignComplianceRole };
