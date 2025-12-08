import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Script to find and fix duplicate member numbers
 * This script will:
 * 1. Find all members with duplicate member numbers within the same cooperative
 * 2. Reassign unique member numbers to duplicates (keeping the oldest member's number)
 */
async function fixDuplicateMemberNumbers() {
  try {
    console.log('🔍 Searching for duplicate member numbers...');

    // Get all cooperatives
    const cooperatives = await prisma.cooperative.findMany({
      select: { id: true, name: true },
    });

    let totalFixed = 0;

    for (const cooperative of cooperatives) {
      console.log(`\n📋 Processing cooperative: ${cooperative.name} (${cooperative.id})`);

      // Find all members with member numbers for this cooperative
      const members = await prisma.member.findMany({
        where: {
          cooperativeId: cooperative.id,
          memberNumber: {
            not: null,
          },
        },
        orderBy: [
          { createdAt: 'asc' }, // Oldest first
          { id: 'asc' }, // Secondary sort for consistency
        ],
        select: {
          id: true,
          memberNumber: true,
          fullName: true,
          institutionName: true,
          firstName: true,
          lastName: true,
          createdAt: true,
        },
      });

      // Group by member number to find duplicates
      const memberNumberGroups = new Map<string, typeof members>();
      for (const member of members) {
        if (!member.memberNumber) continue;
        if (!memberNumberGroups.has(member.memberNumber)) {
          memberNumberGroups.set(member.memberNumber, []);
        }
        memberNumberGroups.get(member.memberNumber)!.push(member);
      }

      // Find duplicates
      const duplicates = Array.from(memberNumberGroups.entries()).filter(
        ([, members]) => members.length > 1
      );

      if (duplicates.length === 0) {
        console.log('  ✅ No duplicates found');
        continue;
      }

      console.log(`  ⚠️  Found ${duplicates.length} duplicate member number(s)`);

      for (const [memberNumber, duplicateMembers] of duplicates) {
        console.log(
          `\n  🔧 Fixing duplicate: ${memberNumber} (${duplicateMembers.length} members)`
        );

        // Keep the first (oldest) member's number, reassign others
        const [keepMember, ...reassignMembers] = duplicateMembers;

        const keepName =
          keepMember.fullName ||
          keepMember.institutionName ||
          `${keepMember.firstName || ''} ${keepMember.lastName || ''}`.trim() ||
          keepMember.id;
        console.log(`    ✓ Keeping: ${keepName} (${keepMember.id}) - ${memberNumber}`);

        // Find the highest member number to start reassigning from
        const highestMember = await prisma.member.findFirst({
          where: {
            cooperativeId: cooperative.id,
            memberNumber: {
              not: null,
            },
          },
          orderBy: {
            memberNumber: 'desc',
          },
          select: {
            memberNumber: true,
          },
        });

        let nextNumber = 1;
        if (highestMember && highestMember.memberNumber) {
          const lastNumber = parseInt(highestMember.memberNumber, 10);
          if (!isNaN(lastNumber) && lastNumber >= 1) {
            nextNumber = lastNumber + 1;
          }
        }

        // Reassign numbers to duplicates
        for (const member of reassignMembers) {
          const newMemberNumber = nextNumber.toString().padStart(6, '0');

          // Check if this number is already taken
          const existing = await prisma.member.findFirst({
            where: {
              cooperativeId: cooperative.id,
              memberNumber: newMemberNumber,
            },
          });

          if (existing) {
            // Find next available number
            const allMembers = await prisma.member.findMany({
              where: {
                cooperativeId: cooperative.id,
                memberNumber: {
                  not: null,
                },
              },
              select: {
                memberNumber: true,
              },
            });

            const usedNumbers = new Set(
              allMembers
                .map((m) => m.memberNumber)
                .filter((n): n is string => n !== null)
                .map((n) => parseInt(n, 10))
                .filter((n) => !isNaN(n))
            );

            let candidate = nextNumber;
            while (usedNumbers.has(candidate)) {
              candidate++;
            }
            nextNumber = candidate;
          }

          const finalMemberNumber = nextNumber.toString().padStart(6, '0');
          nextNumber++;

          const memberName =
            member.fullName ||
            member.institutionName ||
            `${member.firstName || ''} ${member.lastName || ''}`.trim() ||
            member.id;

          await prisma.member.update({
            where: { id: member.id },
            data: { memberNumber: finalMemberNumber },
          });

          console.log(
            `    ↻ Reassigned: ${memberName} (${member.id}) - ${memberNumber} → ${finalMemberNumber}`
          );
          totalFixed++;
        }
      }
    }

    console.log(`\n✅ Fixed ${totalFixed} duplicate member number(s)`);
  } catch (error) {
    console.error('❌ Error fixing duplicate member numbers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixDuplicateMemberNumbers()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
