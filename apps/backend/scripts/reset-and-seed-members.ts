/**
 * Script to delete all members and reseed with fresh data
 * WARNING: This is a destructive operation that will permanently delete:
 * - All members
 * - All member numbers
 * - All related data (savings, loans, shares, KYC, documents, etc.)
 * - All related journal entries and ledger entries
 *
 * Usage: pnpm --filter @myerp/backend reset:members [cooperativeId] [count] [--all-journals]
 * Or: tsx apps/backend/scripts/reset-and-seed-members.ts [cooperativeId] [count] [--all-journals]
 *
 * If --all-journals flag is provided, it will delete ALL journal entries for the cooperative
 * (useful for a complete fresh start, but use with caution!)
 */

import dotenv from 'dotenv';
import { prisma } from '@myerp/db-schema';
import { MemberType, RiskCategory } from '@prisma/client';
import { postEntryFee, postAdvancePayment } from '../src/services/accounting.js';

// Load environment variables
dotenv.config();

// Helper to generate random number between min and max
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

// Helper to generate random number divisible by 100 (for share amounts)
const randomMultipleOf100 = (min: number, max: number) => {
  const minMultiple = Math.ceil(min / 100) * 100;
  const maxMultiple = Math.floor(max / 100) * 100;
  const randomMultiple = random(minMultiple / 100, maxMultiple / 100);
  return randomMultiple * 100;
};

// Helper to get random array element
const sample = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Data for generation
const firstNames = [
  'Ram',
  'Sita',
  'Hari',
  'Gita',
  'Shyam',
  'Rita',
  'Krishna',
  'Radha',
  'Bishnu',
  'Laxmi',
  'Suresh',
  'Saraswati',
  'Mahesh',
  'Parbati',
  'Ganesh',
  'Durga',
  'Ramesh',
  'Mina',
  'Santosh',
  'Anju',
];
const lastNames = [
  'Shrestha',
  'Maharjan',
  'Tamang',
  'Gurung',
  'Rai',
  'Limbu',
  'Thapa',
  'Magar',
  'Bhandari',
  'Khatri',
  'Adhikari',
  'Sharma',
  'Ghimire',
  'Dahal',
  'Poudel',
  'Karki',
  'Basnet',
  'Acharya',
  'Joshi',
  'Bista',
];
const institutionNames = [
  'Namaste Traders',
  'Kathmandu Suppliers',
  'Himalayan Agro Pvt Ltd',
  'Everest Constructions',
  'Lumbini Tech House',
  'Pokhara Foods',
  'Nepal Herbal Processing',
  'Gorkha Security Services',
  'Chitwan Dairy Industries',
  'Butwal Fabrics',
];

// Nepali Names Mapping (Simplified for seeding)
const nepaliFirstNames: Record<string, string> = {
  Ram: 'राम',
  Sita: 'सीता',
  Hari: 'हरि',
  Gita: 'गीता',
  Shyam: 'श्याम',
  Rita: 'रीता',
  Krishna: 'कृष्ण',
  Radha: 'राधा',
  Bishnu: 'विष्णु',
  Laxmi: 'लक्ष्मी',
  Suresh: 'सुरेश',
  Saraswati: 'सरस्वती',
  Mahesh: 'महेश',
  Parbati: 'पार्वती',
  Ganesh: 'गणेश',
  Durga: 'दुर्गा',
  Ramesh: 'रमेश',
  Mina: 'मिना',
  Santosh: 'सन्तोष',
  Anju: 'अन्जु',
};
const nepaliLastNames: Record<string, string> = {
  Shrestha: 'श्रेष्ठ',
  Maharjan: 'महर्जन',
  Tamang: 'तामाङ',
  Gurung: 'गुरुङ',
  Rai: 'राई',
  Limbu: 'लिम्बु',
  Thapa: 'थापा',
  Magar: 'मगर',
  Bhandari: 'भण्डारी',
  Khatri: 'खत्री',
  Adhikari: 'अधिकारी',
  Sharma: 'शर्मा',
  Ghimire: 'घिमिरे',
  Dahal: 'दाहाल',
  Poudel: 'पौडेल',
  Karki: 'कार्की',
  Basnet: 'बस्नेत',
  Acharya: 'आचार्य',
  Joshi: 'जोशी',
  Bista: 'बिष्ट',
};
const nepaliInstitutionNames: Record<string, string> = {
  'Namaste Traders': 'नमस्ते ट्रेडर्स',
  'Kathmandu Suppliers': 'काठमाडौँ सप्लायर्स',
  'Himalayan Agro Pvt Ltd': 'हिमालयन एग्रो प्रा. लि.',
  'Everest Constructions': 'एभरेष्ट कन्स्ट्रक्सन',
  'Lumbini Tech House': 'लुम्बिनी टेक हाउस',
  'Pokhara Foods': 'पोखरा फुड्स',
  'Nepal Herbal Processing': 'नेपाल हर्वल प्रोसेसिङ',
  'Gorkha Security Services': 'गोरखा सेक्युरिटी सर्भिस',
  'Chitwan Dairy Industries': 'चितवन डेरी उद्योग',
  'Butwal Fabrics': 'बुटवल फ्याब्रिक्स',
};

const districts = [
  'Kathmandu',
  'Lalitpur',
  'Bhaktapur',
  'Kaski',
  'Chitwan',
  'Rupandehi',
  'Morang',
  'Sunsari',
  'Jhapa',
  'Banke',
];
const municipalities = [
  'Kathmandu Metro',
  'Lalitpur Metro',
  'Bhaktapur',
  'Pokhara Metro',
  'Bharatpur Metro',
  'Butwal',
  'Biratnagar Metro',
  'Dharan',
  'Birtamod',
  'Nepalgunj',
];
const occupations = [
  'BUSINESS',
  'SERVICE',
  'AGRICULTURE',
  'STUDENT',
  'HOUSEWIFE',
  'RETIRED',
  'OTHERS',
];
const occupationDetails = {
  BUSINESS: ['Retail Shop', 'Wholesale', 'Manufacturing', 'Import/Export', 'Restaurant'],
  SERVICE: ['Teacher', 'Government Officer', 'Banker', 'Nurse', 'Engineer'],
  AGRICULTURE: ['Farming', 'Livestock', 'Vegetable Farming', 'Poultry'],
  STUDENT: ['School Level', 'Bachelor Level', 'Master Level'],
  HOUSEWIFE: ['Household Management'],
  RETIRED: ['Pensioner', 'Social Security'],
  OTHERS: ['Freelancer', 'Artist', 'Driver'],
};
const relations = ['FATHER', 'MOTHER', 'SPOUSE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER'];
const familyTypes = ['JOINT_ONE_KITCHEN', 'JOINT_SEPARATE_KITCHEN', 'NUCLEAR'];
const incomeRanges = ['BELOW_2_LAKH', '2_TO_5_LAKH', '5_TO_10_LAKH', 'ABOVE_10_LAKH'];
const villageToles = [
  'Galkopakha',
  'Naya Bazar',
  'Thamel',
  'Lazimpat',
  'Kalanki',
  'Banasthali',
  'Balaju',
  'Swoyambhu',
];

async function deleteAllMembers(cooperativeId?: string, deleteAllJournals: boolean = false) {
  console.log('🗑️  Deleting all members...');

  const whereClause: any = cooperativeId ? { cooperativeId } : {};

  // Count members before deletion
  const memberCount = await prisma.member.count({
    where: whereClause,
  });

  console.log(`Found ${memberCount} member(s) to delete`);

  if (memberCount === 0) {
    console.log('No members found to delete.');
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
  const shareTransactions = await prisma.shareTransaction.findMany({
    where: whereClause,
    select: {
      id: true,
      journalId: true,
    },
  });

  const shareJournalIds = shareTransactions
    .map((st) => st.journalId)
    .filter((id): id is string => id !== null && id !== undefined);

  console.log(
    `Found ${shareJournalIds.length} journal entry/entries related to share transactions`
  );

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

  const memberRelatedJournalEntries =
    orConditions.length > 0
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
  console.log(
    `Found ${memberRelatedJournalIds.length} journal entry/entries related to members (by description)`
  );

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
    console.log(
      '\n⚠️  --all-journals flag detected: Deleting ALL journal entries for this cooperative...'
    );

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

  console.log(`✅ Successfully deleted ${result.count} member(s)`);
  console.log('Deleted data includes:');
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
  console.log('- All related transactions and records\n');
}

async function seedMembers(cooperativeId: string, count: number = 20) {
  console.log(`🌱 Seeding ${count} new members...\n`);

  const createdMembers = [];

  for (let i = 0; i < count; i++) {
    // Mix of Individuals (80%) and Institutions (20%)
    const isInstitution = Math.random() > 0.8;
    const memberType = isInstitution ? MemberType.INSTITUTION : MemberType.INDIVIDUAL;

    // Generate basic member data
    const firstName = isInstitution ? null : sample(firstNames);
    const lastName = isInstitution ? null : sample(lastNames);
    const institutionNameKey = isInstitution ? sample(institutionNames) : null;
    const institutionName = institutionNameKey ? institutionNameKey + ` ${random(100, 999)}` : null;
    const fullName = isInstitution ? institutionName! : `${firstName} ${lastName}`.toUpperCase();

    // Generate Nepali Name
    let fullNameNepali = '';
    if (isInstitution && institutionNameKey) {
      fullNameNepali = nepaliInstitutionNames[institutionNameKey] || institutionNameKey;
    } else if (firstName && lastName) {
      fullNameNepali = `${nepaliFirstNames[firstName] || firstName} ${nepaliLastNames[lastName] || lastName}`;
    }

    const email = `user${Date.now()}${i}@example.com`;
    const phone = `98${random(0, 9)}${random(1000000, 9999999)}`;

    // Status: application (submitted, waiting for review)
    const workflowStatus = 'application';

    // Determine occupation first to use in details
    const occupation = sample(occupations);

    const member = await prisma.member.create({
      data: {
        cooperativeId: cooperativeId,
        memberType,
        firstName,
        lastName,
        institutionName,
        fullName,
        fullNameNepali,
        email,
        phone,
        workflowStatus,
        isActive: false,
        memberNumber: null,
        riskCategory: RiskCategory.LOW,

        // Create KYC data
        ...(isInstitution
          ? {
              institutionKyc: {
                create: {
                  cooperativeId: cooperativeId,
                  name: institutionName!,
                  registrationNo: `REG-${random(10000, 99999)}`,
                  registrationDate: new Date(Date.now() - random(10000000000, 50000000000)),
                  panVatRegistrationNo: `${random(100000000, 999999999)}`,
                  headOfficeAddress: `${sample(municipalities)}, ${sample(districts)}`,
                  branchLocations: JSON.stringify([
                    `${sample(municipalities)}`,
                    `${sample(municipalities)}`,
                  ]),
                  numberOfBranches: random(1, 5),
                  mainObjective: 'Financial Services',
                  natureOfBusiness: 'Service',
                  workingArea: sample(districts),

                  // Financial Transaction Details - Required for approval
                  initialShareAmount: randomMultipleOf100(10000, 100000),
                  initialSavingsAmount: random(0, 50000),
                  initialOtherAmount: random(1000, 2000),
                  initialOtherSpecify: 'Entry Fee (Prabesh Sulka)',

                  // Mark as complete
                  isComplete: true,
                  completedAt: new Date(),
                },
              },
            }
          : {
              kyc: {
                create: {
                  cooperativeId: cooperativeId,
                  // Generate date of birth: 16-50 years old (minimum age requirement)
                  // 16 years = 16 * 365.25 * 24 * 60 * 60 * 1000 = 504,921,600,000 ms
                  // 50 years = 50 * 365.25 * 24 * 60 * 60 * 1000 = 1,577,880,000,000 ms
                  dateOfBirth: new Date(Date.now() - random(504921600000, 1577880000000)), // 16-50 years old
                  gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                  nationality: 'Nepali',
                  citizenshipNumber: `${random(10, 99)}-${random(0, 99)}-${random(1000, 9999)}`,
                  citizenshipIssuingDistrict: sample(districts),
                  fatherName: `${sample(firstNames)} ${sample(lastNames)}`,
                  motherName: `${sample(firstNames)} ${sample(lastNames)}`,
                  grandfatherName: `${sample(firstNames)} ${sample(lastNames)}`,
                  maritalStatus: 'MARRIED',
                  occupation: occupation,
                  occupationSpecify: sample(
                    occupationDetails[occupation as keyof typeof occupationDetails] || ['Others']
                  ),
                  spouseName:
                    Math.random() > 0.3 ? `${sample(firstNames)} ${sample(lastNames)}` : null,
                  spouseSurname: sample(lastNames),
                  spouseOccupation: sample(occupations),
                  annualFamilyIncome: sample(incomeRanges),
                  familyType: sample(familyTypes),

                  permanentMunicipality: sample(municipalities),
                  permanentWard: `${random(1, 32)}`,
                  permanentVillageTole: sample(villageToles),
                  permanentHouseNo: `${random(100, 9999)}`,
                  permanentProvince: 'Bagmati',

                  temporaryMunicipality: sample(municipalities),
                  temporaryWard: `${random(1, 32)}`,
                  temporaryVillageTole: sample(villageToles),
                  temporaryHouseNo: `${random(100, 9999)}`,
                  temporaryProvince: 'Bagmati',
                  residenceType: 'PERMANENT',
                  residenceDuration: '10',

                  contactNo: phone,
                  emailId: email,

                  // Financial Transaction Details - Required for approval
                  initialShareAmount: randomMultipleOf100(5000, 50000),
                  initialSavingsAmount: random(0, 20000),
                  initialOtherAmount: random(500, 1000),
                  initialOtherSpecify: 'Entry Fee (Prabesh Sulka)',

                  // Mark as complete
                  isComplete: true,
                  completedAt: new Date(),
                },
              },
            }),
      },
    });

    createdMembers.push(member);

    // Post entry fee and advance payment for seeded members (simulating KYC submission)
    try {
      const kycData = isInstitution
        ? await prisma.institutionKYC.findUnique({ where: { memberId: member.id } })
        : await prisma.memberKYC.findUnique({ where: { memberId: member.id } });

      if (kycData) {
        const initialShareAmount = kycData.initialShareAmount
          ? Number(kycData.initialShareAmount)
          : 0;
        const initialSavingsAmount = kycData.initialSavingsAmount
          ? Number(kycData.initialSavingsAmount)
          : 0;
        const entryFeeAmount = kycData.initialOtherAmount ? Number(kycData.initialOtherAmount) : 0;
        const advanceAmount = initialShareAmount + initialSavingsAmount;

        // Post entry fee (non-refundable, posted when application submitted)
        if (entryFeeAmount > 0) {
          const tempMemberId = `TEMP-${member.id.substring(0, 8)}`;
          await postEntryFee(cooperativeId, entryFeeAmount, member.id, tempMemberId, new Date());
        }

        // Post advance payment (refundable if rejected, posted when application submitted)
        if (advanceAmount > 0) {
          const memberName =
            member.fullName ||
            member.institutionName ||
            `${member.firstName} ${member.lastName}`.trim() ||
            'Unknown';
          await postAdvancePayment(cooperativeId, advanceAmount, member.id, memberName, new Date());
        }
      }
    } catch (paymentError) {
      console.error(`\n⚠️  Error posting payments for seeded member ${member.id}:`, paymentError);
      // Continue seeding other members even if payment posting fails
    }

    process.stdout.write('.');
  }

  console.log(`\n\n✅ Successfully seeded ${createdMembers.length} members!`);
  console.log(
    'These members are in "application" status with complete KYC data (submitted, awaiting review).'
  );
  console.log('Entry fees and advance payments have been posted to the ledger.');
  console.log(
    'You can now go to "Member Requests" or "Approvals" page to review and approve them.'
  );
}

async function resetAndSeed(
  cooperativeIdentifier?: string,
  count: number = 20,
  deleteAllJournals: boolean = false
) {
  try {
    console.log('🔄 Starting reset and seed process...\n');

    let cooperativeId: string | undefined;

    // 1. Resolve Cooperative ID
    if (cooperativeIdentifier) {
      const cooperative = await prisma.cooperative.findUnique({
        where: { subdomain: cooperativeIdentifier },
        select: { id: true, name: true },
      });

      if (cooperative) {
        cooperativeId = cooperative.id;
        console.log(`Found cooperative: ${cooperative.name}`);
      } else {
        const cooperativeById = await prisma.cooperative.findUnique({
          where: { id: cooperativeIdentifier },
          select: { id: true, name: true },
        });
        if (cooperativeById) {
          cooperativeId = cooperativeById.id;
          console.log(`Found cooperative: ${cooperativeById.name}`);
        } else {
          console.error(`❌ Cooperative not found: ${cooperativeIdentifier}`);
          return;
        }
      }
    } else {
      // Default to first cooperative if not provided
      const firstCoop = await prisma.cooperative.findFirst();
      if (!firstCoop) {
        console.error('❌ No cooperatives found in database');
        return;
      }
      cooperativeId = firstCoop.id;
      console.log(`Using first cooperative: ${firstCoop.name}`);
    }

    console.log(`Cooperative ID: ${cooperativeId}\n`);

    // 2. Delete all members
    await deleteAllMembers(cooperativeId, deleteAllJournals);

    // 3. Seed new members
    await seedMembers(cooperativeId, count);

    console.log('\n✅ Reset and seed process completed successfully!');
  } catch (error) {
    console.error('\n❌ Error during reset and seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Get args
const cooperativeIdentifier = process.argv[2];
const count = process.argv[3] ? parseInt(process.argv[3]) : 20;
const deleteAllJournals = process.argv.includes('--all-journals');

if (cooperativeIdentifier) {
  resetAndSeed(cooperativeIdentifier, count, deleteAllJournals)
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
} else {
  console.log(
    '⚠️  WARNING: No cooperative identifier provided. This will delete ALL members from ALL cooperatives!'
  );
  console.log(
    'Usage: npx tsx apps/backend/scripts/reset-and-seed-members.ts <cooperativeIdentifier> [count]'
  );
  console.log('\nIf you want to proceed, run without arguments (not recommended for production)');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');

  setTimeout(() => {
    resetAndSeed(undefined, count, deleteAllJournals)
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
