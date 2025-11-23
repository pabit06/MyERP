import { prisma } from '../../lib/prisma.js';
import { updateMemberRisk } from './risk.js';
import { rescreenAllMembers } from './watchlist.js';

/**
 * Calculate and update next KYM review dates for all members
 */
export async function updateKymReviewDates() {
  try {
    const members = await prisma.member.findMany({
      where: {
        isActive: true,
        lastKymUpdate: {
          not: null,
        },
      },
      select: {
        id: true,
        riskCategory: true,
        lastKymUpdate: true,
      },
    });

    for (const member of members) {
      if (!member.lastKymUpdate) continue;

      const baseDate = new Date(member.lastKymUpdate);
      const yearsToAdd =
        member.riskCategory === 'HIGH' ? 1 : member.riskCategory === 'MEDIUM' ? 2 : 3;

      const nextKymReviewDate = new Date(baseDate);
      nextKymReviewDate.setFullYear(nextKymReviewDate.getFullYear() + yearsToAdd);

      await prisma.member.update({
        where: { id: member.id },
        data: { nextKymReviewDate },
      });
    }

    console.log(`Updated KYM review dates for ${members.length} members`);
  } catch (error) {
    console.error('Error updating KYM review dates:', error);
  }
}

/**
 * Reassess risk for all members
 */
export async function reassessAllMemberRisks() {
  try {
    const members = await prisma.member.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    for (const member of members) {
      try {
        await updateMemberRisk(member.id);
      } catch (error) {
        console.error(`Error updating risk for member ${member.id}:`, error);
      }
    }

    console.log(`Reassessed risk for ${members.length} members`);
  } catch (error) {
    console.error('Error reassessing member risks:', error);
  }
}

/**
 * Rescreen all members against updated watchlists
 */
export async function rescreenAllMembersAgainstWatchlists(cooperativeId: string) {
  try {
    await rescreenAllMembers(cooperativeId, 'UN');
    await rescreenAllMembers(cooperativeId, 'HOME_MINISTRY');
    console.log(`Rescreened all members for cooperative ${cooperativeId}`);
  } catch (error) {
    console.error('Error rescreening members:', error);
  }
}

/**
 * Run all AML cron jobs
 * This should be called by a cron scheduler (e.g., node-cron)
 */
export async function runAmlCronJobs() {
  console.log('Running AML cron jobs...');

  // Update KYM review dates
  await updateKymReviewDates();

  // Reassess member risks
  await reassessAllMemberRisks();

  // Note: Watchlist rescreening should be triggered when watchlists are updated
  // This is handled separately in the watchlist import scripts

  console.log('AML cron jobs completed');
}
