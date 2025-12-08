/**
 * Loan Deduction Service for Payroll
 *
 * This service calculates loan deductions for employees from their active loans.
 * Employees can have loans if they are also members (linked via userId -> User -> Member).
 */

import { prisma } from '../../lib/prisma.js';
import { getBsMonthDates } from '../../lib/nepali-date.js';

/**
 * Get total loan deduction amount for an employee for a specific month
 *
 * @param employeeId - Employee ID
 * @param cooperativeId - Cooperative ID
 * @param fiscalYear - Fiscal year (e.g., "2081/82")
 * @param monthBs - BS month (1-12, Baishakh=1, Chaitra=12)
 * @returns Total loan deduction amount for the month
 */
export async function getEmployeeLoanDeduction(
  employeeId: string,
  cooperativeId: string,
  fiscalYear: string,
  monthBs: number
): Promise<number> {
  try {
    // Get employee with userId
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { userId: true },
    });

    if (!employee || !employee.userId) {
      // Employee not linked to a user, no loan deduction
      return 0;
    }

    // Find member linked to this user
    const user = await prisma.user.findUnique({
      where: { id: employee.userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return 0;
    }

    // Find member by email (users and members share email)
    // Note: This assumes email is unique and links User to Member
    // If your schema has a direct link, use that instead
    const member = await prisma.member.findFirst({
      where: {
        cooperativeId,
        email: user.email,
        isActive: true,
      },
      select: { id: true },
    });

    if (!member) {
      // Employee is not a member, no loan deduction
      return 0;
    }

    // Get active loan applications for this member
    const activeLoans = await prisma.loanApplication.findMany({
      where: {
        memberId: member.id,
        cooperativeId,
        status: 'disbursed', // Only active/disbursed loans
      },
      select: { id: true },
    });

    if (activeLoans.length === 0) {
      return 0;
    }

    // Parse fiscal year (e.g., "2081/82" -> 2081)
    const [startYearStr] = fiscalYear.split('/');
    const startYear = parseInt(startYearStr, 10);

    // Determine target BS year based on month
    // Fiscal Year starts in Shrawan (4).
    // Months 4-12 are in startYear.
    // Months 1-3 are in startYear + 1.
    const targetBsYear = monthBs >= 4 ? startYear : startYear + 1;

    // Get AD date range for the month
    const { monthStart, monthEnd } = getBsMonthDates(targetBsYear, monthBs);

    let totalDeduction = 0;

    for (const loan of activeLoans) {
      // Get EMI schedules for this loan that are due in the specific month
      const emiSchedules = await prisma.eMISchedule.findMany({
        where: {
          applicationId: loan.id,
          status: 'pending',
          dueDate: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          totalAmount: true,
        },
      });

      // Sum up the due amounts
      for (const emi of emiSchedules) {
        totalDeduction += Number(emi.totalAmount) || 0;
      }
    }

    return totalDeduction;
  } catch (error) {
    console.error('Error calculating loan deduction:', error);
    // Return 0 on error to prevent payroll calculation failure
    return 0;
  }
}
