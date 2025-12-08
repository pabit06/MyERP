import { prisma } from '../lib/prisma.js';
import {
  calculateBalanceSheet,
  calculateIncomeStatement,
  calculatePEARLSRatios,
  calculateSpreadRate,
  calculateBudgetVariance,
} from './financial-calculations.js';
import {
  getMemberStatistics,
  getAMLStatistics,
  getTop20Depositors,
  getMemberCentralityIndex,
} from './member-statistics.js';
import {
  getLoanApprovalsByLevel,
  getOverdueLoans,
  getRecoveryStatistics,
  getChargeOffLoans,
  getInsiderLending,
} from './loan-statistics.js';
import {
  getUpcomingLiabilities,
  getTop20Borrowers,
  calculateGapAnalysis,
} from './liquidity-analysis.js';
import {
  getCommitteeMeetingStats,
  getMemberComplaints,
  getRegulatoryCirculars,
  getPolicyChanges,
} from './governance-statistics.js';
import { getBsMonthDates } from '../lib/nepali-date.js';

/**
 * Get Nepali month names in order
 */
const NEPALI_MONTHS = [
  'Baisakh',
  'Jestha',
  'Ashad',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

/**
 * Get previous month name
 */
function getPreviousMonth(currentMonth: string): string {
  const index = NEPALI_MONTHS.indexOf(currentMonth);
  if (index === -1) return '';
  const prevIndex = index === 0 ? 11 : index - 1;
  return NEPALI_MONTHS[prevIndex];
}

/**
 * Calculate month start and end dates for a given fiscal year and month
 * Uses proper Nepali calendar conversion
 */
function getMonthDates(fiscalYear: string, month: string): { monthStart: Date; monthEnd: Date } {
  const year = parseInt(fiscalYear);
  const monthIndex = NEPALI_MONTHS.indexOf(month);

  if (monthIndex === -1) {
    throw new Error(`Invalid month: ${month}`);
  }

  // Convert BS month (1-12) to proper dates
  const bsMonth = monthIndex + 1; // Convert 0-indexed to 1-indexed
  const { monthStart, monthEnd } = getBsMonthDates(year, bsMonth);

  return { monthStart, monthEnd };
}

/**
 * Fetch all report data from CBS/Accounting
 * Main orchestrator that calls all calculation services
 */
export async function fetchReportData(
  cooperativeId: string,
  fiscalYear: string,
  month: string
): Promise<{
  financialData: any;
  memberData: any;
  loanData: any;
  liquidityData: any;
  governanceData: any;
  previousMonthData: any | null;
}> {
  const { monthStart, monthEnd } = getMonthDates(fiscalYear, month);
  const asOfDate = monthEnd;

  // Calculate next month dates for liquidity analysis
  const nextMonthStart = new Date(monthEnd);
  nextMonthStart.setDate(nextMonthStart.getDate() + 1);
  const nextMonthEnd = new Date(nextMonthStart);
  nextMonthEnd.setMonth(nextMonthEnd.getMonth() + 1);
  nextMonthEnd.setDate(0); // Last day of next month

  // Run all calculations in parallel for optimal performance
  const [
    balanceSheet,
    incomeStatement,
    pearlsRatios,
    spreadRate,
    budgetVariance,
    memberStats,
    amlStats,
    top20Depositors,
    memberCentrality,
    loanApprovals,
    overdueLoans,
    recoveryStats,
    chargeOffLoans,
    insiderLending,
    upcomingLiabilities,
    top20Borrowers,
    gapAnalysis,
    committeeMeetings,
    complaints,
    circulars,
    policyChanges,
  ] = await Promise.all([
    calculateBalanceSheet(cooperativeId, asOfDate),
    calculateIncomeStatement(cooperativeId, monthStart, monthEnd),
    calculatePEARLSRatios(cooperativeId, asOfDate),
    calculateSpreadRate(cooperativeId, asOfDate),
    calculateBudgetVariance(cooperativeId, fiscalYear, month),
    getMemberStatistics(cooperativeId, monthStart, monthEnd),
    getAMLStatistics(cooperativeId),
    getTop20Depositors(cooperativeId, asOfDate),
    getMemberCentralityIndex(cooperativeId),
    getLoanApprovalsByLevel(cooperativeId, monthStart, monthEnd),
    getOverdueLoans(cooperativeId, 31),
    getRecoveryStatistics(cooperativeId, monthStart, monthEnd),
    getChargeOffLoans(cooperativeId),
    getInsiderLending(cooperativeId),
    getUpcomingLiabilities(cooperativeId, nextMonthStart, nextMonthEnd),
    getTop20Borrowers(cooperativeId, asOfDate),
    calculateGapAnalysis(cooperativeId, 12),
    getCommitteeMeetingStats(cooperativeId, monthStart, monthEnd),
    getMemberComplaints(cooperativeId, monthStart, monthEnd),
    getRegulatoryCirculars(cooperativeId, monthStart, monthEnd),
    getPolicyChanges(cooperativeId, monthStart, monthEnd),
  ]);

  // Structure financial data
  const financialData = {
    balanceSheet,
    incomeStatement,
    pearlsRatios,
    spreadRate,
    budgetVariance,
    asOfDate: asOfDate.toISOString(),
  };

  // Structure member data
  const memberData = {
    statistics: memberStats,
    aml: amlStats,
    top20Depositors,
    memberCentrality,
  };

  // Structure loan data
  const loanData = {
    approvalsByLevel: loanApprovals,
    overdueLoans,
    recovery: recoveryStats,
    chargeOff: chargeOffLoans,
    insiderLending,
  };

  // Structure liquidity data
  const liquidityData = {
    upcomingLiabilities,
    top20Borrowers,
    gapAnalysis,
  };

  // Structure governance data
  const governanceData = {
    committeeMeetings,
    complaints,
    circulars,
    policyChanges,
  };

  // Fetch previous month's finalized report for comparison
  const previousMonth = getPreviousMonth(month);
  let previousMonthData: any | null = null;

  if (previousMonth) {
    const previousReport = await prisma.managerReport.findFirst({
      where: {
        cooperativeId,
        fiscalYear,
        month: previousMonth,
        status: 'FINALIZED',
      },
      orderBy: {
        finalizedAt: 'desc',
      },
    });

    if (previousReport && previousReport.financialData) {
      // Extract financial data from previous report snapshot
      previousMonthData = {
        balanceSheet: (previousReport.financialData as any).balanceSheet,
        incomeStatement: (previousReport.financialData as any).incomeStatement,
        // Add other comparison data as needed
      };
    }
  }

  return {
    financialData,
    memberData,
    loanData,
    liquidityData,
    governanceData,
    previousMonthData,
  };
}
