import { prisma } from '../lib/prisma.js';
import { Prisma } from '@prisma/client';

/**
 * Calculate Balance Sheet from Chart of Accounts/Ledger
 * Uses latest Ledger.balance for each account (no need to sum all transactions)
 */
export async function calculateBalanceSheet(
  cooperativeId: string,
  asOfDate: Date = new Date()
): Promise<{
  assets: { [accountCode: string]: { name: string; balance: number } };
  liabilities: { [accountCode: string]: { name: string; balance: number } };
  equity: { [accountCode: string]: { name: string; balance: number } };
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
}> {
  // Get latest ledger balance for each account up to asOfDate
  // Use raw SQL for better performance - get latest balance per account
  // Using window function for better performance
  const latestBalances = await prisma.$queryRaw<
    Array<{
      accountId: string;
      balance: number;
    }>
  >`
    WITH ranked_ledgers AS (
      SELECT 
        l."accountId",
        l.balance::float as balance,
        ROW_NUMBER() OVER (PARTITION BY l."accountId" ORDER BY l."createdAt" DESC) as rn
      FROM "ledgers" l
      WHERE l."cooperativeId" = ${cooperativeId}
        AND l."createdAt" <= ${asOfDate}
    )
    SELECT "accountId", balance
    FROM ranked_ledgers
    WHERE rn = 1
  `;

  const balances: { [accountId: string]: number } = {};
  for (const row of latestBalances) {
    balances[row.accountId] = row.balance;
  }

  // Get all accounts with their codes and types
  const accounts = await prisma.chartOfAccounts.findMany({
    where: {
      cooperativeId,
      isActive: true,
    },
  });

  const assets: { [accountCode: string]: { name: string; balance: number } } = {};
  const liabilities: { [accountCode: string]: { name: string; balance: number } } = {};
  const equity: { [accountCode: string]: { name: string; balance: number } } = {};

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const account of accounts) {
    const balance = balances[account.id] || 0;
    const accountData = {
      name: account.name,
      balance,
    };

    if (account.type === 'asset') {
      assets[account.code] = accountData;
      totalAssets += balance;
    } else if (account.type === 'liability') {
      liabilities[account.code] = accountData;
      totalLiabilities += balance;
    } else if (account.type === 'equity') {
      equity[account.code] = accountData;
      totalEquity += balance;
    }
  }

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
  };
}

/**
 * Calculate Income Statement (Revenue vs Expenses)
 * Uses Prisma.aggregate to sum debits/credits for date range
 */
export async function calculateIncomeStatement(
  cooperativeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  revenue: { [accountCode: string]: { name: string; amount: number } };
  expenses: { [accountCode: string]: { name: string; amount: number } };
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}> {
  // Get all revenue and expense accounts
  const revenueAccounts = await prisma.chartOfAccounts.findMany({
    where: {
      cooperativeId,
      type: 'revenue',
      isActive: true,
    },
  });

  const expenseAccounts = await prisma.chartOfAccounts.findMany({
    where: {
      cooperativeId,
      type: 'expense',
      isActive: true,
    },
  });

  const revenue: { [accountCode: string]: { name: string; amount: number } } = {};
  const expenses: { [accountCode: string]: { name: string; amount: number } } = {};

  // Calculate revenue (credit increases revenue)
  for (const account of revenueAccounts) {
    const result = await prisma.ledger.aggregate({
      where: {
        accountId: account.id,
        cooperativeId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        credit: true,
      },
    });

    const amount = Number(result._sum.credit || 0);
    revenue[account.code] = {
      name: account.name,
      amount,
    };
  }

  // Calculate expenses (debit increases expenses)
  for (const account of expenseAccounts) {
    const result = await prisma.ledger.aggregate({
      where: {
        accountId: account.id,
        cooperativeId,
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: {
        debit: true,
      },
    });

    const amount = Number(result._sum.debit || 0);
    expenses[account.code] = {
      name: account.name,
      amount,
    };
  }

  const totalRevenue = Object.values(revenue).reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = Object.values(expenses).reduce((sum, e) => sum + e.amount, 0);
  const netIncome = totalRevenue - totalExpenses;

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome,
  };
}

/**
 * Calculate PEARLS Ratios
 * Uses database aggregations for optimal performance
 * All ratios calculated from current balance sheet and loan data
 */
export async function calculatePEARLSRatios(
  cooperativeId: string,
  asOfDate: Date = new Date()
): Promise<{
  P1: number; // Protection: Loan Loss Reserve / Total Loans
  P2: number; // Protection: Loan Loss Reserve / Overdue Loans (>30 days)
  E1: number; // Structure: Net Loans / Total Assets
  E5: number; // Structure: Share Capital / Total Assets
  E6: number; // Structure: Reserves / Total Assets
  E7: number; // Structure: Total Equity / Total Assets
  A1: number; // Asset Quality: Overdue Loans / Total Loans
  A2: number; // Asset Quality: Loan Loss Reserve / Total Loans
  R9: number; // Return: Return on Assets (ROA)
  R12: number; // Return: Return on Equity (ROE)
  L1: number; // Liquidity: Liquid Assets / Total Assets
  L3: number; // Liquidity: Liquid Assets / Short-term Liabilities
  S10: number; // Growth: Member Growth Rate
  S11: number; // Growth: Asset Growth Rate
}> {
  // Get balance sheet data
  const balanceSheet = await calculateBalanceSheet(cooperativeId, asOfDate);

  // Get loan portfolio data using aggregation
  const loanData = await prisma.$queryRaw<
    Array<{
      totalLoans: number;
      overdueLoans: number;
      loanLossReserve: number;
    }>
  >`
    SELECT
      COALESCE(SUM(CASE WHEN la.status IN ('approved', 'disbursed') THEN la."loanAmount" ELSE 0 END), 0)::float as "totalLoans",
      COALESCE(SUM(CASE 
        WHEN la.status IN ('approved', 'disbursed') 
        AND la."disbursedDate" IS NOT NULL
        AND (CURRENT_DATE - la."disbursedDate") > 30
        THEN la."loanAmount" ELSE 0 
      END), 0)::float as "overdueLoans",
      COALESCE(SUM(CASE WHEN la.status = 'written_off' THEN la."loanAmount" ELSE 0 END), 0)::float as "loanLossReserve"
    FROM "loan_applications" la
    WHERE la."cooperativeId" = ${cooperativeId}
  `;

  const { totalLoans, overdueLoans, loanLossReserve } = loanData[0] || {
    totalLoans: 0,
    overdueLoans: 0,
    loanLossReserve: 0,
  };

  // Get share capital from balance sheet equity
  const shareCapitalAccount = Object.values(balanceSheet.equity).find(
    (e) => e.name.toLowerCase().includes('share') || e.name.toLowerCase().includes('capital')
  );
  const shareCapital = shareCapitalAccount?.balance || 0;

  // Get reserves (other equity accounts)
  const reserves = balanceSheet.totalEquity - shareCapital;

  // Get liquid assets (cash and bank accounts)
  const liquidAssetsAccounts = Object.values(balanceSheet.assets).filter(
    (a) => a.name.toLowerCase().includes('cash') || a.name.toLowerCase().includes('bank')
  );
  const liquidAssets = liquidAssetsAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Get short-term liabilities (liabilities due within 1 year)
  // For simplicity, using all liabilities - in real scenario, would filter by maturity
  const shortTermLiabilities = balanceSheet.totalLiabilities;

  // Calculate ratios
  const P1 = totalLoans > 0 ? (loanLossReserve / totalLoans) * 100 : 0;
  const P2 = overdueLoans > 0 ? (loanLossReserve / overdueLoans) * 100 : 0;
  const E1 = balanceSheet.totalAssets > 0 ? (totalLoans / balanceSheet.totalAssets) * 100 : 0;
  const E5 = balanceSheet.totalAssets > 0 ? (shareCapital / balanceSheet.totalAssets) * 100 : 0;
  const E6 = balanceSheet.totalAssets > 0 ? (reserves / balanceSheet.totalAssets) * 100 : 0;
  const E7 =
    balanceSheet.totalAssets > 0 ? (balanceSheet.totalEquity / balanceSheet.totalAssets) * 100 : 0;
  const A1 = totalLoans > 0 ? (overdueLoans / totalLoans) * 100 : 0;
  const A2 = totalLoans > 0 ? (loanLossReserve / totalLoans) * 100 : 0;

  // For R9 and R12, we need income statement data (would need month/year context)
  // For now, returning 0 - these should be calculated with income statement
  const R9 = 0; // ROA = Net Income / Total Assets (needs income statement)
  const R12 = 0; // ROE = Net Income / Total Equity (needs income statement)

  const L1 = balanceSheet.totalAssets > 0 ? (liquidAssets / balanceSheet.totalAssets) * 100 : 0;
  const L3 = shortTermLiabilities > 0 ? (liquidAssets / shortTermLiabilities) * 100 : 0;

  // Growth rates need historical data - for now returning 0
  // These should be calculated by comparing with previous period
  const S10 = 0; // Member Growth Rate
  const S11 = 0; // Asset Growth Rate

  return {
    P1,
    P2,
    E1,
    E5,
    E6,
    E7,
    A1,
    A2,
    R9,
    R12,
    L1,
    L3,
    S10,
    S11,
  };
}

/**
 * Calculate Spread Rate (Weighted average interest rates)
 * Uses Prisma.aggregate with weighted average calculation
 */
export async function calculateSpreadRate(
  cooperativeId: string,
  asOfDate: Date = new Date()
): Promise<{
  avgSavingsRate: number;
  avgLoanRate: number;
  spreadRate: number;
}> {
  // Calculate weighted average savings interest rate
  const savingsData = await prisma.$queryRaw<
    Array<{
      weightedRate: number;
      totalBalance: number;
    }>
  >`
    SELECT
      COALESCE(SUM(sa.balance * sp."interestRate") / NULLIF(SUM(sa.balance), 0), 0)::float as "weightedRate",
      COALESCE(SUM(sa.balance), 0)::float as "totalBalance"
    FROM "saving_accounts" sa
    INNER JOIN "saving_products" sp ON sa."productId" = sp.id
    WHERE sa."cooperativeId" = ${cooperativeId}
    AND sa.status = 'active'
  `;

  const avgSavingsRate = savingsData[0]?.weightedRate || 0;

  // Calculate weighted average loan interest rate
  const loanData = await prisma.$queryRaw<
    Array<{
      weightedRate: number;
      totalAmount: number;
    }>
  >`
    SELECT
      COALESCE(SUM(la."loanAmount" * lp."interestRate") / NULLIF(SUM(la."loanAmount"), 0), 0)::float as "weightedRate",
      COALESCE(SUM(la."loanAmount"), 0)::float as "totalAmount"
    FROM "loan_applications" la
    INNER JOIN "loan_products" lp ON la."productId" = lp.id
    WHERE la."cooperativeId" = ${cooperativeId}
    AND la.status IN ('approved', 'disbursed')
  `;

  const avgLoanRate = loanData[0]?.weightedRate || 0;
  const spreadRate = avgLoanRate - avgSavingsRate;

  return {
    avgSavingsRate,
    avgLoanRate,
    spreadRate,
  };
}

/**
 * Calculate Budget Variance
 * Compares budget vs actual expenses
 * Note: Budget table may not exist yet - this is a placeholder
 */
export async function calculateBudgetVariance(
  cooperativeId: string,
  fiscalYear: string,
  month: string
): Promise<{
  budgetedExpenses: number;
  actualExpenses: number;
  variance: number;
  variancePercent: number;
}> {
  // For now, returning placeholder values
  // In real implementation, would query budget table and compare with actual expenses
  const actualExpenses = 0; // Would calculate from income statement
  const budgetedExpenses = 0; // Would fetch from budget table
  const variance = actualExpenses - budgetedExpenses;
  const variancePercent = budgetedExpenses > 0 ? (variance / budgetedExpenses) * 100 : 0;

  return {
    budgetedExpenses,
    actualExpenses,
    variance,
    variancePercent,
  };
}
