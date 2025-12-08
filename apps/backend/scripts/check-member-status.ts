import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMemberStatus() {
  try {
    const memberId = 'cmiacj9eq0025kmqgi9fow2lv';

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        memberNumber: true,
        fullName: true,
        workflowStatus: true,
        createdAt: true,
      },
    });

    if (!member) {
      console.log('❌ Member not found');
      return;
    }

    console.log('📋 Member Details:');
    console.log(`  ID: ${member.id}`);
    console.log(`  Name: ${member.fullName}`);
    console.log(`  Member Number: ${member.memberNumber || 'Not assigned'}`);
    console.log(`  Workflow Status: ${member.workflowStatus}`);
    console.log(`  Created: ${member.createdAt}`);

    // Check workflow history
    const history = await prisma.memberWorkflowHistory.findMany({
      where: { memberId },
      orderBy: { createdAt: 'asc' },
      select: {
        fromStatus: true,
        toStatus: true,
        action: true,
        createdAt: true,
        remarks: true,
      },
    });

    console.log('\n📜 Workflow History:');
    for (const entry of history) {
      console.log(`  ${entry.fromStatus} → ${entry.toStatus} (${entry.action})`);
      console.log(`    Date: ${entry.createdAt.toISOString()}`);
      if (entry.remarks) {
        console.log(`    Remarks: ${entry.remarks}`);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemberStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
