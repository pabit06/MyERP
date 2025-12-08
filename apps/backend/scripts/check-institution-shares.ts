import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkInstitutionShares() {
  try {
    const cooperative = await prisma.cooperative.findUnique({
      where: { subdomain: 'bhanjyang' },
      select: { id: true, name: true },
    });

    if (!cooperative) {
      console.log('❌ Cooperative not found');
      return;
    }

    const institutions = await prisma.member.findMany({
      where: {
        cooperativeId: cooperative.id,
        memberType: 'INSTITUTION',
      },
      include: {
        institutionKyc: {
          select: {
            name: true,
            initialShareAmount: true,
            initialSavingsAmount: true,
            initialOtherAmount: true,
            initialOtherSpecify: true,
          },
        },
      },
      take: 5,
    });

    console.log(`\n📊 Institution Members (${institutions.length}):\n`);

    for (const member of institutions) {
      console.log(`Institution: ${member.institutionName || member.fullName}`);
      console.log(`  Status: ${member.workflowStatus}`);

      if (member.institutionKyc) {
        console.log(`  Share Amount: Rs. ${member.institutionKyc.initialShareAmount || 0}`);
        console.log(`  Savings Amount: Rs. ${member.institutionKyc.initialSavingsAmount || 0}`);
        console.log(
          `  Entry Fee: Rs. ${member.institutionKyc.initialOtherAmount || 0} (${member.institutionKyc.initialOtherSpecify || 'N/A'})`
        );
      }
      console.log('');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkInstitutionShares()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
