/**
 * Batch Loan Deduction Service for Payroll
 *
 * Optimized version that batches queries to avoid N+1 problems
 */

import { prisma } from '../../lib/prisma.js';

/**
 * Get loan deductions for multiple employees in a single batch query
 *
 * @param employeeIds - Array of employee IDs
 * @param cooperativeId - Cooperative ID
 * @param fiscalYear - Fiscal year (e.g., "2081/82")
 * @param monthBs - BS month (1-12)
 * @returns Map of employeeId -> deduction amount
 */
export async function getBatchEmployeeLoanDeductions(
  employeeIds: string[],
  cooperativeId: string,
  _fiscalYear: string,
  _monthBs: number
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  if (employeeIds.length === 0) {
    return result;
  }

  try {
    // Get all employees with their userIds
    const employees = await prisma.employee.findMany({
      where: {
        id: { in: employeeIds },
        userId: { not: null },
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (employees.length === 0) {
      return result;
    }

    const userIds = employees.map((emp) => emp.userId!);
    const employeeIdToUserId = new Map(employees.map((emp) => [emp.id, emp.userId!]));

    // Get all users with emails
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
      },
    });

    const userIdToEmail = new Map(users.map((user) => [user.id, user.email]));

    // Get all members by emails
    const emails = users.map((user) => user.email).filter(Boolean) as string[];
    if (emails.length === 0) {
      return result;
    }

    const members = await prisma.member.findMany({
      where: {
        cooperativeId,
        email: { in: emails },
        isActive: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    const emailToMemberId = new Map(members.map((m) => [m.email, m.id]));

    // Build map of employeeId -> memberId
    const employeeIdToMemberId = new Map<string, string>();
    for (const [employeeId, userId] of employeeIdToUserId.entries()) {
      const email = userIdToEmail.get(userId);
      if (email) {
        const memberId = emailToMemberId.get(email);
        if (memberId) {
          employeeIdToMemberId.set(employeeId, memberId);
        }
      }
    }

    const memberIds = Array.from(employeeIdToMemberId.values());
    if (memberIds.length === 0) {
      return result;
    }

    // Get all active loans for these members
    const activeLoans = await prisma.loanApplication.findMany({
      where: {
        memberId: { in: memberIds },
        cooperativeId,
        status: 'disbursed',
      },
      select: {
        id: true,
        memberId: true,
      },
    });

    // Build map of memberId -> loanIds
    const memberIdToLoanIds = new Map<string, string[]>();
    for (const loan of activeLoans) {
      if (!memberIdToLoanIds.has(loan.memberId)) {
        memberIdToLoanIds.set(loan.memberId, []);
      }
      memberIdToLoanIds.get(loan.memberId)!.push(loan.id);
    }

    const allLoanIds = activeLoans.map((loan) => loan.id);
    if (allLoanIds.length === 0) {
      return result;
    }

    // Get all pending EMI schedules for these loans
    const emiSchedules = await prisma.eMISchedule.findMany({
      where: {
        applicationId: { in: allLoanIds },
        status: 'pending',
      },
      select: {
        applicationId: true,
        totalAmount: true,
        dueDate: true,
      },
    });

    // Build map of loanId -> total EMI amount
    const loanIdToDeduction = new Map<string, number>();
    for (const emi of emiSchedules) {
      const current = loanIdToDeduction.get(emi.applicationId) || 0;
      loanIdToDeduction.set(emi.applicationId, current + Number(emi.totalAmount || 0));
    }

    // Calculate total deduction per member
    const memberIdToDeduction = new Map<string, number>();
    for (const [memberId, loanIds] of memberIdToLoanIds.entries()) {
      let total = 0;
      for (const loanId of loanIds) {
        total += loanIdToDeduction.get(loanId) || 0;
      }
      memberIdToDeduction.set(memberId, total);
    }

    // Map back to employeeId
    for (const [employeeId, memberId] of employeeIdToMemberId.entries()) {
      const deduction = memberIdToDeduction.get(memberId) || 0;
      result.set(employeeId, deduction);
    }

    return result;
  } catch (error) {
    console.error('Error calculating batch loan deductions:', error);
    // Return empty map on error to prevent payroll calculation failure
    return result;
  }
}
