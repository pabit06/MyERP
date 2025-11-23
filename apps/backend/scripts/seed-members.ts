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
const firstNames = ['Ram', 'Sita', 'Hari', 'Gita', 'Shyam', 'Rita', 'Krishna', 'Radha', 'Bishnu', 'Laxmi', 'Suresh', 'Saraswati', 'Mahesh', 'Parbati', 'Ganesh', 'Durga', 'Ramesh', 'Mina', 'Santosh', 'Anju'];
const lastNames = ['Shrestha', 'Maharjan', 'Tamang', 'Gurung', 'Rai', 'Limbu', 'Thapa', 'Magar', 'Bhandari', 'Khatri', 'Adhikari', 'Sharma', 'Ghimire', 'Dahal', 'Poudel', 'Karki', 'Basnet', 'Acharya', 'Joshi', 'Bista'];
const institutionNames = ['Namaste Traders', 'Kathmandu Suppliers', 'Himalayan Agro Pvt Ltd', 'Everest Constructions', 'Lumbini Tech House', 'Pokhara Foods', 'Nepal Herbal Processing', 'Gorkha Security Services', 'Chitwan Dairy Industries', 'Butwal Fabrics'];
const districts = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kaski', 'Chitwan', 'Rupandehi', 'Morang', 'Sunsari', 'Jhapa', 'Banke'];
const municipalities = ['Kathmandu Metro', 'Lalitpur Metro', 'Bhaktapur', 'Pokhara Metro', 'Bharatpur Metro', 'Butwal', 'Biratnagar Metro', 'Dharan', 'Birtamod', 'Nepalgunj'];
const occupations = ['BUSINESS', 'SERVICE', 'AGRICULTURE', 'STUDENT', 'HOUSEWIFE', 'RETIRED', 'OTHERS'];
const relations = ['FATHER', 'MOTHER', 'SPOUSE', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER'];

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
      const institutionName = isInstitution ? sample(institutionNames) + ` ${random(100, 999)}` : null;
      const fullName = isInstitution ? institutionName! : `${firstName} ${lastName}`.toUpperCase();
      const email = `user${Date.now()}${i}@example.com`;
      const phone = `98${random(0, 9)}${random(1000000, 9999999)}`;
      
      // Status: application (submitted, waiting for review)
      // All members start as 'application' status with complete KYC data
      const workflowStatus = 'application';

      const member = await prisma.member.create({
        data: {
          cooperativeId: cooperativeId!,
          memberType,
          firstName,
          lastName,
          institutionName,
          fullName,
          email,
          phone,
          workflowStatus,
          isActive: true,
          memberNumber: workflowStatus === 'approved' ? `${random(1000, 9999)}` : null,
          riskCategory: RiskCategory.LOW,
          
          // Create KYC data
          ...(isInstitution ? {
             institutionKyc: {
               create: {
                 cooperativeId: cooperativeId!,
                 name: institutionName!, // Added required name field
                 registrationNo: `REG-${random(10000, 99999)}`,
                 registrationDate: new Date(Date.now() - random(10000000000, 50000000000)),
                 panVatRegistrationNo: `${random(100000000, 999999999)}`,
                 headOfficeAddress: `${sample(municipalities)}, ${sample(districts)}`,
                 // contactPersonName: `${sample(firstNames)} ${sample(lastNames)}`,
                 // contactPersonPhone: `98${random(0, 9)}${random(1000000, 9999999)}`,
                 
                 // Financial Transaction Details - Required for approval
                 initialShareAmount: randomMultipleOf100(10000, 100000), // Rs. 10,000 to Rs. 100,000 (institutions typically invest more, must be multiple of 100)
                 initialSavingsAmount: random(0, 50000), // Rs. 0 to Rs. 50,000 (optional)
                 initialOtherAmount: random(1000, 2000), // Entry Fee (Prabesh Sulka) - Rs. 1,000 to Rs. 2,000
                 initialOtherSpecify: 'Entry Fee (Prabesh Sulka)',
                 
                 // Mark as complete
                 isComplete: true,
                 completedAt: new Date(),
                 ...(workflowStatus === 'approved' ? {
                    approvedBy: 'system',
                    approvedAt: new Date(),
                 } : {})
               }
             }
          } : {
            kyc: {
              create: {
                cooperativeId: cooperativeId!,
                dateOfBirth: new Date(Date.now() - random(500000000000, 1500000000000)), // 16-50 years old
                gender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                nationality: 'Nepali',
                citizenshipNumber: `${random(10, 99)}-${random(0, 99)}-${random(1000, 9999)}`,
                citizenshipIssuingDistrict: sample(districts),
                fatherName: `${sample(firstNames)} ${sample(lastNames)}`,
                motherName: `${sample(firstNames)} ${sample(lastNames)}`,
                grandfatherName: `${sample(firstNames)} ${sample(lastNames)}`,
                maritalStatus: Math.random() > 0.3 ? 'MARRIED' : 'UNMARRIED',
                occupation: sample(occupations),
                permanentMunicipality: sample(municipalities),
                permanentWard: `${random(1, 32)}`,
                // permanentDistrict: sample(districts), // Not in schema
                permanentProvince: 'Bagmati',
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
                ...(workflowStatus === 'approved' ? {
                   approvedBy: 'system',
                   approvedAt: new Date(),
                } : {})
              }
            }
          })
        },
      });

      createdMembers.push(member);
      process.stdout.write('.');
    }

    console.log(`\n\n✅ Successfully seeded ${createdMembers.length} members!`);
    console.log('These members are in "application" status with complete KYC data (submitted, awaiting review).');
    console.log('You can now go to "Member Requests" or "Approvals" page to review and approve them.');

  } catch (error) {
    console.error('\n❌ Error seeding members:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get args
const cooperativeIdentifier = process.argv[2];
const count = process.argv[3] ? parseInt(process.argv[3]) : 20;

if (cooperativeIdentifier) {
  seedMembers(cooperativeIdentifier, count);
} else {
  console.log('⚠️  Please provide a cooperative identifier (subdomain or ID)');
  console.log('Usage: npx tsx apps/backend/scripts/seed-members.ts <cooperativeIdentifier> [count]');
  // Optional: Try to use default if none provided for ease of use in dev
  // seedMembers(undefined, count);
}

