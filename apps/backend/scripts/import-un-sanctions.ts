import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const prisma = new PrismaClient();

/**
 * Import UN Sanction List from CSV file
 * CSV format: fullName,aliases,dob,nationality
 */
async function importUnSanctions(cooperativeId: string, csvFilePath: string) {
  const fileStream = fs.createReadStream(csvFilePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let lineNumber = 0;
  let imported = 0;
  let skipped = 0;

  for await (const line of rl) {
    lineNumber++;

    // Skip header
    if (lineNumber === 1) continue;

    const [fullName, aliasesStr, dob, nationality] = line.split(',').map((s) => s.trim());

    if (!fullName) {
      skipped++;
      continue;
    }

    try {
      const aliases = aliasesStr ? JSON.parse(aliasesStr) : null;

      const sanctionId = `${cooperativeId}-${fullName}-${dob || 'unknown'}`;

      // Check if exists
      const existing = await prisma.sanctionListUN.findUnique({
        where: { id: sanctionId },
      });

      if (existing) {
        await prisma.sanctionListUN.update({
          where: { id: sanctionId },
          data: {
            fullName,
            aliases,
            dob: dob || null,
            nationality: nationality || null,
            lastUpdated: new Date(),
          },
        });
      } else {
        await prisma.sanctionListUN.create({
          data: {
            id: sanctionId,
            cooperativeId,
            fullName,
            aliases,
            dob: dob || null,
            nationality: nationality || null,
            lastUpdated: new Date(),
          },
        });
      }

      imported++;
    } catch (error) {
      console.error(`Error importing line ${lineNumber}:`, error);
      skipped++;
    }
  }

  console.log(`Import complete: ${imported} imported, ${skipped} skipped`);

  // Trigger rescreening of all members
  const { rescreenAllMembersAgainstWatchlists } = await import('../src/services/aml/cron.js');
  await rescreenAllMembersAgainstWatchlists(cooperativeId);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cooperativeId = process.argv[2];
  const csvFilePath = process.argv[3];

  if (!cooperativeId || !csvFilePath) {
    console.error('Usage: tsx import-un-sanctions.ts <cooperativeId> <csvFilePath>');
    process.exit(1);
  }

  importUnSanctions(cooperativeId, csvFilePath)
    .then(() => {
      console.log('Import completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Import failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}

export { importUnSanctions };
