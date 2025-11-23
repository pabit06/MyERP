import dotenv from 'dotenv';
import { prisma } from '@myerp/db-schema';

dotenv.config();

interface UpgradePlanArgs {
  subdomain: string;
  planName: string;
}

async function upgradePlan(subdomain: string, planName: string) {
  try {
    console.log(`🔄 Upgrading ${subdomain} to ${planName} plan...`);

    // Find cooperative
    const cooperative = await prisma.cooperative.findUnique({
      where: { subdomain },
      include: {
        subscription: true,
      },
    });

    if (!cooperative) {
      console.error('❌ Cooperative not found:', subdomain);
      process.exit(1);
    }

    // Find plan
    const plan = await prisma.plan.findFirst({
      where: { name: planName },
    });

    if (!plan) {
      console.error('❌ Plan not found:', planName);
      console.log('Available plans: Basic, Standard, Premium, Enterprise');
      process.exit(1);
    }

    // Update subscription
    const subscription = await prisma.subscription.update({
      where: { cooperativeId: cooperative.id },
      data: {
        planId: plan.id,
        status: 'active',
      },
      include: {
        plan: true,
      },
    });

    console.log('✅ Subscription upgraded successfully!');
    console.log('\n📋 Details:');
    console.log('  Cooperative:', cooperative.name);
    console.log('  New Plan:', subscription.plan.name);
    console.log('  Monthly Price:', `$${subscription.plan.monthlyPrice}`);
    console.log(
      '  Enabled Modules:',
      (subscription.plan.enabledModules as string[]).join(', ') || 'None'
    );
    console.log('\n💡 You may need to refresh your browser to see the changes.');

    return subscription;
  } catch (error) {
    console.error('❌ Upgrade error:', error);
    throw error;
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
const subdomain = args[0];
const planName = args[1];

if (!subdomain || !planName) {
  console.log('Usage: pnpm upgrade-plan <subdomain> <planName>');
  console.log('Example: pnpm upgrade-plan bhanjyang Standard');
  console.log('\nAvailable plans:');
  console.log('  - Basic (no modules)');
  console.log('  - Standard (CBS module)');
  console.log('  - Premium (CBS, DMS, HRM modules)');
  console.log('  - Enterprise (all modules)');
  process.exit(1);
}

// Run upgrade
upgradePlan(subdomain, planName)
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
