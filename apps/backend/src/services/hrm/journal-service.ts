import { createJournalEntry } from '../accounting.js';
import { prisma } from '../../lib/prisma.js';

/**
 * Create aggregated journal entry for a payroll run
 */
export async function createPayrollJournalEntry(
  payrollRunId: string
): Promise<{ journalEntryId: string }> {
  const payrollRun = await prisma.payrollRun.findUnique({
    where: { id: payrollRunId },
    include: {
      payrolls: {
        include: {
          employee: {
            select: {
              code: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      cooperative: true,
    },
  });

  if (!payrollRun) {
    throw new Error('Payroll run not found');
  }

  if (payrollRun.status === 'FINALIZED') {
    throw new Error('Payroll run already finalized');
  }

  // Get payroll settings separately since it's a one-to-one relation
  const settings = await prisma.payrollSettings.findUnique({
    where: { cooperativeId: payrollRun.cooperativeId },
  });

  if (!settings) {
    throw new Error('Payroll settings not configured');
  }

  // Aggregate totals
  let totalBasic = 0;
  let totalAllowances = 0;
  let totalFestivalBonus = 0;
  let totalSsfEmployee = 0;
  let totalSsfEmployer = 0;
  let totalTds = 0;
  let totalLoanDeduction = 0;
  let totalNetPay = 0;

  for (const payroll of payrollRun.payrolls) {
    totalBasic += payroll.basicSalary;
    const allowances = (payroll.allowances as Record<string, number>) || {};
    totalAllowances += Object.values(allowances).reduce((sum, val) => sum + (val || 0), 0);
    totalFestivalBonus += payroll.festivalBonus;
    totalSsfEmployee += payroll.ssfEmployee;
    totalSsfEmployer += payroll.ssfEmployer;
    totalTds += payroll.taxTds;
    totalLoanDeduction += payroll.loanDeduction;
    totalNetPay += payroll.netSalary;
  }

  const totalSalaryExpense = totalBasic + totalAllowances + totalFestivalBonus;
  const totalSsfPayable = totalSsfEmployee + totalSsfEmployer;

  // Create journal entry
  const monthNames = [
    'Baishakh',
    'Jestha',
    'Ashadh',
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
  const monthName = monthNames[payrollRun.monthBs - 1] || `Month ${payrollRun.monthBs}`;

  const description = `Payroll for ${monthName} ${payrollRun.fiscalYear} - ${payrollRun.payrolls.length} employees`;

  const entries = [
    // Dr. Salary Expense
    {
      accountId: settings.glSalaryExpense,
      debit: totalSalaryExpense,
      credit: 0,
    },
    // Dr. SSF Expense (Employer contribution)
    {
      accountId: settings.glSsfExpense,
      debit: totalSsfEmployer,
      credit: 0,
    },
    // Cr. TDS Payable
    {
      accountId: settings.glTdsPayable,
      debit: 0,
      credit: totalTds,
    },
    // Cr. SSF Payable (Employee + Employer)
    {
      accountId: settings.glSsfPayable,
      debit: 0,
      credit: totalSsfPayable,
    },
    // Cr. Staff Loan Receivable (if any deductions)
    ...(totalLoanDeduction > 0
      ? [
          {
            accountId: settings.glStaffLoanReceivable,
            debit: 0,
            credit: totalLoanDeduction,
          },
        ]
      : []),
    // Cr. Cash/Bank
    {
      accountId: settings.glCashOrBank,
      debit: 0,
      credit: totalNetPay,
    },
  ];

  const { journalEntry } = await createJournalEntry(
    payrollRun.cooperativeId,
    description,
    entries,
    new Date() // Use current date, or could use month end date
  );

  // Update payroll run with journal entry ID
  await prisma.payrollRun.update({
    where: { id: payrollRunId },
    data: {
      journalEntryId: journalEntry.id,
      status: 'FINALIZED',
      finalizedAt: new Date(),
      totalBasic,
      totalNetPay,
      totalSSF: totalSsfPayable,
      totalTDS: totalTds,
    },
  });

  return { journalEntryId: journalEntry.id };
}
