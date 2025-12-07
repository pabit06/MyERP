/**
 * Loan Deduction Service for Payroll
 * 
 * This service calculates loan deductions for employees from their active loans.
 * Employees can have loans if they are also members (linked via userId -> User -> Member).
 */

import { prisma } from '../../lib/prisma.js';

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

    // Calculate total EMI for the month from all active loans
    // Convert fiscal year and month to date range for EMI schedule lookup
    // For now, we'll get EMI schedules due in the current month
    // Note: This is a simplified implementation - you may need to adjust based on your EMI schedule structure

    let totalDeduction = 0;

    for (const loan of activeLoans) {
      // Get EMI schedules for this loan that are due in the current month
      // This is a placeholder - adjust based on your actual EMI schedule structure
      const emiSchedules = await prisma.eMISchedule.findMany({
        where: {
          applicationId: loan.id,
          status: 'pending', // Only pending EMIs
        },
        select: {
          totalAmount: true,
          dueDate: true,
        },
      });

      // Filter EMIs due in the current month
      // Note: You'll need to implement proper date matching based on fiscal year and monthBs
      // For now, this is a placeholder that sums all pending EMIs
      // TODO: Implement proper date-based filtering for the specific month
      for (const emi of emiSchedules) {
        // Add logic to check if EMI is due in the specified month
        // This requires converting fiscalYear and monthBs to a date range
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
