import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@myerp.com';
  const password = 'password123';

  console.log(`Hashing password...`);
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log(`Creating system admin user...`);
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hashedPassword,
      firstName: 'System',
      lastName: 'Admin',
      isSystemAdmin: true,
      isActive: true,
    },
  });

  console.log(`
  ✅ System Admin user ready!
  -----------------------------------------------
  Login URL: http://localhost:3000/login
  Email:     ${email}
  Password:  ${password}
  -----------------------------------------------
  `);
}

main()
  .catch((e) => {
    console.error('Error creating admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
