import { prisma } from '../../lib/prisma.js';

/**
 * Default Nepal TDS slabs (as of 2024)
 * These should be configurable via PayrollSettings.tdsConfig
 */
const DEFAULT_TDS_SLABS = [
  { min: 0, max: 500000, rate: 0 }, // No tax up to 5 lakh
  { min: 500000, max: 700000, rate: 0.1 }, // 10% for 5-7 lakh
  { min: 700000, max: 2000000, rate: 0.2 }, // 20% for 7-20 lakh
  { min: 2000000, max: Infinity, rate: 0.3 }, // 30% above 20 lakh
];

/**
 * Calculate annualized TDS for Nepali tax system
 * Uses projected annual income method
 */
export function calculateAnnualizedTDS(
  monthlyTaxableIncome: number,
  fiscalYear: string,
  monthBs: number,
  ytdTaxableIncome: number,
  ytdTaxPaid: number,
  tdsConfig?: any
): number {
  const slabs = tdsConfig?.slabs || DEFAULT_TDS_SLABS;

  // Calculate remaining months in fiscal year
  // Fiscal year: Shrawan (4) to Ashadh (3)
  // monthBs: 1=Baishakh, 2=Jestha, 3=Ashadh, 4=Shrawan, ..., 12=Chaitra
  let remainingMonths = 0;
  if (monthBs >= 4) {
    // Shrawan to Chaitra (months 4-12) = remaining months in current FY
    remainingMonths = 12 - monthBs + 1;
  } else {
    // Baishakh to Ashadh (months 1-3) = remaining months in current FY
    remainingMonths = 3 - monthBs + 1;
  }

  // Projected annual income = (monthly * remaining) + YTD
  const projectedAnnualIncome = monthlyTaxableIncome * remainingMonths + ytdTaxableIncome;

  // Calculate annual tax liability using slabs
  let annualTaxLiability = 0;
  let remainingIncome = projectedAnnualIncome;

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;

    const taxableInSlab = Math.min(remainingIncome, slab.max - slab.min);
    if (taxableInSlab > 0) {
      annualTaxLiability += taxableInSlab * slab.rate;
      remainingIncome -= taxableInSlab;
    }
  }

  // This month's TDS = (Annual Liability - YTD Paid) / Remaining Months
  const thisMonthTDS =
    remainingMonths > 0 ? Math.max(0, (annualTaxLiability - ytdTaxPaid) / remainingMonths) : 0;

  return Math.round(thisMonthTDS * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate SSF contributions
 */
export function calculateSSF(
  basicSalary: number,
  scheme: 'SSF' | 'TRADITIONAL'
): {
  employee: number;
  employer: number;
} {
  if (scheme === 'SSF') {
    return {
      employee: Math.round(basicSalary * 0.11 * 100) / 100, // 11%
      employer: Math.round(basicSalary * 0.2 * 100) / 100, // 20%
    };
  } else {
    // Traditional EPF - configurable, default 10% each
    return {
      employee: Math.round(basicSalary * 0.1 * 100) / 100,
      employer: Math.round(basicSalary * 0.1 * 100) / 100,
    };
  }
}

/**
 * Calculate festival bonus (pro-rated based on service length)
 */
export function calculateFestivalBonus(
  basicSalary: number,
  joinDate: Date,
  fiscalYear: string,
  monthBs: number,
  festivalBonusMonthBs?: number
): number {
  // Default festival bonus month is Ashwin (6) or Kartik (7)
  const bonusMonth = festivalBonusMonthBs || 6;

  // Only calculate if current month is the bonus month
  if (monthBs !== bonusMonth) {
    return 0;
  }

  // Parse fiscal year
  const [startYear] = fiscalYear.split('/');
  const fyStartYear = parseInt(startYear);
  const _fyStartDate = new Date(fyStartYear - 57, 6, 16); // Approximate FY start

  // Calculate months of service up to bonus month
  const bonusDate = new Date(fyStartYear - 57, 8 + (bonusMonth - 4), 1); // Approximate
  const serviceMonths = Math.max(
    1,
    Math.ceil((bonusDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
  );

  // Pro-rate: if served full year, full bonus; otherwise pro-rated
  const proRatedBonus = (basicSalary * serviceMonths) / 12;

  return Math.round(proRatedBonus * 100) / 100;
}

/**
 * Calculate YTD taxable income and tax paid for an employee
 */
export async function getYTDTaxInfo(
  employeeId: string,
  fiscalYear: string,
  currentMonthBs: number
): Promise<{ ytdTaxableIncome: number; ytdTaxPaid: number }> {
  // Get all payrolls for this fiscal year up to (but not including) current month
  const payrolls = await prisma.payroll.findMany({
    where: {
      employeeId,
      fiscalYear,
      monthBs: {
        lt: currentMonthBs,
      },
      payrollRun: {
        status: 'FINALIZED',
      },
    },
  });

  let ytdTaxableIncome = 0;
  let ytdTaxPaid = 0;

  for (const payroll of payrolls) {
    const allowances = (payroll.allowances as Record<string, number>) || {};
    const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
    const gross = payroll.basicSalary + totalAllowances;
    const taxable = gross - payroll.ssfEmployee; // SSF is deducted from taxable income

    ytdTaxableIncome += taxable;
    ytdTaxPaid += payroll.taxTds;
  }

  return { ytdTaxableIncome, ytdTaxPaid };
}

/**
 * Calculate payroll for a single employee
 */
export async function calculateEmployeePayroll(
  employeeId: string,
  fiscalYear: string,
  monthBs: number,
  settings: {
    scheme: 'SSF' | 'TRADITIONAL';
    tdsConfig?: any;
    festivalBonusMonthBs?: number;
  },
  loanDeduction: number = 0
): Promise<{
  basicSalary: number;
  allowances: Record<string, number>;
  grossSalary: number;
  ssfEmployee: number;
  ssfEmployer: number;
  taxTds: number;
  loanDeduction: number;
  festivalBonus: number;
  netSalary: number;
}> {
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
  });

  if (!employee) {
    throw new Error('Employee not found');
  }

  const basicSalary = Number(employee.basicSalary);

  // Get allowances from employee settings or department/designation defaults
  // NOTE: Schema currently does not support allowances on Employee/Department models.
  // This should be implemented when the schema is updated to include allowance configurations.
  const allowances: Record<string, number> = {};
  const totalAllowances = Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
  const grossSalary = basicSalary + totalAllowances;

  // Calculate SSF
  const { employee: ssfEmployee, employer: ssfEmployer } = calculateSSF(
    basicSalary,
    settings.scheme
  );

  // Calculate taxable income (gross - SSF employee contribution)
  const monthlyTaxableIncome = grossSalary - ssfEmployee;

  // Get YTD info for annualized TDS calculation
  const { ytdTaxableIncome, ytdTaxPaid } = await getYTDTaxInfo(employeeId, fiscalYear, monthBs);

  // Calculate annualized TDS
  const taxTds = calculateAnnualizedTDS(
    monthlyTaxableIncome,
    fiscalYear,
    monthBs,
    ytdTaxableIncome,
    ytdTaxPaid,
    settings.tdsConfig
  );

  // Calculate festival bonus
  const festivalBonus = calculateFestivalBonus(
    basicSalary,
    employee.joinDate,
    fiscalYear,
    monthBs,
    settings.festivalBonusMonthBs
  );

  // Calculate net salary
  const netSalary = grossSalary + festivalBonus - ssfEmployee - taxTds - loanDeduction;

  return {
    basicSalary,
    allowances,
    grossSalary,
    ssfEmployee,
    ssfEmployer,
    taxTds,
    loanDeduction,
    festivalBonus,
    netSalary: Math.round(netSalary * 100) / 100,
  };
}
