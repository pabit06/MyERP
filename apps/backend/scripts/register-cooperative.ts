import dotenv from 'dotenv';
import { prisma } from '@myerp/db-schema';
import { hashPassword, generateToken } from '../src/lib/auth.js';

// Load environment variables
dotenv.config();

interface CooperativeData {
  name: string;
  subdomain: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  address?: string;
  website?: string;
  phone?: string;
  description?: string;
}

async function registerCooperative(data: CooperativeData) {
  try {
    console.log('🏢 Registering cooperative:', data.name);

    // Validate subdomain format
    const subdomain = data.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if (subdomain !== data.subdomain.toLowerCase()) {
      console.log(`⚠️  Subdomain normalized to: ${subdomain}`);
    }

    // Check if subdomain is already taken
    const existingCooperative = await prisma.cooperative.findUnique({
      where: { subdomain },
    });

    if (existingCooperative) {
      console.error('❌ Subdomain already taken:', subdomain);
      process.exit(1);
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      console.error('❌ Email already registered:', data.email);
      process.exit(1);
    }

    // Get or create default plan (Basic plan)
    let defaultPlan = await prisma.plan.findFirst({
      where: { name: 'Basic' },
    });

    if (!defaultPlan) {
      console.log('📦 Creating Basic plan...');
      defaultPlan = await prisma.plan.create({
        data: {
          name: 'Basic',
          monthlyPrice: 0,
          enabledModules: [],
        },
      });
    }

    // Create cooperative, subscription, profile, and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create cooperative
      const cooperative = await tx.cooperative.create({
        data: {
          name: data.name,
          subdomain,
        },
      });

      console.log('✅ Cooperative created:', cooperative.id);

      // Create subscription
      await tx.subscription.create({
        data: {
          cooperativeId: cooperative.id,
          planId: defaultPlan.id,
          status: 'active',
        },
      });

      console.log('✅ Subscription created');

      // Create cooperative profile
      const profile = await tx.cooperativeProfile.create({
        data: {
          cooperativeId: cooperative.id,
          description: data.description,
          address: data.address,
          website: data.website,
          phone: data.phone,
        },
      });

      console.log('✅ Profile created');

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create admin user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          cooperativeId: cooperative.id,
          isActive: true,
        },
      });

      console.log('✅ Admin user created:', user.email);

      return { cooperative, user, profile };
    });

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      cooperativeId: result.cooperative.id,
    });

    console.log('\n🎉 Registration successful!');
    console.log('\n📋 Details:');
    console.log('  Cooperative ID:', result.cooperative.id);
    console.log('  Name:', result.cooperative.name);
    console.log('  Subdomain:', result.cooperative.subdomain);
    console.log('  Admin Email:', result.user.email);
    console.log('  Admin Name:', `${result.user.firstName} ${result.user.lastName}`);
    console.log('\n🔑 JWT Token:');
    console.log(token);
    console.log('\n💡 You can now use this token to authenticate API requests.');
    console.log(
      '   Example: curl -H "Authorization: Bearer <token>" http://localhost:3001/api/auth/me'
    );

    return { cooperative: result.cooperative, user: result.user, token };
  } catch (error) {
    console.error('❌ Registration error:', error);
    throw error;
  }
}

// Register Bhanjyang Cooperative
const bhanjyangData: CooperativeData = {
  name: 'Bhanjyang Saving & Credit Cooperative Society Ltd.',
  subdomain: 'bhanjyang',
  email: 'admin@bhanjyang.coop.np',
  password: 'Password123!', // ⚠️ Change this!
  firstName: 'Admin',
  lastName: 'User',
  address: 'Rupa RM-5, Deurali, Kaski',
  website: 'https://bhanjyang.coop.np',
  phone: '061620200',
  description:
    'Bhanjyang Saving & Credit Cooperative Society Ltd. - Serving the community with financial services.',
};

// Run registration
registerCooperative(bhanjyangData)
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
