import { prisma } from '../lib/prisma.js';
import { getCurrentNepaliFiscalYear } from '../lib/nepali-fiscal-year.js';

export class DashboardController {
  /**
   * Get quick stats for the dashboard
   */
  async getQuickStats(cooperativeId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalMembers, totalSavings, activeLoansCount, totalLoanDisbursed, todaysTransactions] =
      await Promise.all([
        // Total Members
        prisma.member.count({
          where: { cooperativeId, isActive: true },
        }),

        // Total Savings Balance
        prisma.savingAccount.aggregate({
          _sum: { balance: true },
          where: { cooperativeId, status: 'active' },
        }),

        // Active Loans Count
        prisma.loanApplication.count({
          where: { cooperativeId, status: 'APPROVED' },
        }),

        // Total Loan Disbursed (Approved Loans Amount)
        prisma.loanApplication.aggregate({
          _sum: { loanAmount: true },
          where: { cooperativeId, status: 'APPROVED' },
        }),

        // Today's Transaction Volume (Journal Entries)
        prisma.journalEntry.count({
          where: {
            cooperativeId,
            date: {
              gte: today,
            },
          },
        }),
      ]);

    return {
      totalMembers,
      totalSavings: totalSavings._sum.balance || 0,
      activeLoansCount,
      totalLoanDisbursed: totalLoanDisbursed._sum.loanAmount || 0,
      todaysTransactions,
    };
  }

  /**
   * Get recent activities (Audit Logs)
   */
  async getRecentActivity(cooperativeId: string, limit = 5) {
    const logs = await prisma.auditLog.findMany({
      where: { cooperativeId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        action: true,
        details: true,
        timestamp: true,
        userId: true,
      },
    });

    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean) as string[])];

    // Manual user fetch since relation doesn't exist
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return logs.map((log) => ({
      ...log,
      user: log.userId ? userMap.get(log.userId) : null,
    }));
  }

  /**
   * Get member growth (registrations per month for current fiscal year)
   * Note: This is a simplified version. For true fiscal year grouping, we'd need more logic.
   * For now, returning last 6 months.
   */
  async getMemberGrowth(cooperativeId: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);

    const members = await prisma.member.findMany({
      where: {
        cooperativeId,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by month
    const growthMap = new Map<string, number>();

    // Initialize last 6 months
    for (let i = 0; i < 6; i++) {
      const d = new Date(sixMonthsAgo);
      d.setMonth(d.getMonth() + i);
      const key = d.toISOString().slice(0, 7); // YYYY-MM
      growthMap.set(key, 0);
    }

    // Count
    members.forEach((m) => {
      const key = m.createdAt.toISOString().slice(0, 7);
      if (growthMap.has(key)) {
        growthMap.set(key, (growthMap.get(key) || 0) + 1);
      }
    });

    return Array.from(growthMap.entries()).map(([month, count]) => ({ month, count }));
  }
}

export const dashboardController = new DashboardController();
