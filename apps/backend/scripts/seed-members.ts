/**
 * Script to seed members with full KYC for testing
 * Usage: pnpm --filter @myerp/backend seed:members [cooperativeId] [count]
 */

import dotenv from 'dotenv';
import { prisma } from '@myerp/db-schema';
import { MemberType, RiskCategory } from '@prisma/client';

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
const _relations = ['FATHER', 'MOTHER', 'SPOUSE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER'];
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

async function seedMembers(cooperativeIdentifier?: string, count: number = 20) {
  try {
    console.log('🌱 Starting member seeding process...');

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

    console.log(`Generating ${count} members...`);

    const createdMembers = [];

    for (let i = 0; i < count; i++) {
      // Mix of Individuals (80%) and Institutions (20%)
      const isInstitution = Math.random() > 0.8;
      const memberType = isInstitution ? MemberType.INSTITUTION : MemberType.INDIVIDUAL;

      // Generate basic member data
      const firstName = isInstitution ? null : sample(firstNames);
      const lastName = isInstitution ? null : sample(lastNames);
      const institutionNameKey = isInstitution ? sample(institutionNames) : null;
      const institutionName = institutionNameKey
        ? institutionNameKey + ` ${random(100, 999)}`
        : null;
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
      // All members start as 'application' status with complete KYC data
      const workflowStatus = 'application' as const;

      // Determine occupation first to use in details
      const occupation = sample(occupations);

      const member = await prisma.member.create({
        data: {
          cooperativeId: cooperativeId!,
          memberType,
          firstName,
          lastName,
          institutionName,
          fullName,
          fullNameNepali,
          email,
          phone,
          workflowStatus,
          isActive: true,
          memberNumber: null, // Members in 'application' status don't have member numbers yet
          riskCategory: RiskCategory.LOW,

          // Create KYC data
          ...(isInstitution
            ? {
                institutionKyc: {
                  create: {
                    cooperativeId: cooperativeId!,
                    name: institutionName!, // Added required name field
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
                    initialShareAmount: randomMultipleOf100(10000, 100000), // Rs. 10,000 to Rs. 100,000 (institutions typically invest more, must be multiple of 100)
                    initialSavingsAmount: random(0, 50000), // Rs. 0 to Rs. 50,000 (optional)
                    initialOtherAmount: random(1000, 2000), // Entry Fee (Prabesh Sulka) - Rs. 1,000 to Rs. 2,000
                    initialOtherSpecify: 'Entry Fee (Prabesh Sulka)',

                    // Mark as complete
                    isComplete: true,
                    completedAt: new Date(),
                    // Not approved yet - members are in 'application' status
                  },
                },
              }
            : {
                kyc: {
                  create: {
                    cooperativeId: cooperativeId!,
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
                    maritalStatus: 'MARRIED', // Default to married for better data density
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
                    // permanentDistrict: sample(districts), // Not in schema
                    permanentProvince: 'Bagmati',

                    // Temporary Address (same as permanent for 50% or different)
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
                    initialShareAmount: randomMultipleOf100(5000, 50000), // Rs. 5,000 to Rs. 50,000 (must be multiple of 100)
                    initialSavingsAmount: random(0, 20000), // Rs. 0 to Rs. 20,000 (optional)
                    initialOtherAmount: random(500, 1000), // Entry Fee (Prabesh Sulka) - Rs. 500 to Rs. 1,000
                    initialOtherSpecify: 'Entry Fee (Prabesh Sulka)',

                    // Mark as complete
                    isComplete: true,
                    completedAt: new Date(),
                    // Not approved yet - members are in 'application' status
                  },
                },
              }),
        },
      });

      createdMembers.push(member);
      process.stdout.write('.');
    }

    console.log(`\n\n✅ Successfully seeded ${createdMembers.length} members!`);
    console.log(
      'These members are in "application" status with complete KYC data (submitted, awaiting review).'
    );
    console.log(
      'You can now go to "Member Requests" or "Approvals" page to review and approve them.'
    );
  } catch (error) {
    console.error('\n❌ Error seeding members:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get args
// Usage: [cooperativeId] [count]
// - If two args: first is cooperativeId, second is count
// - If one arg: if numeric, it's count; if not numeric, it's cooperativeId
// - If no args: use defaults
const arg1 = process.argv[2];
const arg2 = process.argv[3];

const isFirstArgNumeric = arg1 && !isNaN(parseInt(arg1));
const isSecondArgNumeric = arg2 && !isNaN(parseInt(arg2));

let cooperativeIdentifier: string | undefined;
let count: number;

if (arg1 && arg2) {
  // Two args provided: first is cooperativeId, second is count (per documented usage)
  cooperativeIdentifier = arg1;
  count = isSecondArgNumeric ? parseInt(arg2) : 20;
} else if (arg1) {
  // Only one arg provided
  if (isFirstArgNumeric) {
    // Numeric: treat as count
    cooperativeIdentifier = undefined;
    count = parseInt(arg1);
  } else {
    // Non-numeric: treat as cooperative identifier
    cooperativeIdentifier = arg1;
    count = 20;
  }
} else {
  // No args provided, use defaults
  cooperativeIdentifier = undefined;
  count = 20;
}

if (cooperativeIdentifier) {
  seedMembers(cooperativeIdentifier, count);
} else {
  seedMembers(undefined, count);
}
