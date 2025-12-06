import { prisma } from '../lib/prisma.js';

/**
 * Get loan approvals grouped by approval level
 */
export async function getLoanApprovalsByLevel(
  cooperativeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  managerApproved: { count: number; totalAmount: number };
  committeeApproved: { count: number; totalAmount: number };
  boardApproved: { count: number; totalAmount: number };
  total: { count: number; totalAmount: number };
}> {
  // Get all approved loans in the period
  // Note: Approval level breakdown would need to be determined based on business rules
  // (e.g., loan amount thresholds, or tracking approval workflow)
  // For now, grouping all approved loans together
  const loans = await prisma.loanApplication.findMany({
    where: {
      cooperativeId,
      status: {
        in: ['approved', 'disbursed'],
      },
      approvedDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      loanAmount: true,
      // approvalLevel field doesn't exist - would need to add or determine from workflow
    },
  });

  // Placeholder: All loans grouped together
  // In production, would need to determine approval level based on:
  // - Loan amount thresholds (e.g., < 100k = manager, 100k-500k = committee, > 500k = board)
  // - Or track approval workflow in a separate table
  const _totalAmount = loans.reduce((sum, loan) => sum + Number(loan.loanAmount), 0);

  const managerApproved = { count: 0, totalAmount: 0 };
  const committeeApproved = { count: 0, totalAmount: 0 };
  const boardApproved = { count: 0, totalAmount: 0 };

  // For now, distribute equally or use loan amount thresholds
  // This is a placeholder - should be replaced with actual business logic
  for (const loan of loans) {
    const amount = Number(loan.loanAmount);
    // Simple threshold-based logic (can be customized)
    if (amount < 100000) {
      managerApproved.count++;
      managerApproved.totalAmount += amount;
    } else if (amount < 500000) {
      committeeApproved.count++;
      committeeApproved.totalAmount += amount;
    } else {
      boardApproved.count++;
      boardApproved.totalAmount += amount;
    }
  }

  const total = {
    count: loans.length,
    totalAmount: loans.reduce((sum, loan) => sum + Number(loan.loanAmount), 0),
  };

  return {
    managerApproved,
    committeeApproved,
    boardApproved,
    total,
  };
}

/**
 * Get overdue loans (past due by specified days)
 */
export async function getOverdueLoans(
  cooperativeId: string,
  daysOverdue: number = 31
): Promise<
  Array<{
    id: string;
    applicationNumber: string;
    memberId: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
    disbursedDate: Date | null;
    daysOverdue: number;
    emiAmount: number;
  }>
> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOverdue);

  // Get all disbursed loans
  const loans = await prisma.loanApplication.findMany({
    where: {
      cooperativeId,
      status: {
        in: ['approved', 'disbursed'],
      },
      disbursedDate: {
        not: null,
        lte: cutoffDate,
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
      emiSchedule: {
        where: {
          dueDate: {
            lte: new Date(),
          },
          status: {
            not: 'paid',
          },
        },
        orderBy: {
          dueDate: 'desc',
        },
        take: 1,
      },
    },
  });

  const overdueLoans = loans
    .map((loan) => {
      if (!loan.disbursedDate) return null;

      const daysSinceDisbursement = Math.floor(
        (new Date().getTime() - loan.disbursedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check if there are unpaid EMIs
      const hasUnpaidEMI = loan.emiSchedule.length > 0;
      if (!hasUnpaidEMI && daysSinceDisbursement < daysOverdue) return null;

      const memberName =
        loan.member.memberType === 'INSTITUTION'
          ? loan.member.institutionName || 'Institution Member'
          : `${loan.member.firstName || ''} ${loan.member.middleName || ''} ${
              loan.member.lastName || ''
            }`.trim() || 'Member';

      // Calculate outstanding amount (simplified - would need to sum unpaid EMIs)
      const outstandingAmount = Number(loan.loanAmount); // Placeholder

      // Get EMI amount from schedule
      const emiAmount = loan.emiSchedule[0]?.totalAmount
        ? Number(loan.emiSchedule[0].totalAmount)
        : 0;

      return {
        id: loan.id,
        applicationNumber: loan.applicationNumber,
        memberId: loan.member.id,
        memberName,
        loanAmount: Number(loan.loanAmount),
        outstandingAmount,
        disbursedDate: loan.disbursedDate,
        daysOverdue: daysSinceDisbursement,
        emiAmount,
      };
    })
    .filter((loan): loan is NonNullable<typeof loan> => loan !== null)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  return overdueLoans;
}

/**
 * Get recovery statistics
 */
export async function getRecoveryStatistics(
  cooperativeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  totalRecovered: number;
  recoveryCount: number;
  pendingRecovery: number;
  recoveryRate: number;
}> {
  // Get paid EMIs in the period
  const paidEMIs = await prisma.eMISchedule.findMany({
    where: {
      cooperativeId,
      status: 'paid',
      paidDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      totalAmount: true,
    },
  });

  const totalRecovered = paidEMIs.reduce((sum, emi) => sum + Number(emi.totalAmount), 0);
  const recoveryCount = paidEMIs.length;

  // Get pending EMIs
  const pendingEMIs = await prisma.eMISchedule.count({
    where: {
      cooperativeId,
      status: {
        not: 'paid',
      },
      dueDate: {
        lte: new Date(),
      },
    },
  });

  const pendingRecovery = pendingEMIs; // Count of pending EMIs

  // Recovery rate (percentage of due EMIs that were paid)
  const totalDueEMIs = recoveryCount + pendingRecovery;
  const recoveryRate = totalDueEMIs > 0 ? (recoveryCount / totalDueEMIs) * 100 : 0;

  return {
    totalRecovered,
    recoveryCount,
    pendingRecovery,
    recoveryRate: Math.round(recoveryRate * 100) / 100,
  };
}

/**
 * Get charge-off loans (write-off candidates or completed)
 */
export async function getChargeOffLoans(cooperativeId: string): Promise<{
  writtenOff: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    writtenOffDate: Date;
  }>;
  writeOffCandidates: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    daysOverdue: number;
  }>;
}> {
  // Written-off loans
  const writtenOffLoans = await prisma.loanApplication.findMany({
    where: {
      cooperativeId,
      status: 'written_off',
    },
    include: {
      member: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          institutionName: true,
          memberType: true,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  const writtenOff = writtenOffLoans.map((loan) => {
    const memberName =
      loan.member.memberType === 'INSTITUTION'
        ? loan.member.institutionName || 'Institution Member'
        : `${loan.member.firstName || ''} ${loan.member.middleName || ''} ${
            loan.member.lastName || ''
          }`.trim() || 'Member';

    return {
      id: loan.id,
      applicationNumber: loan.applicationNumber,
      memberName,
      loanAmount: Number(loan.loanAmount),
      writtenOffDate: loan.updatedAt,
    };
  });

  // Write-off candidates (overdue > 180 days)
  const overdueLoans = await getOverdueLoans(cooperativeId, 180);
  const writeOffCandidates = overdueLoans.map((loan) => ({
    id: loan.id,
    applicationNumber: loan.applicationNumber,
    memberName: loan.memberName,
    loanAmount: loan.loanAmount,
    daysOverdue: loan.daysOverdue,
  }));

  return {
    writtenOff,
    writeOffCandidates,
  };
}

/**
 * Get insider lending (loans to directors, committee members, staff)
 */
export async function getInsiderLending(cooperativeId: string): Promise<{
  directorLoans: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
  }>;
  committeeLoans: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
  }>;
  staffLoans: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
  }>;
  totalInsiderLoans: number;
  totalInsiderAmount: number;
}> {
  // Get all active loans
  const allLoans = await prisma.loanApplication.findMany({
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
          firstName: true,
          middleName: true,
          lastName: true,
          institutionName: true,
          memberType: true,
        },
      },
    },
  });

  // Get committee members
  const committeeMembers = await prisma.committeeMember.findMany({
    where: {
      committee: {
        cooperativeId,
      },
      isActive: true,
    },
    include: {
      member: {
        select: {
          id: true,
        },
      },
    },
  });

  const committeeMemberIds = new Set(
    committeeMembers.map((cm) => cm.memberId).filter((id): id is string => id !== null)
  );

  // Get employees
  const _employees = await prisma.employee.findMany({
    where: {
      cooperativeId,
      status: 'active',
    },
    select: {
      id: true,
    },
  });

  // Note: Employee model doesn't have memberId field
  // If employees are linked to members, this would need to be adjusted
  const employeeMemberIds = new Set<string>();

  // Categorize loans
  const directorLoans: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
  }> = [];
  const committeeLoans: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
  }> = [];
  const staffLoans: Array<{
    id: string;
    applicationNumber: string;
    memberName: string;
    loanAmount: number;
    outstandingAmount: number;
  }> = [];

  for (const loan of allLoans) {
    const memberName =
      loan.member.memberType === 'INSTITUTION'
        ? loan.member.institutionName || 'Institution Member'
        : `${loan.member.firstName || ''} ${loan.member.middleName || ''} ${
            loan.member.lastName || ''
          }`.trim() || 'Member';

    const loanData = {
      id: loan.id,
      applicationNumber: loan.applicationNumber,
      memberName,
      loanAmount: Number(loan.loanAmount),
      outstandingAmount: Number(loan.loanAmount), // Placeholder - would calculate from EMIs
    };

    // Check if member is in committee (director/committee member)
    if (committeeMemberIds.has(loan.member.id)) {
      // Check if it's a board member (director) - would need to check committee type
      // For now, adding to both if in committee
      committeeLoans.push(loanData);
    }

    // Check if member is an employee
    if (employeeMemberIds.has(loan.member.id)) {
      staffLoans.push(loanData);
    }
  }

  const totalInsiderLoans = directorLoans.length + committeeLoans.length + staffLoans.length;
  const totalInsiderAmount =
    directorLoans.reduce((sum, l) => sum + l.loanAmount, 0) +
    committeeLoans.reduce((sum, l) => sum + l.loanAmount, 0) +
    staffLoans.reduce((sum, l) => sum + l.loanAmount, 0);

  return {
    directorLoans,
    committeeLoans,
    staffLoans,
    totalInsiderLoans,
    totalInsiderAmount,
  };
}
