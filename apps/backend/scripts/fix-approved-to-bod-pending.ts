import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to fix members stuck in 'approved' status
 * Moves them to 'bod_pending' status if they should be there
 */
async function fixApprovedToBodPending() {
  try {
    console.log('🔍 Finding members stuck in "approved" status...\n');

    // Get all cooperatives
    const cooperatives = await prisma.cooperative.findMany({
      select: { id: true, name: true },
    });

    for (const cooperative of cooperatives) {
      console.log(`📋 Processing cooperative: ${cooperative.name}\n`);

      // Find all members in 'approved' status
      const approvedMembers = await prisma.member.findMany({
        where: {
          cooperativeId: cooperative.id,
          workflowStatus: 'approved',
        },
        select: {
          id: true,
          memberNumber: true,
          fullName: true,
          institutionName: true,
          firstName: true,
          lastName: true,
          workflowStatus: true,
        },
      });

      if (approvedMembers.length === 0) {
        console.log('  ✅ No members stuck in "approved" status\n');
        continue;
      }

      console.log(`  ⚠️  Found ${approvedMembers.length} member(s) in "approved" status\n`);

      for (const member of approvedMembers) {
        const memberName =
          member.fullName ||
          member.institutionName ||
          `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
          member.id;

        console.log(`  🔧 Fixing: ${memberName} (${member.memberNumber || 'No number'})`);

        // Check if there's already a history entry for bod_pending
        const existingBodHistory = await prisma.memberWorkflowHistory.findFirst({
          where: {
            memberId: member.id,
            toStatus: 'bod_pending',
          },
        });

        if (existingBodHistory) {
          console.log(`    ⚠️  Already has BOD history entry, but status is still "approved"`);
          console.log(`    ↻ Updating status to bod_pending...`);
        } else {
          console.log(`    ➕ Creating BOD history entry...`);
        }

        // Update status to bod_pending
        await prisma.member.update({
          where: { id: member.id },
          data: { workflowStatus: 'bod_pending' },
        });

        // Create history entry if it doesn't exist
        if (!existingBodHistory) {
          // Get the last approval entry to get the performedBy user
          const lastApproval = await prisma.memberWorkflowHistory.findFirst({
            where: {
              memberId: member.id,
              toStatus: 'approved',
            },
            orderBy: { createdAt: 'desc' },
            select: { performedBy: true },
          });

          await prisma.memberWorkflowHistory.create({
            data: {
              memberId: member.id,
              cooperativeId: cooperative.id,
              fromStatus: 'approved',
              toStatus: 'bod_pending',
              action: 'sent_to_agenda',
              performedBy: lastApproval?.performedBy || 'system',
              remarks:
                'Automatically added to pending agenda for BOD approval after manager approval (retroactive fix)',
            },
          });
        }

        console.log(`    ✅ Fixed: ${memberName} → bod_pending\n`);
      }
    }

    console.log('✨ Script completed successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

fixApprovedToBodPending()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
