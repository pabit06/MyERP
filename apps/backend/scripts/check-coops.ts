import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const coops = await prisma.cooperative.findMany({
    select: { id: true, name: true, subdomain: true },
  });
  console.log('Existing Cooperatives:', JSON.stringify(coops, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
