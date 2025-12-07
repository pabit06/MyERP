/**
 * Script to seed Darta and Chalani records with full data
 * Usage: pnpm --filter @myerp/backend seed:darta-chalani [cooperativeId] [dartaCount] [chalaniCount]
 */

import dotenv from 'dotenv';
import { prisma } from '@myerp/db-schema';
import {
  DartaStatus,
  DocumentPriority,
  DartaCategory,
  ChalaniType,
  ChalaniStatus,
  ChalaniCategory,
  DartaMovementType,
  ChalaniActionType,
} from '@prisma/client';
import type { FiscalYearRange } from '../src/lib/nepali-fiscal-year.js';

// Simple fiscal year calculation (avoiding NepaliDate import issues in scripts)
function getFiscalYearForDate(date: Date): {
  bsYear: number;
  startDate: Date;
  endDate: Date;
  label: string;
} {
  // Approximate: Fiscal year starts around mid-July (Shrawan 1)
  // For simplicity, we'll use current year as base
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-11

  // If month is before July (month 6), fiscal year started previous year
  let fiscalYearStart: Date;
  if (month < 6) {
    // Before July - fiscal year started in previous year
    fiscalYearStart = new Date(year - 1, 6, 15); // Approx July 15 of previous year
  } else {
    // July or later - fiscal year started this year
    fiscalYearStart = new Date(year, 6, 15); // Approx July 15 of this year
  }

  const fiscalYearEnd = new Date(fiscalYearStart.getFullYear() + 1, 6, 14); // Approx July 14 next year

  // Approximate BS year (AD year + 57)
  const bsYear = fiscalYearStart.getFullYear() + 57;

  return {
    bsYear,
    startDate: fiscalYearStart,
    endDate: fiscalYearEnd,
    label: `${bsYear}/${String(bsYear + 1).slice(-2)}`,
  };
}

// Load environment variables
dotenv.config();

// Helper functions
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const sample = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Sample data
const senderOrganizations = [
  'नेपाल सरकार - वित्त मन्त्रालय',
  'नेपाल राष्ट्र बैंक',
  'काठमाडौँ महानगरपालिका',
  'ललितपुर महानगरपालिका',
  'भक्तपुर नगरपालिका',
  'सहकारी तथा ग्रामिण विकास मन्त्रालय',
  'Western Union Nepal',
  'Nepal Telecom',
  'Nepal Electricity Authority',
  'Department of Cooperatives',
  'सहकारी संघ',
  'बैंकिङ संघ',
];

const receiverOrganizations = [
  'नेपाल सरकार - वित्त मन्त्रालय',
  'नेपाल राष्ट्र बैंक',
  'काठमाडौँ महानगरपालिका',
  'Department of Cooperatives',
  'सहकारी संघ',
  'Member - राम श्रेष्ठ',
  'Member - सीता महर्जन',
  'Member - हरि तामाङ',
  'Member - गीता गुरुङ',
];

const dartaSubjects = [
  'ऋण माग फारम बारे',
  'खाता बन्द गर्ने बारे',
  'स्टेटमेन्ट माग',
  'सदस्यता निवेदन',
  'सरकारी निर्देशन',
  'नियमावली अपडेट',
  'अडिट रिपोर्ट',
  'वित्तीय विवरण',
  'बैठक निमन्त्रणा',
  'कानुनी कागजात',
];

const chalaniSubjects = [
  'ऋण स्वीकृति पत्र',
  'खाता बन्द गर्ने जवाफ',
  'स्टेटमेन्ट पठाइएको',
  'सदस्यता स्वीकृति',
  'सरकारी जवाफ',
  'नियमावली अपडेट जानकारी',
  'अडिट रिपोर्ट पठाइएको',
  'वित्तीय विवरण पठाइएको',
  'बैठक निमन्त्रणा',
  'कानुनी जवाफ',
];

const addresses = [
  'काठमाडौँ, नेपाल',
  'ललितपुर, नेपाल',
  'भक्तपुर, नेपाल',
  'पोखरा, नेपाल',
  'चितवन, नेपाल',
  'बुटवल, नेपाल',
];

// Get next serial number by counting existing records in fiscal year
async function getNextSerialNo(
  cooperativeId: string,
  fiscalYear: string,
  type: 'darta' | 'chalani',
  fiscalYearStart: Date
): Promise<number> {
  // Count existing records in this fiscal year (using createdAt date range)
  const count =
    type === 'darta'
      ? await prisma.darta.count({
          where: {
            cooperativeId,
            createdAt: {
              gte: fiscalYearStart,
            },
          },
        })
      : await prisma.patraChalani.count({
          where: {
            cooperativeId,
            createdAt: {
              gte: fiscalYearStart,
            },
          },
        });

  return count + 1;
}

// Generate darta number
function formatDartaNumber(fiscalYear: string, serialNo: number): string {
  const yearShort = fiscalYear.split('/')[0].slice(-2);
  return `D-${yearShort}/${fiscalYear.split('/')[1]}-${String(serialNo).padStart(3, '0')}`;
}

// Generate chalani number
function formatChalaniNumber(fiscalYear: string, serialNo: number): string {
  const yearShort = fiscalYear.split('/')[0].slice(-2);
  return `C-${yearShort}/${fiscalYear.split('/')[1]}-${String(serialNo).padStart(3, '0')}`;
}

// Generate random date within last 90 days
function randomRecentDate(): Date {
  const now = new Date();
  const daysAgo = random(0, 90);
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date;
}

// Generate random date in a specific fiscal year
function _randomDateInFiscalYear(fiscalYear: FiscalYearRange): Date {
  const start = fiscalYear.startDate.getTime();
  const end = Math.min(fiscalYear.endDate.getTime(), Date.now());
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime);
}

async function seedDartaChalani(
  cooperativeId: string,
  dartaCount: number = 20,
  chalaniCount: number = 15
) {
  console.log(`\n🌱 Seeding Darta and Chalani for Cooperative: ${cooperativeId}`);
  console.log(`   Darta: ${dartaCount} records`);
  console.log(`   Chalani: ${chalaniCount} records\n`);

  // Get a user to assign as creator
  const user = await prisma.user.findFirst({
    where: { cooperativeId },
  });

  if (!user) {
    throw new Error(`No user found for cooperative ${cooperativeId}`);
  }

  // Note: We'll calculate fiscal year per record based on receivedDate

  // Seed Darta records
  console.log('📥 Creating Darta records...');
  const createdDartas = [];

  for (let i = 0; i < dartaCount; i++) {
    const receivedDate = randomRecentDate();
    const fiscalYear = getFiscalYearForDate(receivedDate);
    // Use shortened format (2-digit/2-digit) to match frontend format (e.g., "081/082")
    const fiscalYearStr = `${String(fiscalYear.bsYear).slice(-2)}/${String(fiscalYear.bsYear + 1).slice(-2)}`;

    const serialNo = await getNextSerialNo(
      cooperativeId,
      fiscalYearStr,
      'darta',
      fiscalYear.startDate
    );
    const dartaNumber = formatDartaNumber(fiscalYearStr, serialNo);

    const senderName = sample(senderOrganizations);
    const subject = sample(dartaSubjects);
    const category = sample([
      DartaCategory.GOVERNMENT_NOTICE,
      DartaCategory.LOAN_REQUEST,
      DartaCategory.MEMBER_APPLICATION,
      DartaCategory.COMPLAINT,
      DartaCategory.LEGAL_DOCUMENT,
      DartaCategory.FINANCIAL_REPORT,
      DartaCategory.OTHER,
    ]);

    const status = sample([
      DartaStatus.ACTIVE,
      DartaStatus.PROCESSING,
      DartaStatus.COMPLETED,
      DartaStatus.ARCHIVED,
    ]);

    const priority = sample([
      DocumentPriority.LOW,
      DocumentPriority.NORMAL,
      DocumentPriority.HIGH,
      DocumentPriority.URGENT,
    ]);

    // Create darta with fields that exist in current schema
    const darta = await prisma.darta.create({
      data: {
        cooperativeId,
        fiscalYear: fiscalYearStr,
        serialNo,
        dartaNumber,
        title: `${subject} - ${senderName}`,
        subject: subject || null,
        description: `प्राप्त पत्रको विवरण: ${subject}। यो पत्र ${senderName} बाट प्राप्त भएको हो।`,
        category: category || null,
        status: status || DartaStatus.ACTIVE,
        priority: priority || DocumentPriority.NORMAL,
        senderName: senderName,
        receivedDate: receivedDate,
        remarks: random(1, 100) > 50 ? 'कैफियत: यो पत्र सम्बन्धित विभागमा पठाइएको छ।' : null,
        createdBy: user.id,
      },
    });

    // Create initial movement
    await prisma.dartaMovement.create({
      data: {
        dartaId: darta.id,
        cooperativeId,
        movementType: DartaMovementType.CREATE,
        movedBy: user.id,
        remarks: 'Initial registration',
      },
    });

    // Sometimes add additional movements
    if (random(1, 100) > 60) {
      await prisma.dartaMovement.create({
        data: {
          dartaId: darta.id,
          cooperativeId,
          movementType: sample([DartaMovementType.FORWARD, DartaMovementType.TRANSFER]),
          fromDepartment: 'Reception',
          toDepartment: sample(['Loan Department', 'Account Department', 'Management']),
          movedBy: user.id,
          remarks: 'Forwarded for processing',
        },
      });
    }

    createdDartas.push(darta);
    if ((i + 1) % 5 === 0) {
      console.log(`   ✓ Created ${i + 1}/${dartaCount} Darta records`);
    }
  }

  console.log(`   ✅ Created ${dartaCount} Darta records\n`);

  // Seed Chalani records
  console.log('📤 Creating Chalani records...');
  const createdChalanis = [];

  for (let i = 0; i < chalaniCount; i++) {
    const letterDate = randomRecentDate();
    const fiscalYear = getFiscalYearForDate(letterDate);
    // Use shortened format (2-digit/2-digit) to match frontend format (e.g., "081/082")
    const fiscalYearStr = `${String(fiscalYear.bsYear).slice(-2)}/${String(fiscalYear.bsYear + 1).slice(-2)}`;

    const serialNo = await getNextSerialNo(
      cooperativeId,
      fiscalYearStr,
      'chalani',
      fiscalYear.startDate
    );
    const chalaniNumber = formatChalaniNumber(fiscalYearStr, serialNo);

    const receiverName = sample(receiverOrganizations);
    const subject = sample(chalaniSubjects);
    const type = sample([ChalaniType.OUTGOING, ChalaniType.INTERNAL]);

    const category = sample([
      ChalaniCategory.OFFICIAL_CORRESPONDENCE,
      ChalaniCategory.MEMBER_COMMUNICATION,
      ChalaniCategory.GOVERNMENT_REPLY,
      ChalaniCategory.INTERNAL_MEMO,
      ChalaniCategory.FINANCIAL_DOCUMENT,
      ChalaniCategory.OTHER,
    ]);

    const status = sample([
      ChalaniStatus.DRAFT,
      ChalaniStatus.PENDING,
      ChalaniStatus.IN_PROGRESS,
      ChalaniStatus.APPROVED,
      ChalaniStatus.SENT,
      ChalaniStatus.COMPLETED,
    ]);

    const priority = sample([
      DocumentPriority.LOW,
      DocumentPriority.NORMAL,
      DocumentPriority.HIGH,
      DocumentPriority.URGENT,
    ]);

    // Sometimes link to a Darta (reply)
    const replyToDarta =
      random(1, 100) > 70 && createdDartas.length > 0 ? sample(createdDartas) : null;

    // Create chalani with fields that exist in current schema
    const chalani = await prisma.patraChalani.create({
      data: {
        cooperativeId,
        fiscalYear: fiscalYearStr,
        serialNo,
        chalaniNumber,
        type,
        subject,
        content: `पत्रको ब्यहोरा: ${subject}। यो पत्र ${receiverName} लाई पठाइएको छ।`,
        receiverName: receiverName,
        receiverAddress: sample(addresses),
        senderName: 'भञ्ज्याङ बचत तथा ऋण सहकारी संस्था',
        senderAddress: 'काठमाडौँ, नेपाल',
        date: letterDate,
        sentDate:
          status === ChalaniStatus.SENT || status === ChalaniStatus.COMPLETED
            ? new Date(letterDate.getTime() + random(0, 3) * 24 * 60 * 60 * 1000)
            : null,
        transportMode: sample(['Email', 'Post Office', 'By Hand', 'Courier']),
        bodhartha: random(1, 100) > 60 ? 'बोधार्थ: प्रबन्ध समिति, लेखा विभाग' : null,
        status: status,
        priority: priority || DocumentPriority.NORMAL,
        category: category || null,
        patraNumber: random(1, 100) > 80 ? `PATRA-${random(1000, 9999)}` : null,
        replyToDartaId: replyToDarta?.id || null,
        remarks:
          random(1, 100) > 50 ? 'Remarks: Important document, please handle with care.' : null,
        createdBy: user.id,
      },
    });

    // Create initial action
    await prisma.patraChalaniAction.create({
      data: {
        patraChalaniId: chalani.id,
        cooperativeId,
        actionType: ChalaniActionType.FORWARD,
        actionBy: user.id,
        remarks: 'Initial creation',
      },
    });

    // Sometimes add additional actions
    if (random(1, 100) > 60) {
      await prisma.patraChalaniAction.create({
        data: {
          patraChalaniId: chalani.id,
          cooperativeId,
          actionType: sample([ChalaniActionType.APPROVE, ChalaniActionType.NOTE]),
          actionBy: user.id,
          remarks: 'Reviewed and approved',
        },
      });
    }

    createdChalanis.push(chalani);
    if ((i + 1) % 5 === 0) {
      console.log(`   ✓ Created ${i + 1}/${chalaniCount} Chalani records`);
    }
  }

  console.log(`   ✅ Created ${chalaniCount} Chalani records\n`);

  // Summary
  console.log('📊 Seeding Summary:');
  console.log(`   ✅ Darta: ${dartaCount} records`);
  console.log(`   ✅ Chalani: ${chalaniCount} records`);
  console.log(`   ✅ Movements: Created for all Darta`);
  console.log(`   ✅ Actions: Created for all Chalani`);
  console.log(
    `   ✅ Linked: ${createdChalanis.filter((c) => c.replyToDartaId).length} Chalani linked to Darta\n`
  );
}

// Main execution
async function main() {
  try {
    const args = process.argv.slice(2);
    let cooperativeIdentifier: string | undefined = args[0];
    let dartaCount = 20;
    let chalaniCount = 15;

    // Parse arguments - handle different formats
    // Format: [cooperativeId] [dartaCount] [chalaniCount]
    // If first arg is a number, treat as count (no cooperative specified)
    if (args.length === 0) {
      // No args - use defaults
      cooperativeIdentifier = undefined;
    } else if (args.length === 1) {
      // One arg - could be cooperative ID or count
      if (!isNaN(parseInt(args[0])) && /^\d+$/.test(args[0])) {
        // It's a pure number, treat as darta count
        dartaCount = parseInt(args[0]);
        cooperativeIdentifier = undefined;
      } else {
        // It's a cooperative identifier
        cooperativeIdentifier = args[0];
      }
    } else if (args.length === 2) {
      // Two args
      if (!isNaN(parseInt(args[0])) && /^\d+$/.test(args[0])) {
        // First is number - treat as counts (no cooperative)
        dartaCount = parseInt(args[0]);
        chalaniCount = parseInt(args[1]);
        cooperativeIdentifier = undefined;
      } else {
        // First is cooperative ID, second is darta count
        cooperativeIdentifier = args[0];
        dartaCount = parseInt(args[1]);
      }
    } else {
      // Three args - all specified: cooperative ID, darta count, chalani count
      cooperativeIdentifier = args[0];
      dartaCount = parseInt(args[1]);
      chalaniCount = parseInt(args[2]);
    }

    // Resolve cooperative ID
    let cooperativeId: string | undefined;

    if (cooperativeIdentifier) {
      // Try to find by subdomain first
      const cooperative = await prisma.cooperative.findUnique({
        where: { subdomain: cooperativeIdentifier },
        select: { id: true, name: true },
      });

      if (cooperative) {
        cooperativeId = cooperative.id;
        console.log(`Found cooperative: ${cooperative.name}`);
      } else {
        // Try by ID
        const cooperativeById = await prisma.cooperative.findUnique({
          where: { id: cooperativeIdentifier },
          select: { id: true, name: true },
        });
        if (cooperativeById) {
          cooperativeId = cooperativeById.id;
          console.log(`Found cooperative: ${cooperativeById.name}`);
        } else {
          console.error(`❌ Cooperative not found: ${cooperativeIdentifier}`);
          process.exit(1);
        }
      }
    } else {
      // Default to first cooperative if not provided
      const firstCoop = await prisma.cooperative.findFirst({
        select: { id: true, name: true },
      });
      if (!firstCoop) {
        console.error('❌ No cooperatives found in database');
        process.exit(1);
      }
      cooperativeId = firstCoop.id;
      console.log(`Using first cooperative: ${firstCoop.name}`);
    }

    // Run seeding
    await seedDartaChalani(cooperativeId, dartaCount, chalaniCount);
    console.log('✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
