/**
 * Script to delete all members and their related data
 * WARNING: This is a destructive operation that will permanently delete:
 * - All members
 * - All member numbers
 * - All related data (savings, loans, shares, KYC, documents, etc.)
 * - All related journal entries and ledger entries
 * 
 * Usage: pnpm --filter @myerp/backend delete:members [cooperativeId] [--all-journals]
 * Or: tsx apps/backend/scripts/delete-all-members.ts [cooperativeId] [--all-journals]
 * 
 * If --all-journals flag is provided, it will delete ALL journal entries for the cooperative
 * (useful for a complete fresh start, but use with caution!)
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

    // Step 1: Get all member IDs that will be deleted
    console.log('\n📋 Finding related accounting entries...');
    const membersToDelete = await prisma.member.findMany({
      where: whereClause,
      select: {
        id: true,
        memberNumber: true,
      },
    });

    const memberIds = membersToDelete.map((m) => m.id);
    const memberNumbers = membersToDelete
      .map((m) => m.memberNumber)
      .filter((num): num is string => num !== null && num !== undefined);

    console.log(`Found ${memberIds.length} member(s) to process`);

    // Step 2: Find all share transactions that will be deleted and their related journal entries
    // Only get transactions for the specific members being deleted, not all members in the cooperative
    const shareTransactions = await prisma.shareTransaction.findMany({
      where: {
        cooperativeId: cooperativeId || undefined,
        memberId: { in: memberIds },
      },
      select: {
        id: true,
        journalId: true,
      },
    });

    const shareJournalIds = shareTransactions
      .map((st) => st.journalId)
      .filter((id): id is string => id !== null && id !== undefined);

    console.log(`Found ${shareJournalIds.length} journal entry/entries related to share transactions`);

    // Step 3: Find journal entries related to members by description (entry fees, advance payments, etc.)
    // These entries have member IDs or member numbers in their descriptions
    const orConditions: any[] = [];
    
    // Match by member ID in description
    memberIds.forEach((memberId) => {
      orConditions.push({ description: { contains: memberId } });
      orConditions.push({ description: { contains: `Member ID: ${memberId}` } });
    });
    
    // Match by member number in description (e.g., "member 000001" or "member 000001 -")
    memberNumbers.forEach((memberNumber) => {
      orConditions.push({ description: { contains: `member ${memberNumber}` } });
      orConditions.push({ description: { contains: `Member ${memberNumber}` } });
      orConditions.push({ description: { contains: `member ${memberNumber} -` } });
      orConditions.push({ description: { contains: `Member ${memberNumber} -` } });
      orConditions.push({ description: { contains: `applicant: ${memberNumber}` } });
    });
    
    const memberRelatedJournalEntries = orConditions.length > 0
      ? await prisma.journalEntry.findMany({
          where: {
            cooperativeId: cooperativeId || undefined,
            OR: orConditions,
          },
          select: {
            id: true,
          },
        })
      : [];

    const memberRelatedJournalIds = memberRelatedJournalEntries.map((je) => je.id);
    console.log(`Found ${memberRelatedJournalIds.length} journal entry/entries related to members (by description)`);

    // Combine all journal entry IDs
    const allJournalIds = [...new Set([...shareJournalIds, ...memberRelatedJournalIds])];
    console.log(`Total ${allJournalIds.length} unique journal entry/entries to delete`);

    // Step 4: Delete ledger entries related to these journal entries
    if (allJournalIds.length > 0) {
      const ledgerDeleteResult = await prisma.ledger.deleteMany({
        where: {
          journalEntryId: { in: allJournalIds },
          cooperativeId: cooperativeId || undefined,
        },
      });
      console.log(`✅ Deleted ${ledgerDeleteResult.count} ledger entry/entries`);
    }

    // Step 5: Delete journal entries
    if (allJournalIds.length > 0) {
      const journalDeleteResult = await prisma.journalEntry.deleteMany({
        where: {
          id: { in: allJournalIds },
          cooperativeId: cooperativeId || undefined,
        },
      });
      console.log(`✅ Deleted ${journalDeleteResult.count} journal entry/entries`);
    }

    // Step 6: If --all-journals flag is set, delete ALL journal entries for fresh start
    if (deleteAllJournals && cooperativeId) {
      console.log('\n⚠️  --all-journals flag detected: Deleting ALL journal entries for this cooperative...');
      
      // First delete all ledger entries
      const allLedgers = await prisma.ledger.deleteMany({
        where: {
          cooperativeId,
        },
      });
      console.log(`✅ Deleted ${allLedgers.count} ledger entry/entries`);
      
      // Then delete all journal entries
      const allJournals = await prisma.journalEntry.deleteMany({
        where: {
          cooperativeId,
        },
      });
      console.log(`✅ Deleted ${allJournals.count} journal entry/entries`);
    } else {
      // Step 6b: Also delete any remaining ledger entries for this cooperative (cleanup orphaned entries)
      // This handles cases where journal entries might have been deleted but ledger entries remain
      if (cooperativeId) {
        // Get all remaining journal entry IDs
        const remainingJournalIds = await prisma.journalEntry.findMany({
          where: { cooperativeId },
          select: { id: true },
        });
        const remainingJournalIdList = remainingJournalIds.map((j) => j.id);
        
        // Delete ledger entries that don't have a valid journal entry
        const orphanedLedgers = await prisma.ledger.deleteMany({
          where: {
            cooperativeId,
            OR: [
              { journalEntryId: null },
              ...(remainingJournalIdList.length > 0
                ? [{ journalEntryId: { notIn: remainingJournalIdList } }]
                : []),
            ],
          },
        });
        if (orphanedLedgers.count > 0) {
          console.log(`✅ Deleted ${orphanedLedgers.count} orphaned ledger entry/entries`);
        }
      }
    }

    // Step 7: Delete all members (cascade will handle ShareAccount, ShareTransaction, etc.)
    console.log('\n🗑️  Deleting members and related data...');
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
    console.log('- All related journal entries and ledger entries (for share transactions)');
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
const deleteAllJournals = process.argv.includes('--all-journals');

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

