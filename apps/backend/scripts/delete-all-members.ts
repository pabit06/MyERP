/**
 * Script to delete all members and their related data
 * WARNING: This is a destructive operation that will permanently delete:
 * - All members
 * - All member numbers
 * - All related data (savings, loans, shares, KYC, documents, etc.)
 * 
 * Usage: pnpm --filter @myerp/backend delete:members [cooperativeId]
 * Or: tsx apps/backend/scripts/delete-all-members.ts [cooperativeId]
 */

import dotenv from 'dotenv';
import { prisma } from '@myerp/db-schema';

// Load environment variables
dotenv.config();

async function deleteAllMembers(cooperativeIdentifier?: string) {
  try {
    console.log('⚠️  WARNING: This will delete ALL members and related data!');
    console.log('Starting deletion process...\n');

    let cooperativeId: string | undefined;
    let whereClause: any = {};

    // If identifier provided, check if it's subdomain or ID
    if (cooperativeIdentifier) {
      // First try to find by subdomain
      const cooperative = await prisma.cooperative.findUnique({
        where: { subdomain: cooperativeIdentifier },
        select: { id: true, name: true, subdomain: true },
      });

      if (cooperative) {
        cooperativeId = cooperative.id;
        console.log(`Found cooperative: ${cooperative.name} (${cooperative.subdomain})`);
        console.log(`Cooperative ID: ${cooperativeId}\n`);
      } else {
        // Try as ID
        const cooperativeById = await prisma.cooperative.findUnique({
          where: { id: cooperativeIdentifier },
          select: { id: true, name: true, subdomain: true },
        });

        if (cooperativeById) {
          cooperativeId = cooperativeById.id;
          console.log(`Found cooperative: ${cooperativeById.name} (${cooperativeById.subdomain})`);
          console.log(`Cooperative ID: ${cooperativeId}\n`);
        } else {
          console.error(`❌ Cooperative not found: ${cooperativeIdentifier}`);
          console.error('Please provide either a subdomain or cooperative ID');
          return;
        }
      }

      whereClause = { cooperativeId };
    }

    // Count members before deletion
    const memberCount = await prisma.member.count({
      where: whereClause,
    });

    console.log(`Found ${memberCount} member(s) to delete`);

    if (memberCount === 0) {
      console.log('No members found. Exiting...');
      return;
    }

    // Delete all members (cascade will handle related data)
    const result = await prisma.member.deleteMany({
      where: whereClause,
    });

    console.log(`\n✅ Successfully deleted ${result.count} member(s)`);
    console.log('\nDeleted data includes:');
    console.log('- All member records');
    console.log('- All member numbers');
    console.log('- All saving accounts');
    console.log('- All loan applications');
    console.log('- All share accounts and transactions');
    console.log('- All KYC data');
    console.log('- All member documents');
    console.log('- All workflow history');
    console.log('- All AML/KYM data');
    console.log('- All committee memberships');
    console.log('- All related transactions and records');

    // Verify deletion
    const remainingCount = await prisma.member.count({
      where: whereClause,
    });

    if (remainingCount === 0) {
      console.log('\n✅ Verification: All members have been deleted successfully');
    } else {
      console.log(`\n⚠️  Warning: ${remainingCount} member(s) still remain`);
    }
  } catch (error) {
    console.error('❌ Error deleting members:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get cooperative identifier (subdomain or ID) from command line argument
const cooperativeIdentifier = process.argv[2];

if (cooperativeIdentifier) {
  console.log(`Deleting members for cooperative: ${cooperativeIdentifier}\n`);
  deleteAllMembers(cooperativeIdentifier)
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log('⚠️  WARNING: No cooperative ID provided. This will delete ALL members from ALL cooperatives!');
  console.log('Usage: npx tsx apps/backend/scripts/delete-all-members.ts [cooperativeId]');
  console.log('\nIf you want to delete all members, run without arguments (not recommended for production)');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  setTimeout(() => {
    deleteAllMembers()
      .then(() => {
        console.log('\n✅ Script completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n❌ Script failed:', error);
        process.exit(1);
      });
  }, 5000);
}

