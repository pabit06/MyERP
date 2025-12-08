import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to check all member numbers and find any issues
 */
async function checkMemberNumbers() {
  try {
    console.log('🔍 Checking all member numbers...\n');

    // Get all cooperatives
    const cooperatives = await prisma.cooperative.findMany({
      select: { id: true, name: true },
    });

    for (const cooperative of cooperatives) {
      console.log(`📋 Cooperative: ${cooperative.name} (${cooperative.id})\n`);

      // Get all members with member numbers
      const members = await prisma.member.findMany({
        where: {
          cooperativeId: cooperative.id,
          memberNumber: {
            not: null,
          },
        },
        orderBy: [{ memberNumber: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          memberNumber: true,
          fullName: true,
          institutionName: true,
          firstName: true,
          lastName: true,
          workflowStatus: true,
          createdAt: true,
        },
      });

      console.log(`Total members with numbers: ${members.length}\n`);

      // Group by member number
      const memberNumberGroups = new Map<string, typeof members>();
      for (const member of members) {
        if (!member.memberNumber) continue;
        if (!memberNumberGroups.has(member.memberNumber)) {
          memberNumberGroups.set(member.memberNumber, []);
        }
        memberNumberGroups.get(member.memberNumber)!.push(member);
      }

      // Check for duplicates
      const duplicates = Array.from(memberNumberGroups.entries()).filter(
        ([, members]) => members.length > 1
      );

      if (duplicates.length > 0) {
        console.log('⚠️  DUPLICATES FOUND:\n');
        for (const [memberNumber, duplicateMembers] of duplicates) {
          console.log(`  Member Number: ${memberNumber} (${duplicateMembers.length} members)`);
          for (const member of duplicateMembers) {
            const name =
              member.fullName ||
              member.institutionName ||
              `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
              member.id;
            console.log(`    - ${name} (${member.id})`);
            console.log(`      Status: ${member.workflowStatus}`);
            console.log(`      Created: ${member.createdAt.toISOString()}`);
          }
          console.log('');
        }
      } else {
        console.log('✅ No duplicates found\n');
      }

      // Show all approved members
      const approvedMembers = members.filter(
        (m) =>
          m.workflowStatus === 'approved' ||
          m.workflowStatus === 'active' ||
          m.workflowStatus === 'bod_pending'
      );

      if (approvedMembers.length > 0) {
        console.log('📊 Approved/Active Members:\n');
        for (const member of approvedMembers) {
          const name =
            member.fullName ||
            member.institutionName ||
            `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
            member.id;
          console.log(`  ${member.memberNumber} - ${name} (${member.workflowStatus})`);
        }
        console.log('');
      }
    }
  } catch (error) {
    console.error('❌ Error checking member numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkMemberNumbers()
  .then(() => {
    console.log('✨ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
