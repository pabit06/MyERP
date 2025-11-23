import { prisma } from '../../lib/prisma.js';

/**
 * Calculate pro-rated leave quota for an employee based on join date
 * @param joinDate - Employee join date
 * @param fiscalYear - Fiscal year (e.g., "2082/83")
 * @param defaultQuota - Default annual quota for the leave type
 * @returns Pro-rated quota
 */
export function calculateProRatedQuota(
  joinDate: Date,
  fiscalYear: string,
  defaultQuota: number
): number {
  // Parse fiscal year (e.g., "2082/83")
  const [startYear] = fiscalYear.split('/');
  const fyStartYear = parseInt(startYear);

  // Fiscal year starts in Shrawan (approximately July 16)
  // For simplicity, we'll use a fixed date approximation
  // In production, use proper Nepali calendar conversion
  const fyStartDate = new Date(fyStartYear - 57, 6, 16); // Approximate: BS year - 57 = AD year, July 16
  const fyEndDate = new Date(fyStartYear - 56, 6, 15); // Next year July 15

  // If employee joined after FY start, calculate remaining months
  if (joinDate >= fyStartDate && joinDate <= fyEndDate) {
    const monthsRemaining = Math.max(
      1,
      Math.ceil((fyEndDate.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
    );
    const totalMonths = 12;
    return Math.round((defaultQuota * monthsRemaining) / totalMonths);
  }

  // If joined before FY, full quota
  if (joinDate < fyStartDate) {
    return defaultQuota;
  }

  // If joined after FY, no quota
  return 0;
}

/**
 * Get or create leave balance for an employee
 */
export async function getOrCreateLeaveBalance(
  employeeId: string,
  leaveTypeId: string,
  fiscalYear: string,
  defaultQuota: number,
  joinDate: Date
): Promise<{ id: string; totalQuota: number; usedDays: number }> {
  const balance = await prisma.employeeLeaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_fiscalYear: {
        employeeId,
        leaveTypeId,
        fiscalYear,
      },
    },
  });

  if (balance) {
    return balance;
  }

  // Calculate pro-rated quota
  const proRatedQuota = calculateProRatedQuota(joinDate, fiscalYear, defaultQuota);

  const newBalance = await prisma.employeeLeaveBalance.create({
    data: {
      employeeId,
      leaveTypeId,
      fiscalYear,
      totalQuota: proRatedQuota,
      usedDays: 0,
    },
  });

  return newBalance;
}

/**
 * Update leave balance when a leave request is approved
 * This should be called within a transaction
 */
export async function updateLeaveBalanceOnApproval(
  employeeId: string,
  leaveTypeId: string,
  fiscalYear: string,
  days: number
): Promise<void> {
  const balance = await prisma.employeeLeaveBalance.findUnique({
    where: {
      employeeId_leaveTypeId_fiscalYear: {
        employeeId,
        leaveTypeId,
        fiscalYear,
      },
    },
  });

  if (!balance) {
    throw new Error('Leave balance not found. Please initialize balance first.');
  }

  if (balance.usedDays + days > balance.totalQuota) {
    throw new Error(
      `Insufficient leave balance. Available: ${balance.totalQuota - balance.usedDays}, Requested: ${days}`
    );
  }

  await prisma.employeeLeaveBalance.update({
    where: {
      id: balance.id,
    },
    data: {
      usedDays: {
        increment: days,
      },
    },
  });
}

/**
 * Get leave balances for an employee for a fiscal year
 */
export async function getEmployeeLeaveBalances(
  employeeId: string,
  fiscalYear: string
): Promise<
  Array<{
    leaveType: { id: string; name: string; isPaid: boolean };
    totalQuota: number;
    usedDays: number;
    remaining: number;
  }>
> {
  const balances = await prisma.employeeLeaveBalance.findMany({
    where: {
      employeeId,
      fiscalYear,
    },
    include: {
      leaveType: {
        select: {
          id: true,
          name: true,
          isPaid: true,
        },
      },
    },
  });

  return balances.map((b) => ({
    leaveType: b.leaveType,
    totalQuota: b.totalQuota,
    usedDays: b.usedDays,
    remaining: b.totalQuota - b.usedDays,
  }));
}

/**
 * Initialize leave balances for all leave types when employee joins
 */
export async function initializeEmployeeLeaveBalances(
  employeeId: string,
  fiscalYear: string,
  joinDate: Date,
  cooperativeId: string
): Promise<void> {
  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      cooperativeId,
    },
  });

  for (const leaveType of leaveTypes) {
    const proRatedQuota = calculateProRatedQuota(
      joinDate,
      fiscalYear,
      leaveType.defaultAnnualQuota
    );

    await prisma.employeeLeaveBalance.upsert({
      where: {
        employeeId_leaveTypeId_fiscalYear: {
          employeeId,
          leaveTypeId: leaveType.id,
          fiscalYear,
        },
      },
      create: {
        employeeId,
        leaveTypeId: leaveType.id,
        fiscalYear,
        totalQuota: proRatedQuota,
        usedDays: 0,
      },
      update: {
        // Don't update if already exists
      },
    });
  }
}
