import { prisma } from '@myerp/db-schema';
import { hashPassword } from '../src/lib/auth.js';

interface SystemAdminData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

async function createSystemAdmin(data: SystemAdminData) {
  try {
    // Check if system admin already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      console.error('❌ User with this email already exists');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create system admin user
    const systemAdmin = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isSystemAdmin: true,
        isActive: true,
        // No cooperativeId for system admin
      },
    });

    console.log('✅ System admin created successfully!');
    console.log('\n📋 Details:');
    console.log('  ID:', systemAdmin.id);
    console.log('  Email:', systemAdmin.email);
    console.log('  Name:', `${systemAdmin.firstName} ${systemAdmin.lastName}`);
    console.log('  System Admin: Yes');
  } catch (error) {
    console.error('❌ Error creating system admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get data from command line arguments
const email = process.argv[2];
const password = process.argv[3];
const firstName = process.argv[4] || 'System';
const lastName = process.argv[5] || 'Admin';

if (!email || !password) {
  console.error('Usage: pnpm create-system-admin <email> <password> [firstName] [lastName]');
  console.error('Example: pnpm create-system-admin admin@myerp.com SecurePass123 "System" "Admin"');
  process.exit(1);
}

createSystemAdmin({ email, password, firstName, lastName });

