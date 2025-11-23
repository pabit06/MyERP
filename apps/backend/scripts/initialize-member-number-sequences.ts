/**
 * Initialize member number sequences for existing cooperatives
 * This script should be run after applying the migration that creates the member_number_sequences table
 *
 * Usage: pnpm --filter @myerp/backend tsx scripts/initialize-member-number-sequences.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeMemberNumberSequences() {
  try {
    console.log('🔄 Initializing member number sequences for existing cooperatives...\n');

    // Get all cooperatives
    const cooperatives = await prisma.cooperative.findMany({
      select: {
        id: true,
        name: true,
        subdomain: true,
      },
    });

    if (cooperatives.length === 0) {
      console.log('ℹ️  No cooperatives found. Nothing to initialize.');
      return;
    }

    console.log(`Found ${cooperatives.length} cooperative(s)\n`);

    let initialized = 0;
    let skipped = 0;

    for (const coop of cooperatives) {
      // Check if sequence already exists
      const existingSequence = await prisma.memberNumberSequence.findUnique({
        where: { cooperativeId: coop.id },
      });

      if (existingSequence) {
        console.log(
          `⏭️  Skipping ${coop.name} (${coop.subdomain}): Sequence already exists (lastNumber: ${existingSequence.lastNumber})`
        );
        skipped++;
        continue;
      }

      // Find the highest member number for this cooperative
      const lastMember = await prisma.member.findFirst({
        where: {
          cooperativeId: coop.id,
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

      let lastNumber = 0;

      if (lastMember && lastMember.memberNumber) {
        // Extract the number part
        const parsedNumber = parseInt(lastMember.memberNumber, 10);
        if (!isNaN(parsedNumber) && parsedNumber >= 1) {
          lastNumber = parsedNumber;
        }
      }

      // Create the sequence record
      await prisma.memberNumberSequence.create({
        data: {
          cooperativeId: coop.id,
          lastNumber,
        },
      });

      console.log(`✅ Initialized ${coop.name} (${coop.subdomain}): lastNumber = ${lastNumber}`);
      initialized++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Initialized: ${initialized}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total: ${cooperatives.length}`);
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error initializing member number sequences:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initializeMemberNumberSequences()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
