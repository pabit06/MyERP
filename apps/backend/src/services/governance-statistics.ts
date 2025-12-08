import { prisma } from '../lib/prisma.js';

/**
 * Get committee meeting statistics
 */
export async function getCommitteeMeetingStats(
  cooperativeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  totalMeetings: number;
  meetingsByCommittee: Array<{
    committeeId: string;
    committeeName: string;
    meetingCount: number;
    decisions: number;
  }>;
}> {
  // Get all meetings in the period
  const meetings = await prisma.meeting.findMany({
    where: {
      cooperativeId,
      date: {
        gte: monthStart,
        lte: monthEnd,
      },
      meetingType: {
        in: ['board', 'committee'],
      },
    },
    include: {
      committee: {
        select: {
          id: true,
          name: true,
        },
      },
      agendas: {
        select: {
          id: true,
          decisionStatus: true,
        },
      },
    },
  });

  const totalMeetings = meetings.length;

  // Group by committee
  const committeeMap = new Map<
    string,
    {
      committeeId: string;
      committeeName: string;
      meetingCount: number;
      decisions: number;
    }
  >();

  for (const meeting of meetings) {
    const committeeId = meeting.committeeId || 'other';
    const committeeName = meeting.committee?.name || 'Other Meetings';

    if (!committeeMap.has(committeeId)) {
      committeeMap.set(committeeId, {
        committeeId,
        committeeName,
        meetingCount: 0,
        decisions: 0,
      });
    }

    const stats = committeeMap.get(committeeId)!;
    stats.meetingCount++;
    stats.decisions += meeting.agendas.filter(
      (a) => a.decisionStatus === 'PASSED' || a.decisionStatus === 'REJECTED'
    ).length;
  }

  const meetingsByCommittee = Array.from(committeeMap.values());

  return {
    totalMeetings,
    meetingsByCommittee,
  };
}

/**
 * Get member complaints
 * Note: This assumes a complaints table exists - may need to create one
 * For now, returning placeholder
 */
export async function getMemberComplaints(
  _cooperativeId: string,
  _monthStart: Date,
  _monthEnd: Date
): Promise<{
  totalComplaints: number;
  resolved: number;
  pending: number;
  complaints: Array<{
    id: string;
    memberId: string;
    memberName: string;
    subject: string;
    status: string;
    submittedDate: Date;
  }>;
}> {
  // Placeholder - would need to implement complaints table
  // For now, returning empty structure
  return {
    totalComplaints: 0,
    resolved: 0,
    pending: 0,
    complaints: [],
  };
}

/**
 * Get regulatory circulars
 * Note: This assumes a circulars table exists - may need to create one
 * For now, returning placeholder
 */
export async function getRegulatoryCirculars(
  _cooperativeId: string,
  _monthStart: Date,
  _monthEnd: Date
): Promise<{
  totalCirculars: number;
  circulars: Array<{
    id: string;
    title: string;
    source: string;
    receivedDate: Date;
    status: string;
  }>;
}> {
  // Placeholder - would need to implement circulars table
  // For now, returning empty structure
  return {
    totalCirculars: 0,
    circulars: [],
  };
}

/**
 * Get policy changes
 * Note: This could track changes to OfficialDocument table
 */
export async function getPolicyChanges(
  cooperativeId: string,
  monthStart: Date,
  monthEnd: Date
): Promise<{
  totalChanges: number;
  policies: Array<{
    id: string;
    title: string;
    documentType: string;
    version: string;
    updatedDate: Date;
  }>;
}> {
  // Get policy documents updated in the period
  const policies = await prisma.officialDocument.findMany({
    where: {
      cooperativeId,
      documentType: 'policy',
      updatedAt: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      title: true,
      documentType: true,
      version: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });

  return {
    totalChanges: policies.length,
    policies: policies.map((p) => ({
      id: p.id,
      title: p.title,
      documentType: p.documentType,
      version: p.version || '1.0',
      updatedDate: p.updatedAt,
    })),
  };
}
