import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for existing cooperatives...');
  const count = await prisma.cooperative.count();

  if (count > 0) {
    console.log(`Found ${count} cooperatives. Deleting...`);
    // Delete all cooperatives. Cascade delete should handle related data (users, members, etc.)
    await prisma.cooperative.deleteMany({});
    console.log('All cooperatives deleted successfully.');
  } else {
    console.log('No cooperatives found. Database is clean.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
