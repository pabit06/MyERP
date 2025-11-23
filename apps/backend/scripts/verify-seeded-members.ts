import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifySeededMembers() {
  try {
    const cooperative = await prisma.cooperative.findUnique({
      where: { subdomain: 'bhanjyang' },
      select: { id: true, name: true },
    });

    if (!cooperative) {
      console.log('❌ Cooperative not found');
      return;
    }

    const members = await prisma.member.findMany({
      where: { cooperativeId: cooperative.id },
      include: {
        kyc: {
          select: {
            initialShareAmount: true,
            initialSavingsAmount: true,
            initialOtherAmount: true,
            initialOtherSpecify: true,
          },
        },
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
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log(`\n📊 Sample of ${members.length} members:\n`);

    for (const member of members) {
      const name = member.fullName || member.institutionName || 'Unknown';
      console.log(`Member: ${name}`);
      console.log(`  Type: ${member.memberType}`);
      console.log(`  Status: ${member.workflowStatus}`);
      
      if (member.kyc) {
        console.log(`  Share Amount: Rs. ${member.kyc.initialShareAmount || 0}`);
        console.log(`  Savings Amount: Rs. ${member.kyc.initialSavingsAmount || 0}`);
        console.log(`  Entry Fee: Rs. ${member.kyc.initialOtherAmount || 0} (${member.kyc.initialOtherSpecify || 'N/A'})`);
      } else if (member.institutionKyc) {
        console.log(`  Share Amount: Rs. ${member.institutionKyc.initialShareAmount || 0}`);
        console.log(`  Savings Amount: Rs. ${member.institutionKyc.initialSavingsAmount || 0}`);
        console.log(`  Entry Fee: Rs. ${member.institutionKyc.initialOtherAmount || 0} (${member.institutionKyc.initialOtherSpecify || 'N/A'})`);
      }
      console.log('');
    }

    // Count by type
    const individualCount = await prisma.member.count({
      where: {
        cooperativeId: cooperative.id,
        memberType: 'INDIVIDUAL',
      },
    });

    const institutionCount = await prisma.member.count({
      where: {
        cooperativeId: cooperative.id,
        memberType: 'INSTITUTION',
      },
    });

    console.log(`\n📈 Summary:`);
    console.log(`  Total Members: ${individualCount + institutionCount}`);
    console.log(`  Individual: ${individualCount}`);
    console.log(`  Institution: ${institutionCount}`);

    // Check members with share amounts
    const individualMembersWithShares = await prisma.memberKYC.count({
      where: {
        cooperativeId: cooperative.id,
        initialShareAmount: {
          gt: 0,
        },
      },
    });

    const institutionMembersWithShares = await prisma.institutionKYC.count({
      where: {
        cooperativeId: cooperative.id,
        initialShareAmount: {
          gt: 0,
        },
      },
    });

    console.log(`  Individual Members with Share Amount > 0: ${individualMembersWithShares}`);
    console.log(`  Institution Members with Share Amount > 0: ${institutionMembersWithShares}`);
    console.log(`  Total Members with Share Amount > 0: ${individualMembersWithShares + institutionMembersWithShares}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifySeededMembers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

