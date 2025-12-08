import { prisma } from '../lib/prisma.js';

/**
 * Get upcoming liabilities (taxes, TDS, large withdrawals)
 */
export async function getUpcomingLiabilities(
  cooperativeId: string,
  _nextMonthStart: Date,
  _nextMonthEnd: Date
): Promise<{
  taxes: number;
  tds: number;
  largeWithdrawals: number;
  totalLiabilities: number;
  details: Array<{
    type: string;
    description: string;
    amount: number;
    dueDate: Date | null;
  }>;
}> {
  // Get TDS payable from Chart of Accounts
  const tdsAccount = await prisma.chartOfAccounts.findFirst({
    where: {
      cooperativeId,
      code: '2001', // TDS Payable account code
      type: 'liability',
      isActive: true,
    },
  });

  let tds = 0;
  if (tdsAccount) {
    const latestLedger = await prisma.ledger.findFirst({
      where: {
        accountId: tdsAccount.id,
        cooperativeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    if (latestLedger) {
      tds = Number(latestLedger.balance);
    }
  }

  // Get taxes (would need a tax account or calculate from expenses)
  // Placeholder - would need to implement tax calculation logic
  const taxes = 0;

  // Get large withdrawals (savings accounts with large balances that might withdraw)
  // This is a predictive metric - would need business rules to define "large"
  const largeWithdrawals = 0; // Placeholder

  const details: Array<{
    type: string;
    description: string;
    amount: number;
    dueDate: Date | null;
  }> = [];

  if (tds > 0) {
    details.push({
      type: 'TDS',
      description: 'TDS Payable',
      amount: tds,
      dueDate: null, // Would need to track due dates
    });
  }

  if (taxes > 0) {
    details.push({
      type: 'Tax',
      description: 'Tax Payable',
      amount: taxes,
      dueDate: null,
    });
  }

  const totalLiabilities = tds + taxes + largeWithdrawals;

  return {
    taxes,
    tds,
    largeWithdrawals,
    totalLiabilities,
    details,
  };
}

/**
 * Get top 20 borrowers by outstanding amount
 */
export async function getTop20Borrowers(
  cooperativeId: string,
  _asOfDate: Date = new Date()
): Promise<
  Array<{
    memberId: string;
    memberNumber: string | null;
    memberName: string;
    applicationNumber: string;
    loanAmount: number;
    outstandingAmount: number;
    productName: string;
  }>
> {
  const topBorrowers = await prisma.loanApplication.findMany({
    where: {
      cooperativeId,
      status: {
        in: ['approved', 'disbursed'],
      },
    },
    include: {
      member: {
        select: {
          id: true,
          memberNumber: true,
          firstName: true,
          middleName: true,
          lastName: true,
          institutionName: true,
          memberType: true,
        },
      },
      product: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      loanAmount: 'desc',
    },
    take: 20,
  });

  return topBorrowers.map((loan) => {
    const memberName =
      loan.member.memberType === 'INSTITUTION'
        ? loan.member.institutionName || 'Institution Member'
        : `${loan.member.firstName || ''} ${loan.member.middleName || ''} ${
            loan.member.lastName || ''
          }`.trim() || 'Member';

    // Calculate outstanding amount (simplified - would need to sum unpaid EMIs)
    const outstandingAmount = Number(loan.loanAmount); // Placeholder

    return {
      memberId: loan.member.id,
      memberNumber: loan.member.memberNumber,
      memberName,
      applicationNumber: loan.applicationNumber,
      loanAmount: Number(loan.loanAmount),
      outstandingAmount,
      productName: loan.product.name,
    };
  });
}

/**
 * Calculate Gap Analysis (maturity gap between deposits and loans)
 */
export async function calculateGapAnalysis(
  cooperativeId: string,
  _horizonMonths: number = 12
): Promise<{
  gaps: Array<{
    period: string;
    deposits: number;
    loans: number;
    gap: number;
    cumulativeGap: number;
  }>;
  totalDeposits: number;
  totalLoans: number;
  netGap: number;
}> {
  // This is a simplified implementation
  // In real scenario, would need to:
  // 1. Get maturity dates of all deposits (savings accounts with fixed terms)
  // 2. Get maturity dates of all loans (EMI schedules)
  // 3. Group by time buckets (0-1 month, 1-3 months, 3-6 months, 6-12 months, etc.)
  // 4. Calculate gap for each bucket

  // For now, returning placeholder structure
  const gaps: Array<{
    period: string;
    deposits: number;
    loans: number;
    gap: number;
    cumulativeGap: number;
  }> = [];

  // Get total deposits
  const totalDepositsResult = await prisma.savingAccount.aggregate({
    where: {
      cooperativeId,
      status: 'active',
    },
    _sum: {
      balance: true,
    },
  });

  const totalDeposits = Number(totalDepositsResult._sum.balance || 0);

  // Get total loans outstanding
  const totalLoansResult = await prisma.loanApplication.aggregate({
    where: {
      cooperativeId,
      status: {
        in: ['approved', 'disbursed'],
      },
    },
    _sum: {
      loanAmount: true,
    },
  });

  const totalLoans = Number(totalLoansResult._sum.loanAmount || 0);

  // Create time buckets
  const buckets = [
    { label: '0-1 Month', months: 1 },
    { label: '1-3 Months', months: 3 },
    { label: '3-6 Months', months: 6 },
    { label: '6-12 Months', months: 12 },
  ];

  let cumulativeGap = 0;

  for (const bucket of buckets) {
    // Placeholder - would calculate actual deposits/loans maturing in this period
    const deposits = totalDeposits / buckets.length; // Simplified distribution
    const loans = totalLoans / buckets.length; // Simplified distribution
    const gap = deposits - loans;
    cumulativeGap += gap;

    gaps.push({
      period: bucket.label,
      deposits,
      loans,
      gap,
      cumulativeGap,
    });
  }

  const netGap = totalDeposits - totalLoans;

  return {
    gaps,
    totalDeposits,
    totalLoans,
    netGap,
  };
}
