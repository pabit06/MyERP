import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * Enable governance module for a cooperative's subscription plan
 * Usage: pnpm tsx scripts/enable-governance-module.ts [cooperativeId]
 */
async function enableGovernanceModule(cooperativeId?: string) {
  try {
    let targetCooperativeId = cooperativeId;

    // If no cooperative ID provided, list all cooperatives
    if (!targetCooperativeId) {
      const cooperatives = await prisma.cooperative.findMany({
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      console.log('\nAvailable Cooperatives:');
      cooperatives.forEach((coop, index) => {
        console.log(`${index + 1}. ${coop.name} (ID: ${coop.id})`);
        if (coop.subscription) {
          const enabledModules = (coop.subscription.plan.enabledModules as string[]) || [];
          console.log(`   Current modules: ${enabledModules.join(', ') || 'None'}`);
        } else {
          console.log('   No active subscription');
        }
      });

      console.log('\nPlease provide a cooperative ID as an argument:');
      console.log('pnpm tsx scripts/enable-governance-module.ts <cooperativeId>');
      return;
    }

    // Get the cooperative with its subscription
    const cooperative = await prisma.cooperative.findUnique({
      where: { id: targetCooperativeId },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!cooperative) {
      console.error(`Cooperative with ID ${targetCooperativeId} not found`);
      process.exit(1);
    }

    if (!cooperative.subscription) {
      console.error(`Cooperative ${cooperative.name} has no active subscription`);
      process.exit(1);
    }

    const plan = cooperative.subscription.plan;
    const currentModules = (plan.enabledModules as string[]) || [];

    if (currentModules.includes('governance')) {
      console.log(`Governance module is already enabled for ${cooperative.name}`);
      return;
    }

    // Add governance module to enabled modules
    const updatedModules = [...currentModules, 'governance'];

    await prisma.plan.update({
      where: { id: plan.id },
      data: {
        enabledModules: updatedModules,
      },
    });

    console.log(`✅ Governance module enabled for ${cooperative.name}`);
    console.log(`   Updated modules: ${updatedModules.join(', ')}`);
  } catch (error) {
    console.error('Error enabling governance module:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get cooperative ID from command line arguments
const cooperativeId = process.argv[2];
enableGovernanceModule(cooperativeId);
