import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { saveUploadedFile, deleteFile } from '../lib/upload.js';
import { auditLogFromRequest } from '../lib/audit.js';
import { generateMeetingNumber } from '../lib/meeting-number.js';
import { sendMeetingNotifications } from '../lib/notifications.js';
import { fetchReportData } from '../services/report-data-fetcher.js';

const router: Router = Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, Word documents, and images
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, Word documents, and images are allowed.'));
    }
  },
});

// All routes require authentication, tenant context, and governance module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('governance'));

/**
 * GET /api/governance/meetings
 * Get all meetings (with pagination, search, and filtering)
 * Query params: page, limit, search, meetingType, status, startDate, endDate
 */
router.get('/meetings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { page = '1', limit = '20', search, meetingType, status, startDate, endDate } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (meetingType) {
      where.meetingType = meetingType as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate as string);
      }
    }

    // Get total count
    const total = await prisma.meeting.count({ where });

    // Fetch meetings
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        _count: {
          select: {
            minutes: true,
          },
        },
        committee: {
          select: {
            id: true,
            name: true,
            nameNepali: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Audit log
    await auditLogFromRequest(req, 'view', 'meeting', undefined, {
      filters: { search, meetingType, status },
    });

    res.json({
      meetings,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/meetings
 * Create a new meeting
 */
router.post('/meetings', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId || req.user!.id;
    const {
      title,
      description,
      meetingType,
      scheduledDate,
      date, // New field name
      startTime,
      endTime,
      location,
      committeeId,
      attendees,
      assignPendingAgendaItems, // Array of member IDs to assign to this meeting
    } = req.body;

    // Use date if provided, otherwise fall back to scheduledDate for backward compatibility
    const meetingDate = date || scheduledDate;
    if (!title || !meetingType || !meetingDate) {
      res.status(400).json({
        error: 'Missing required fields: title, meetingType, date (or scheduledDate)',
      });
      return;
    }

    // Helper function to safely parse dates
    const parseDate = (dateString: string | undefined | null): Date | null => {
      if (!dateString || dateString.trim() === '') return null;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    // Generate meeting number
    const meetingNo = await generateMeetingNumber(tenantId);

    // Get committee default allowance rate if committeeId is provided
    let defaultAllowanceRate = 0;
    if (committeeId) {
      const committee = await prisma.committee.findFirst({
        where: {
          id: committeeId,
          cooperativeId: tenantId,
        },
      });
      if (committee) {
        defaultAllowanceRate = Number(committee.defaultAllowanceRate) || 0;
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        cooperativeId: tenantId,
        title,
        description,
        meetingType,
        meetingNo,
        date: new Date(meetingDate),
        scheduledDate: new Date(meetingDate), // Keep for backward compatibility
        startTime: parseDate(startTime),
        endTime: parseDate(endTime),
        location,
        committeeId: committeeId || null,
        status: 'PLANNED',
        workflowStatus: 'DRAFT',
        baseAllowance: defaultAllowanceRate,
        createdBy: userId,
        attendees: attendees ? attendees : null,
      },
    });

    // Copy active committee members to MeetingAttendee if committeeId is provided
    if (committeeId) {
      const activeMembers = await prisma.committeeMember.findMany({
        where: {
          committeeId,
          isActive: true,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              middleName: true,
              institutionName: true,
              memberType: true,
            },
          },
        },
      });

      if (activeMembers.length > 0) {
        await prisma.meetingAttendee.createMany({
          data: activeMembers.map((cm) => ({
            meetingId: meeting.id,
            committeeMemberId: cm.id,
            name:
              cm.member.memberType === 'INSTITUTION'
                ? cm.member.institutionName || 'Institution Member'
                : `${cm.member.firstName || ''} ${cm.member.middleName || ''} ${cm.member.lastName || ''}`.trim() ||
                  'Member',
            role: 'Member',
            isPresent: false,
            allowance: defaultAllowanceRate,
            tdsAmount: defaultAllowanceRate * 0.15,
            netAmount: defaultAllowanceRate * 0.85,
            isPaid: false,
          })),
        });
      }
    }

    // If pending agenda items are provided, assign them to this meeting
    if (
      assignPendingAgendaItems &&
      Array.isArray(assignPendingAgendaItems) &&
      assignPendingAgendaItems.length > 0
    ) {
      await prisma.memberKYC.updateMany({
        where: {
          cooperativeId: tenantId,
          memberId: {
            in: assignPendingAgendaItems,
          },
          bodMeetingId: null, // Only assign unassigned ones
        },
        data: {
          bodMeetingId: meeting.id,
        },
      });

      // Get all members to be approved
      const members = await prisma.member.findMany({
        where: {
          id: { in: assignPendingAgendaItems },
          cooperativeId: tenantId,
        },
      });

      // Create description with all members
      const memberDescriptions = members
        .map((member) => {
          const memberName =
            member.memberType === 'INSTITUTION'
              ? member.institutionName || 'Institution Member'
              : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                'Member';
          return `${memberName} (Member #: ${member.memberNumber || 'Pending'}) - KYM approval for membership`;
        })
        .join('\n');

      // Check if "सदस्यता अनुमोदन" agenda item already exists
      const existingAgenda = await prisma.meetingAgenda.findFirst({
        where: {
          meetingId: meeting.id,
          title: 'सदस्यता अनुमोदन',
        },
      });

      if (existingAgenda) {
        // Update existing agenda item to include new members
        const existingDescription = existingAgenda.description || '';
        const updatedDescription = existingDescription
          ? `${existingDescription}\n${memberDescriptions}`
          : memberDescriptions;

        await prisma.meetingAgenda.update({
          where: { id: existingAgenda.id },
          data: { description: updatedDescription },
        });
      } else {
        // Create new agenda item for "सदस्यता अनुमोदन"
        // Get the highest order number
        const maxOrder = await prisma.meetingAgenda.findFirst({
          where: { meetingId: meeting.id },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        await prisma.meetingAgenda.create({
          data: {
            meetingId: meeting.id,
            title: 'सदस्यता अनुमोदन',
            description: memberDescriptions,
            order: (maxOrder?.order ?? -1) + 1,
            decisionStatus: 'PENDING',
          },
        });
      }
    }

    // Audit log
    await auditLogFromRequest(req, 'create', 'meeting', meeting.id, {
      title: meeting.title,
      meetingType: meeting.meetingType,
    });

    res.status(201).json({ meeting });
  } catch (error: any) {
    console.error('Create meeting error:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';
    console.error('Error details:', { errorMessage, errorCode, stack: error?.stack });

    // Provide more specific error messages
    if (errorCode === 'P2002') {
      res.status(400).json({ error: 'A meeting with this information already exists' });
    } else if (errorCode === 'P2003') {
      res.status(400).json({ error: 'Invalid reference. Please check related records.' });
    } else if (errorMessage.includes('Invalid date') || errorMessage.includes('date')) {
      res.status(400).json({ error: 'Invalid date format. Please check the date fields.' });
    } else {
      res.status(500).json({ error: 'Internal server error', details: errorMessage });
    }
  }
});

/**
 * GET /api/governance/meetings/:id
 * Get a specific meeting with minutes and pending agenda items
 */
router.get('/meetings/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        minutes: true,
        committee: {
          select: {
            id: true,
            name: true,
            nameNepali: true,
            defaultAllowanceRate: true,
          },
        },
        agendas: {
          orderBy: {
            order: 'asc',
          },
        },
        meetingAttendees: {
          include: {
            committeeMember: {
              include: {
                member: {
                  select: {
                    id: true,
                    memberNumber: true,
                    firstName: true,
                    lastName: true,
                    middleName: true,
                    institutionName: true,
                    memberType: true,
                  },
                },
              },
            },
          },
        },
        managerReports: {
          select: {
            id: true,
            title: true,
            fiscalYear: true,
            month: true,
            finalizedAt: true,
          },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Get pending member approvals (sadasyata anumodan) for this meeting
    // First get assigned to this meeting
    const assignedMemberApprovals = await prisma.memberKYC.findMany({
      where: {
        cooperativeId: tenantId,
        bodMeetingId: id,
        member: {
          workflowStatus: 'bod_pending',
        },
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            institutionName: true,
            memberType: true,
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    // Get all pending member approvals (not assigned to any meeting yet)
    const allPendingMemberApprovals = await prisma.memberKYC.findMany({
      where: {
        cooperativeId: tenantId,
        bodMeetingId: null, // Not assigned to any meeting
        member: {
          workflowStatus: 'bod_pending',
        },
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            institutionName: true,
            memberType: true,
          },
        },
      },
      orderBy: {
        completedAt: 'asc',
      },
    });

    const pendingMemberApprovals = assignedMemberApprovals;

    // Format pending agenda items
    const pendingAgendaItems = pendingMemberApprovals.map((kyc) => {
      const member = kyc.member;
      const memberName =
        member.memberType === 'INSTITUTION'
          ? member.institutionName || 'Institution Member'
          : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
            'Member';

      return {
        id: kyc.id,
        type: 'member_approval',
        title: 'सदस्यता अनुमोदन (Member Approval)',
        description: `${memberName} (Member #: ${member.memberNumber || 'Pending'}) - KYM approval for membership`,
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: memberName,
        submittedAt: kyc.completedAt,
      };
    });

    // Format unassigned pending agenda items
    const unassignedPendingAgendaItems = allPendingMemberApprovals.map((kyc) => {
      const member = kyc.member;
      const memberName =
        member.memberType === 'INSTITUTION'
          ? member.institutionName || 'Institution Member'
          : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
            'Member';

      return {
        id: kyc.id,
        type: 'member_approval',
        title: 'सदस्यता अनुमोदन (Member Approval)',
        description: `${memberName} (Member #: ${member.memberNumber || 'Pending'}) - KYM approval for membership`,
        memberId: member.id,
        memberNumber: member.memberNumber,
        memberName: memberName,
        submittedAt: kyc.completedAt,
      };
    });

    res.json({
      meeting,
      pendingAgendaItems,
      unassignedPendingAgendaItems, // Pending agendas not yet assigned to any meeting
    });
  } catch (error: any) {
    console.error('Get meeting error:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';

    // Check if it's a Prisma error about missing tables/columns
    if (
      errorCode === 'P2021' ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('Unknown column')
    ) {
      res.status(500).json({
        error:
          'Database schema not migrated. Please run: pnpm --filter @myerp/db-schema prisma db push',
        details: errorMessage,
      });
      return;
    }

    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

/**
 * DELETE /api/governance/meetings/:id
 * Delete a meeting and unassign pending agenda items
 */
router.delete('/meetings/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Prevent deleting finalized meetings (optional safety check)
    if (meeting.workflowStatus === 'FINALIZED') {
      res
        .status(400)
        .json({ error: 'Cannot delete finalized meeting. Please contact administrator.' });
      return;
    }

    // Unassign pending agenda items (MemberKYC records) from this meeting
    await prisma.memberKYC.updateMany({
      where: {
        cooperativeId: tenantId,
        bodMeetingId: id,
      },
      data: {
        bodMeetingId: null,
      },
    });

    // Delete the meeting (cascade will handle related records)
    await prisma.meeting.delete({
      where: { id },
    });

    // Audit log
    await auditLogFromRequest(req, 'delete', 'meeting', id, { title: meeting.title });

    res.json({
      message: 'Meeting deleted successfully. Pending agenda items have been unassigned.',
    });
  } catch (error: any) {
    console.error('Delete meeting error:', error);
    const errorMessage = error?.message || 'Unknown error';
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

/**
 * POST /api/governance/meetings/:id/agenda
 * Add agenda item to meeting
 */
router.post('/meetings/:id/agenda', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { title, description } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Agenda title is required' });
      return;
    }

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Only allow adding agendas if workflowStatus is DRAFT
    if (meeting.workflowStatus !== 'DRAFT') {
      res.status(400).json({ error: 'Cannot add agenda. Meeting is locked or finalized.' });
      return;
    }

    // Get the highest order number
    const lastAgenda = await prisma.meetingAgenda.findFirst({
      where: { meetingId: id },
      orderBy: { order: 'desc' },
    });

    const nextOrder = lastAgenda ? lastAgenda.order + 1 : 0;

    const agenda = await prisma.meetingAgenda.create({
      data: {
        meetingId: id,
        title,
        description,
        order: nextOrder,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'create', 'meeting_agenda', agenda.id, { meetingId: id, title });

    res.status(201).json({ agenda });
  } catch (error) {
    console.error('Add agenda error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/meetings/:id/agenda/:agendaId
 * Update agenda item
 */
router.put('/meetings/:id/agenda/:agendaId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id, agendaId } = req.params;
    const { title, description, order } = req.body;

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Only allow updating agendas if workflowStatus is DRAFT
    if (meeting.workflowStatus !== 'DRAFT') {
      res.status(400).json({ error: 'Cannot update agenda. Meeting is locked or finalized.' });
      return;
    }

    // Verify agenda belongs to this meeting
    const agenda = await prisma.meetingAgenda.findFirst({
      where: {
        id: agendaId,
        meetingId: id,
      },
    });

    if (!agenda) {
      res.status(404).json({ error: 'Agenda item not found' });
      return;
    }

    const updatedAgenda = await prisma.meetingAgenda.update({
      where: { id: agendaId },
      data: {
        title: title !== undefined ? title : agenda.title,
        description: description !== undefined ? description : agenda.description,
        order: order !== undefined ? order : agenda.order,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting_agenda', agendaId, { meetingId: id });

    res.json({ agenda: updatedAgenda });
  } catch (error) {
    console.error('Update agenda error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/governance/meetings/:id/agenda/:agendaId
 * Delete agenda item
 */
router.delete('/meetings/:id/agenda/:agendaId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id, agendaId } = req.params;

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Only allow deleting agendas if workflowStatus is DRAFT
    if (meeting.workflowStatus !== 'DRAFT') {
      res.status(400).json({ error: 'Cannot delete agenda. Meeting is locked or finalized.' });
      return;
    }

    // Verify agenda belongs to this meeting
    const agenda = await prisma.meetingAgenda.findFirst({
      where: {
        id: agendaId,
        meetingId: id,
      },
    });

    if (!agenda) {
      res.status(404).json({ error: 'Agenda item not found' });
      return;
    }

    await prisma.meetingAgenda.delete({
      where: { id: agendaId },
    });

    // Audit log
    await auditLogFromRequest(req, 'delete', 'meeting_agenda', agendaId, {
      meetingId: id,
      title: agenda.title,
    });

    res.json({ message: 'Agenda item deleted successfully' });
  } catch (error) {
    console.error('Delete agenda error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/meetings/:id/schedule
 * Finalize schedule and send notifications
 */
router.post('/meetings/:id/schedule', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        committee: {
          include: {
            members: {
              where: { isActive: true },
              include: {
                member: {
                  select: {
                    id: true,
                    phone: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        meetingAttendees: {
          include: {
            committeeMember: {
              include: {
                member: {
                  select: {
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Validate date and location are set
    const meetingDate = meeting.date || meeting.scheduledDate;
    if (!meetingDate) {
      res.status(400).json({ error: 'Meeting date must be set before scheduling' });
      return;
    }

    if (!meeting.location) {
      res.status(400).json({ error: 'Meeting location must be set before scheduling' });
      return;
    }

    // Only allow scheduling if status is PLANNED
    if (meeting.status !== 'PLANNED') {
      res.status(400).json({ error: 'Meeting can only be scheduled when status is PLANNED' });
      return;
    }

    // Update status to SCHEDULED and workflowStatus to LOCKED
    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        status: 'SCHEDULED',
        workflowStatus: 'LOCKED',
      },
    });

    // Send notifications using notification service
    const meetingTime = meeting.startTime
      ? new Date(meeting.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    const attendees = meeting.meetingAttendees.map((attendee) => ({
      phone: attendee.committeeMember?.member?.phone || null,
      email: null, // TODO: Add email to member model if needed
      userId: attendee.committeeMember?.member?.id || null,
    }));

    const notificationCount = await sendMeetingNotifications(
      tenantId,
      meeting.committee?.name || meeting.title || 'Meeting',
      meetingDate,
      meetingTime,
      meeting.location || null,
      attendees
    );

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting', id, {
      action: 'schedule',
      status: 'SCHEDULED',
      workflowStatus: 'LOCKED',
      notificationsSent: notificationCount,
    });

    res.json({
      meeting: updatedMeeting,
      message: 'Meeting scheduled successfully',
      notificationsSent: notificationCount,
    });
  } catch (error) {
    console.error('Schedule meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/meetings/:id
 * Update a meeting
 */
router.put('/meetings/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      title,
      description,
      scheduledDate,
      startTime,
      endTime,
      location,
      status,
      attendees,
      assignPendingAgendaItems,
      committeeId,
    } = req.body;

    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Prevent editing if finalized
    if (meeting.workflowStatus === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot edit finalized meeting' });
      return;
    }

    // Prevent changing date/time if locked
    const workflowStatus = req.body.workflowStatus;
    if (
      meeting.workflowStatus === 'LOCKED' &&
      (scheduledDate || req.body.date || startTime || endTime || location)
    ) {
      res.status(400).json({ error: 'Cannot change date, time, or location. Meeting is locked.' });
      return;
    }

    // Helper function to safely parse dates
    const parseDate = (dateString: string | undefined | null): Date | null | undefined => {
      if (dateString === undefined) return undefined;
      if (!dateString || dateString.trim() === '') return null;
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    };

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (scheduledDate || req.body.date) {
      const meetingDate = req.body.date || scheduledDate;
      updateData.date = new Date(meetingDate);
      updateData.scheduledDate = new Date(meetingDate); // Keep for backward compatibility
    }
    if (startTime !== undefined) updateData.startTime = parseDate(startTime);
    if (endTime !== undefined) updateData.endTime = parseDate(endTime);
    if (location !== undefined) updateData.location = location;
    if (status !== undefined) updateData.status = status;
    if (workflowStatus !== undefined) updateData.workflowStatus = workflowStatus;
    if (attendees !== undefined) updateData.attendees = attendees;
    if (committeeId !== undefined) updateData.committeeId = committeeId;

    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting', id, {
      oldTitle: meeting.title,
      newTitle: title,
      statusChanged: status !== meeting.status,
      changes: { title, status, committeeId },
    });

    // If pending agenda items are provided, assign them to this meeting
    if (
      assignPendingAgendaItems &&
      Array.isArray(assignPendingAgendaItems) &&
      assignPendingAgendaItems.length > 0
    ) {
      await prisma.memberKYC.updateMany({
        where: {
          cooperativeId: tenantId,
          memberId: {
            in: assignPendingAgendaItems,
          },
          bodMeetingId: null, // Only assign unassigned ones
        },
        data: {
          bodMeetingId: id,
        },
      });

      // Get all members to be approved
      const members = await prisma.member.findMany({
        where: {
          id: { in: assignPendingAgendaItems },
          cooperativeId: tenantId,
        },
      });

      // Create description with all members
      const memberDescriptions = members
        .map((member) => {
          const memberName =
            member.memberType === 'INSTITUTION'
              ? member.institutionName || 'Institution Member'
              : `${member.firstName || ''} ${member.middleName || ''} ${member.lastName || ''}`.trim() ||
                'Member';
          return `${memberName} (Member #: ${member.memberNumber || 'Pending'}) - KYM approval for membership`;
        })
        .join('\n');

      // Check if "सदस्यता अनुमोदन" agenda item already exists
      const existingAgenda = await prisma.meetingAgenda.findFirst({
        where: {
          meetingId: id,
          title: 'सदस्यता अनुमोदन',
        },
      });

      if (existingAgenda) {
        // Update existing agenda item to include new members
        const existingDescription = existingAgenda.description || '';
        const updatedDescription = existingDescription
          ? `${existingDescription}\n${memberDescriptions}`
          : memberDescriptions;

        await prisma.meetingAgenda.update({
          where: { id: existingAgenda.id },
          data: { description: updatedDescription },
        });
      } else {
        // Create new agenda item for "सदस्यता अनुमोदन"
        // Get the highest order number
        const maxOrder = await prisma.meetingAgenda.findFirst({
          where: { meetingId: id },
          orderBy: { order: 'desc' },
          select: { order: true },
        });

        await prisma.meetingAgenda.create({
          data: {
            meetingId: id,
            title: 'सदस्यता अनुमोदन',
            description: memberDescriptions,
            order: (maxOrder?.order ?? -1) + 1,
            decisionStatus: 'PENDING',
          },
        });
      }
    }

    res.json({ meeting: updatedMeeting });
  } catch (error) {
    console.error('Update meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/meetings/:id/approve-member
 * Approve member from meeting (with approval date and decision number)
 */
router.post('/meetings/:id/approve-member', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: meetingId } = req.params;
    const { memberId, approvalDate, decisionNumber, remarks } = req.body;

    if (!memberId) {
      res.status(400).json({ error: 'Member ID is required' });
      return;
    }

    // Verify meeting exists
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Verify member exists and is pending BOD approval
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
        workflowStatus: 'bod_pending',
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found or not pending BOD approval' });
      return;
    }

    // Get member KYC
    const memberKYC = await prisma.memberKYC.findUnique({
      where: { memberId },
    });

    if (!memberKYC) {
      res.status(404).json({ error: 'Member KYC not found' });
      return;
    }

    // Verify member is assigned to this meeting
    if (memberKYC.bodMeetingId !== meetingId) {
      res.status(400).json({ error: 'Member is not assigned to this meeting' });
      return;
    }

    // Update KYM with BOD approval details
    await prisma.memberKYC.update({
      where: { memberId },
      data: {
        bodApprovedAt: approvalDate ? new Date(approvalDate) : new Date(),
        remarks: remarks || memberKYC.remarks || undefined,
      },
    });

    // Generate member number if not already assigned
    let memberNumber = member.memberNumber;
    if (!memberNumber) {
      const { generateMemberNumber } = await import('../lib/member-number.js');
      memberNumber = await generateMemberNumber(tenantId);
    }

    // Update member workflow status to active
    await prisma.member.update({
      where: { id: memberId },
      data: {
        workflowStatus: 'active',
        isActive: true,
        memberNumber: memberNumber || member.memberNumber,
      },
    });

    // Auto-post share capital and entry fee if not already done
    try {
      const kyc = memberKYC;
      if (kyc) {
        const { postShareCapital, postEntryFee, getCurrentSharePrice } = await import(
          '../services/accounting.js'
        );
        const { amlEvents, AML_EVENTS } = await import('../lib/events.js');

        const initialShareAmount = kyc.initialShareAmount ? Number(kyc.initialShareAmount) : 0;
        const entryFeeAmount = kyc.initialOtherAmount ? Number(kyc.initialOtherAmount) : 0;

        if (initialShareAmount > 0 && memberNumber) {
          const sharePrice = await getCurrentSharePrice(tenantId, 100);
          const shares = Math.floor(initialShareAmount / sharePrice);

          if (shares > 0) {
            let shareLedger = await prisma.shareLedger.findUnique({
              where: { memberId },
            });

            if (!shareLedger) {
              shareLedger = await prisma.shareLedger.create({
                data: {
                  memberId,
                  cooperativeId: tenantId,
                  totalShares: 0,
                  shareValue: sharePrice,
                },
              });
            }

            // Check if share transaction already exists
            const existingTransaction = await prisma.shareTransaction.findFirst({
              where: {
                memberId,
                type: 'purchase',
                remarks: {
                  contains: 'Initial share purchase',
                },
              },
            });

            if (!existingTransaction) {
              const year = new Date().getFullYear();
              const txCount = await prisma.shareTransaction.count({
                where: {
                  cooperativeId: tenantId,
                  transactionDate: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${year + 1}-01-01`),
                  },
                },
              });
              const transactionNumber = `SHARE-${year}-${String(txCount + 1).padStart(4, '0')}`;

              const shareTransaction = await prisma.shareTransaction.create({
                data: {
                  transactionNumber,
                  ledgerId: shareLedger.id,
                  memberId,
                  cooperativeId: tenantId,
                  type: 'purchase',
                  shares,
                  amount: shares * sharePrice,
                  sharePrice,
                  transactionDate: approvalDate ? new Date(approvalDate) : new Date(),
                  remarks: 'Initial share purchase upon BOD approval',
                },
              });

              await prisma.shareLedger.update({
                where: { id: shareLedger.id },
                data: {
                  totalShares: shareLedger.totalShares + shares,
                  shareValue: sharePrice,
                },
              });

              await postShareCapital(
                tenantId,
                shares * sharePrice,
                memberId,
                memberNumber,
                sharePrice,
                shares,
                approvalDate ? new Date(approvalDate) : new Date()
              );

              amlEvents.emit(AML_EVENTS.ON_SHARE_PURCHASE, {
                memberId,
                amount: shares * sharePrice,
                currency: 'NPR',
                isCash: true,
                transactionId: shareTransaction.id,
                occurredOn: shareTransaction.transactionDate,
                transactionType: 'share_purchase',
                counterpartyType: 'MEMBER',
              });
            }
          }
        }

        if (entryFeeAmount > 0 && memberNumber) {
          await postEntryFee(
            tenantId,
            entryFeeAmount,
            memberId,
            memberNumber,
            approvalDate ? new Date(approvalDate) : new Date()
          );
        }
      }
    } catch (accountingError) {
      console.error('Error posting to ledger during BOD approval:', accountingError);
      // Don't fail the request if accounting posting fails
    }

    // Create workflow history entry
    await prisma.memberWorkflowHistory.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        fromStatus: member.workflowStatus,
        toStatus: 'active',
        action: 'bod_approved',
        performedBy: req.user!.userId,
        remarks:
          remarks || `Approved by Board of Directors - Decision #: ${decisionNumber || 'N/A'}`,
      },
    });

    res.json({
      message: 'Member approved by BOD and activated successfully',
      workflowStatus: 'active',
      memberNumber,
    });
  } catch (error) {
    console.error('Approve member from meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/meetings/:id/minutes
 * Update MeetingAgenda decision and decisionStatus
 */
router.put('/meetings/:id/minutes', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { agendas } = req.body; // Array of { id, decision, decisionStatus }

    if (!Array.isArray(agendas)) {
      res.status(400).json({ error: 'agendas must be an array' });
      return;
    }

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Only allow updating minutes if status is SCHEDULED or COMPLETED
    if (meeting.status !== 'SCHEDULED' && meeting.status !== 'COMPLETED') {
      res
        .status(400)
        .json({ error: 'Can only record minutes for scheduled or completed meetings' });
      return;
    }

    // Prevent editing if finalized
    if (meeting.workflowStatus === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot update minutes. Meeting is finalized.' });
      return;
    }

    // Update each agenda item
    const updatePromises = agendas.map(async (agendaItem: any) => {
      return prisma.meetingAgenda.update({
        where: { id: agendaItem.id },
        data: {
          decision: agendaItem.decision !== undefined ? agendaItem.decision : null,
          decisionStatus: agendaItem.decisionStatus || 'PENDING',
        },
      });
    });

    await Promise.all(updatePromises);

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting_minutes', id, {
      agendasCount: agendas.length,
    });

    res.json({ message: 'Minutes updated successfully' });
  } catch (error) {
    console.error('Update meeting minutes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/meetings/:id/upload-minutes-file
 * Upload meeting minutes file (PDF, Word, Images)
 */
router.post(
  '/meetings/:id/upload-minutes-file',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { id } = req.params;

      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Verify meeting exists and belongs to cooperative
      const meeting = await prisma.meeting.findFirst({
        where: {
          id,
          cooperativeId: tenantId,
        },
      });

      if (!meeting) {
        res.status(404).json({ error: 'Meeting not found' });
        return;
      }

      // Check if minutes are finalized
      if (meeting.minutesStatus === 'FINALIZED') {
        res.status(400).json({ error: 'Cannot upload file. Meeting minutes are finalized.' });
        return;
      }

      // Delete old file if exists
      if (meeting.minutesFileUrl) {
        try {
          await deleteFile(meeting.minutesFileUrl);
        } catch (error) {
          console.error('Error deleting old file:', error);
          // Continue even if deletion fails
        }
      }

      // Save new file
      const fileInfo = await saveUploadedFile(req.file, 'meeting-minutes', tenantId);

      // Update meeting with file URL
      const updatedMeeting = await prisma.meeting.update({
        where: { id },
        data: {
          minutesFileUrl: fileInfo.filePath,
        },
      });

      res.json({
        meeting: updatedMeeting,
        fileInfo: {
          fileName: fileInfo.fileName,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          url: fileInfo.filePath,
        },
        message: 'File uploaded successfully',
      });
    } catch (error: any) {
      console.error('Upload meeting minutes file error:', error);
      if (error.message && error.message.includes('Invalid file type')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * PUT /api/governance/meetings/:id/attendance
 * Update meeting attendance (MeetingAttendee records)
 */
router.put('/meetings/:id/attendance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { attendees } = req.body; // Array of { id, isPresent, allowance }

    if (!Array.isArray(attendees)) {
      res.status(400).json({ error: 'attendees must be an array' });
      return;
    }

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Prevent editing if finalized
    if (meeting.workflowStatus === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot update attendance. Meeting is finalized.' });
      return;
    }

    // Update each attendee record
    const updatePromises = attendees.map(async (attendee: any) => {
      const allowance = Number(attendee.allowance) || 0;
      const tdsAmount = allowance * 0.15; // 15% TDS
      const netAmount = allowance - tdsAmount;

      return prisma.meetingAttendee.update({
        where: { id: attendee.id },
        data: {
          isPresent: attendee.isPresent !== undefined ? attendee.isPresent : false,
          allowance,
          tdsAmount,
          netAmount,
        },
      });
    });

    await Promise.all(updatePromises);

    // Update meeting status to COMPLETED if date has passed, and workflowStatus to MINUTED
    const meetingDate = meeting.date || meeting.scheduledDate;
    const isDatePassed = meetingDate ? new Date(meetingDate) < new Date() : false;

    const meetingUpdateData: any = {};
    if (isDatePassed && meeting.status !== 'COMPLETED') {
      meetingUpdateData.status = 'COMPLETED';
    }
    if (meeting.workflowStatus !== 'MINUTED' && meeting.workflowStatus !== 'FINALIZED') {
      meetingUpdateData.workflowStatus = 'MINUTED';
    }

    if (Object.keys(meetingUpdateData).length > 0) {
      await prisma.meeting.update({
        where: { id },
        data: meetingUpdateData,
      });
    }

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting_attendance', id, {
      attendeesCount: attendees.length,
    });

    res.json({ message: 'Attendance updated successfully' });
  } catch (error) {
    console.error('Update meeting attendance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/meetings/:id/attendees
 * Add invitee (non-member) to meeting
 */
router.post('/meetings/:id/attendees', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { name, role, allowance } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Prevent editing if finalized
    if (meeting.workflowStatus === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot add attendee. Meeting is finalized.' });
      return;
    }

    const allowanceAmount = Number(allowance) || 0;
    const tdsAmount = allowanceAmount * 0.15;
    const netAmount = allowanceAmount - tdsAmount;

    const attendee = await prisma.meetingAttendee.create({
      data: {
        meetingId: id,
        name,
        role: role || 'Invitee',
        isPresent: false,
        allowance: allowanceAmount,
        tdsAmount,
        netAmount,
        isPaid: false,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'create', 'meeting_attendee', attendee.id, {
      meetingId: id,
      name,
    });

    res.status(201).json({ attendee });
  } catch (error) {
    console.error('Add attendee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/meetings/:id/attendees/:attendeeId
 * Update attendee
 */
router.put('/meetings/:id/attendees/:attendeeId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id, attendeeId } = req.params;
    const { name, role, isPresent, allowance } = req.body;

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Prevent editing if finalized
    if (meeting.workflowStatus === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot update attendee. Meeting is finalized.' });
      return;
    }

    // Verify attendee belongs to this meeting
    const attendee = await prisma.meetingAttendee.findFirst({
      where: {
        id: attendeeId,
        meetingId: id,
      },
    });

    if (!attendee) {
      res.status(404).json({ error: 'Attendee not found' });
      return;
    }

    const allowanceAmount = allowance !== undefined ? Number(allowance) || 0 : attendee.allowance;
    const tdsAmount = allowanceAmount * 0.15;
    const netAmount = allowanceAmount - tdsAmount;

    const updatedAttendee = await prisma.meetingAttendee.update({
      where: { id: attendeeId },
      data: {
        name: name !== undefined ? name : attendee.name,
        role: role !== undefined ? role : attendee.role,
        isPresent: isPresent !== undefined ? isPresent : attendee.isPresent,
        allowance: allowanceAmount,
        tdsAmount,
        netAmount,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting_attendee', attendeeId, { meetingId: id });

    res.json({ attendee: updatedAttendee });
  } catch (error) {
    console.error('Update attendee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/meetings/:id/finalize
 * Finalize meeting: lock all editing and create accounting entry
 */
router.post('/meetings/:id/finalize', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // Verify meeting exists and belongs to cooperative
    const meeting = await prisma.meeting.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        agendas: true,
        meetingAttendees: {
          where: {
            isPresent: true, // Only count present attendees
          },
        },
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Check if already finalized
    if (meeting.workflowStatus === 'FINALIZED') {
      res.status(400).json({ error: 'Meeting is already finalized' });
      return;
    }

    // Validate all agendas have decisions
    const agendasWithoutDecisions = meeting.agendas.filter(
      (agenda) => !agenda.decision || agenda.decision.trim() === ''
    );

    if (agendasWithoutDecisions.length > 0) {
      res.status(400).json({
        error: 'All agendas must have decisions before finalizing',
        agendasWithoutDecisions: agendasWithoutDecisions.map((a) => ({ id: a.id, title: a.title })),
      });
      return;
    }

    // Calculate total expense (sum of all net amounts for present attendees)
    const totalExpense = meeting.meetingAttendees.reduce(
      (sum, attendee) => sum + Number(attendee.netAmount || 0),
      0
    );

    // Update meeting to FINALIZED
    const updatedMeeting = await prisma.meeting.update({
      where: { id },
      data: {
        workflowStatus: 'FINALIZED',
        totalExpense,
        minutesStatus: 'FINALIZED', // Keep for backward compatibility
      },
    });

    // Create accounting journal entry
    try {
      const { postMeetingAllowance } = await import('../services/accounting.js');
      await postMeetingAllowance(id, tenantId);
    } catch (accountingError) {
      console.error('Error posting meeting allowance to accounting:', accountingError);
      // Don't fail the finalization if accounting fails, but log it
      // The meeting is still finalized, but accounting entry needs to be created manually
    }

    // Audit log
    await auditLogFromRequest(req, 'update', 'meeting', id, {
      action: 'finalize',
      workflowStatus: 'FINALIZED',
      totalExpense,
    });

    res.json({
      meeting: updatedMeeting,
      message: 'Meeting finalized successfully',
      totalExpense,
    });
  } catch (error) {
    console.error('Finalize meeting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== COMMITTEES ROUTES ====================

/**
 * GET /api/governance/committees
 * Get all committees (with pagination, search, and filtering)
 * Query params: page, limit, search, type, isStatutory
 */
router.get('/committees', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { page = '1', limit = '20', search, type, isStatutory } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { nameNepali: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type as string;
    }

    if (isStatutory !== undefined) {
      where.isStatutory = isStatutory === 'true';
    }

    // Get total count
    const total = await prisma.committee.count({ where });

    // Fetch committees
    const committees = await prisma.committee.findMany({
      where,
      include: {
        _count: {
          select: {
            members: {
              where: {
                isActive: true,
              },
            },
            tenures: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Audit log
    await auditLogFromRequest(req, 'view', 'committee', undefined, {
      filters: { search, type, isStatutory },
    });

    res.json({
      committees,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error: any) {
    console.error('Get committees error:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';
    console.error('Error details:', { errorMessage, errorCode, stack: error?.stack });

    if (
      errorCode === 'P2021' ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('relation') ||
      errorMessage.includes('table')
    ) {
      res.status(500).json({
        error:
          'Database tables not found. Please run migrations: pnpm --filter @myerp/db-schema prisma migrate dev',
        details: errorMessage,
      });
    } else {
      res.status(500).json({ error: 'Internal server error', details: errorMessage });
    }
  }
});

/**
 * POST /api/governance/committees
 * Create a new committee
 */
router.post('/committees', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, nameNepali, description, type, isStatutory } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Committee name is required' });
      return;
    }

    const committee = await prisma.committee.create({
      data: {
        cooperativeId: tenantId,
        name,
        nameNepali,
        description,
        type: type || 'OTHER',
        isStatutory: isStatutory || false,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'create', 'committee', committee.id, {
      name: committee.name,
      type: committee.type,
    });

    res.status(201).json({ committee });
  } catch (error: any) {
    console.error('Create committee error:', error);
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';
    console.error('Error details:', { errorMessage, errorCode, stack: error?.stack });
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

/**
 * GET /api/governance/committees/:id
 * Get committee details with members and tenures
 */
router.get('/committees/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const committee = await prisma.committee.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        members: {
          include: {
            member: {
              select: {
                id: true,
                memberNumber: true,
                firstName: true,
                lastName: true,
                middleName: true,
                institutionName: true,
                memberType: true,
              },
            },
            tenure: {
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
              },
            },
          },
          orderBy: {
            startDate: 'desc',
          },
        },
        tenures: {
          orderBy: {
            startDate: 'desc',
          },
        },
      },
    });

    if (!committee) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    res.json({ committee });
  } catch (error) {
    console.error('Get committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/committees/:id
 * Update committee
 */
router.put('/committees/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { name, nameNepali, description, type, isStatutory } = req.body;

    const committee = await prisma.committee.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!committee) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    const updatedCommittee = await prisma.committee.update({
      where: { id },
      data: {
        name,
        nameNepali,
        description,
        type,
        isStatutory,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'committee', id, {
      oldName: committee.name,
      newName: name,
      changes: { name, type, isStatutory },
    });

    res.json({ committee: updatedCommittee });
  } catch (error) {
    console.error('Update committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/governance/committees/:id
 * Delete committee
 */
router.delete('/committees/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const committee = await prisma.committee.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!committee) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    await prisma.committee.delete({
      where: { id },
    });

    // Audit log
    await auditLogFromRequest(req, 'delete', 'committee', id, {
      name: committee.name,
      type: committee.type,
    });

    res.json({ message: 'Committee deleted successfully' });
  } catch (error) {
    console.error('Delete committee error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/committees/:id/members
 * Add committee member
 */
router.post('/committees/:id/members', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: committeeId } = req.params;
    const {
      memberId,
      tenureId,
      position,
      positionNepali,
      photoPath,
      startDate,
      endDate,
      isActing,
    } = req.body;

    if (!memberId || !position || !startDate) {
      res.status(400).json({ error: 'Member ID, position, and start date are required' });
      return;
    }

    // Verify committee exists
    const committee = await prisma.committee.findFirst({
      where: {
        id: committeeId,
        cooperativeId: tenantId,
      },
    });

    if (!committee) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    // Verify member exists
    const member = await prisma.member.findFirst({
      where: {
        id: memberId,
        cooperativeId: tenantId,
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const committeeMember = await prisma.committeeMember.create({
      data: {
        committeeId,
        memberId,
        tenureId: tenureId || null,
        position,
        positionNepali,
        photoPath,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
        isActing: isActing || false,
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            institutionName: true,
            memberType: true,
          },
        },
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'create', 'committee_member', committeeMember.id, {
      committeeId,
      memberId,
      position,
      committeeName: committee.name,
    });

    res.status(201).json({ committeeMember });
  } catch (error) {
    console.error('Add committee member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/committees/:id/members/:memberId
 * Update committee member
 */
router.put('/committees/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: committeeId, memberId } = req.params;
    const {
      tenureId,
      position,
      positionNepali,
      photoPath,
      startDate,
      endDate,
      isActive,
      isActing,
    } = req.body;

    const committeeMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId,
        committee: {
          cooperativeId: tenantId,
        },
      },
    });

    if (!committeeMember) {
      res.status(404).json({ error: 'Committee member not found' });
      return;
    }

    const updatedMember = await prisma.committeeMember.update({
      where: { id: committeeMember.id },
      data: {
        tenureId,
        position,
        positionNepali,
        photoPath,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isActive,
        isActing,
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            middleName: true,
            institutionName: true,
            memberType: true,
          },
        },
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'committee_member', committeeMember.id, {
      committeeId,
      memberId,
      positionChanged: position !== committeeMember.position,
      isActiveChanged: isActive !== undefined && isActive !== committeeMember.isActive,
    });

    res.json({ committeeMember: updatedMember });
  } catch (error) {
    console.error('Update committee member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/governance/committees/:id/members/:memberId
 * Remove committee member
 */
router.delete('/committees/:id/members/:memberId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: committeeId, memberId } = req.params;

    const committeeMember = await prisma.committeeMember.findFirst({
      where: {
        committeeId,
        memberId,
        committee: {
          cooperativeId: tenantId,
        },
      },
    });

    if (!committeeMember) {
      res.status(404).json({ error: 'Committee member not found' });
      return;
    }

    await prisma.committeeMember.delete({
      where: { id: committeeMember.id },
    });

    // Audit log
    await auditLogFromRequest(req, 'delete', 'committee_member', committeeMember.id, {
      committeeId,
      memberId,
      position: committeeMember.position,
    });

    res.json({ message: 'Committee member removed successfully' });
  } catch (error) {
    console.error('Remove committee member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/committees/:id/tenure
 * Add tenure period (with overlap validation)
 */
router.post('/committees/:id/tenure', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: committeeId } = req.params;
    const { name, startDate, endDate, notes, isCurrent } = req.body;

    if (!name || !startDate) {
      res.status(400).json({ error: 'Tenure name and start date are required' });
      return;
    }

    // Verify committee exists
    const committee = await prisma.committee.findFirst({
      where: {
        id: committeeId,
        cooperativeId: tenantId,
      },
    });

    if (!committee) {
      res.status(404).json({ error: 'Committee not found' });
      return;
    }

    const newStartDate = new Date(startDate);
    const newEndDate = endDate ? new Date(endDate) : null;

    // Validate date range
    if (newEndDate && newStartDate >= newEndDate) {
      res.status(400).json({ error: 'Start date must be before end date' });
      return;
    }

    // Check for overlapping tenures
    const existingTenure = await prisma.committeeTenure.findFirst({
      where: {
        committeeId,
        OR: [
          {
            AND: [
              { startDate: { lte: newEndDate || new Date('2099-12-31') } },
              {
                OR: [
                  { endDate: { gte: newStartDate } },
                  { endDate: null }, // Handling active tenures
                ],
              },
            ],
          },
        ],
      },
    });

    if (existingTenure) {
      res.status(400).json({ error: 'Tenure dates overlap with an existing term' });
      return;
    }

    // If this is marked as current, unmark other current tenures
    if (isCurrent) {
      await prisma.committeeTenure.updateMany({
        where: {
          committeeId,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    const tenure = await prisma.committeeTenure.create({
      data: {
        committeeId,
        name,
        startDate: newStartDate,
        endDate: newEndDate,
        notes,
        isCurrent: isCurrent || false,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'create', 'committee_tenure', tenure.id, {
      committeeId,
      name,
      isCurrent,
      committeeName: committee.name,
    });

    res.status(201).json({ tenure });
  } catch (error) {
    console.error('Add tenure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/committees/:id/tenure/:tenureId
 * Update tenure
 */
router.put('/committees/:id/tenure/:tenureId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: committeeId, tenureId } = req.params;
    const { name, startDate, endDate, notes, isCurrent } = req.body;

    const tenure = await prisma.committeeTenure.findFirst({
      where: {
        id: tenureId,
        committeeId,
        committee: {
          cooperativeId: tenantId,
        },
      },
    });

    if (!tenure) {
      res.status(404).json({ error: 'Tenure not found' });
      return;
    }

    const newStartDate = startDate ? new Date(startDate) : tenure.startDate;
    const newEndDate =
      endDate !== undefined ? (endDate ? new Date(endDate) : null) : tenure.endDate;

    // Validate date range
    if (newEndDate && newStartDate >= newEndDate) {
      res.status(400).json({ error: 'Start date must be before end date' });
      return;
    }

    // Check for overlapping tenures (excluding current tenure)
    const existingTenure = await prisma.committeeTenure.findFirst({
      where: {
        committeeId,
        id: { not: tenureId },
        OR: [
          {
            AND: [
              { startDate: { lte: newEndDate || new Date('2099-12-31') } },
              {
                OR: [{ endDate: { gte: newStartDate } }, { endDate: null }],
              },
            ],
          },
        ],
      },
    });

    if (existingTenure) {
      res.status(400).json({ error: 'Tenure dates overlap with an existing term' });
      return;
    }

    // If this is marked as current, unmark other current tenures
    if (isCurrent) {
      await prisma.committeeTenure.updateMany({
        where: {
          committeeId,
          id: { not: tenureId },
          isCurrent: true,
        },
        data: {
          isCurrent: false,
        },
      });
    }

    const updatedTenure = await prisma.committeeTenure.update({
      where: { id: tenureId },
      data: {
        name,
        startDate: newStartDate,
        endDate: newEndDate,
        notes,
        isCurrent: isCurrent !== undefined ? isCurrent : tenure.isCurrent,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'committee_tenure', tenureId, {
      committeeId,
      oldName: tenure.name,
      newName: name,
      isCurrentChanged: isCurrent !== undefined && isCurrent !== tenure.isCurrent,
    });

    res.json({ tenure: updatedTenure });
  } catch (error) {
    console.error('Update tenure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/governance/committees/:id/tenure/:tenureId
 * Delete tenure
 */
router.delete('/committees/:id/tenure/:tenureId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: committeeId, tenureId } = req.params;

    const tenure = await prisma.committeeTenure.findFirst({
      where: {
        id: tenureId,
        committeeId,
        committee: {
          cooperativeId: tenantId,
        },
      },
    });

    if (!tenure) {
      res.status(404).json({ error: 'Tenure not found' });
      return;
    }

    // Prevent deleting active tenures without proper authorization
    if (tenure.isCurrent) {
      res.status(400).json({
        error: 'Cannot delete current tenure. Please mark another tenure as current first.',
      });
      return;
    }

    await prisma.committeeTenure.delete({
      where: { id: tenureId },
    });

    // Audit log
    await auditLogFromRequest(req, 'delete', 'committee_tenure', tenureId, {
      committeeId,
      name: tenure.name,
    });

    res.json({ message: 'Tenure deleted successfully' });
  } catch (error) {
    console.error('Delete tenure error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AGM ROUTES ====================

/**
 * GET /api/governance/agm
 * Get all AGMs (with pagination, search, and filtering)
 * Query params: page, limit, search, status, fiscalYear, startDate, endDate
 */
router.get('/agm', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { page = '1', limit = '20', search, status, fiscalYear, startDate, endDate } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.OR = [
        { fiscalYear: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (fiscalYear) {
      where.fiscalYear = fiscalYear as string;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate as string);
      }
    }

    // Get total count
    const total = await prisma.aGM.count({ where });

    // Fetch AGMs
    const agms = await prisma.aGM.findMany({
      where,
      orderBy: {
        scheduledDate: 'desc',
      },
      skip,
      take: limitNum,
    });

    // Audit log
    await auditLogFromRequest(req, 'view', 'agm', undefined, {
      filters: { search, status, fiscalYear },
    });

    res.json({
      agms,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get AGMs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/agm
 * Create a new AGM
 */
router.post('/agm', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      fiscalYear,
      agmNumber,
      bookCloseDate,
      scheduledDate,
      location,
      totalMembers,
      presentMembers,
      quorumThresholdPercent,
      approvedDividendBonus,
      approvedDividendCash,
      status,
      notes,
      minutesFileUrl,
    } = req.body;

    if (!fiscalYear || !scheduledDate) {
      res.status(400).json({ error: 'Fiscal year and scheduled date are required' });
      return;
    }

    // Check if AGM with same fiscal year already exists
    const existingAGM = await prisma.aGM.findUnique({
      where: {
        cooperativeId_fiscalYear: {
          cooperativeId: tenantId,
          fiscalYear,
        },
      },
    });

    if (existingAGM) {
      res.status(400).json({ error: 'AGM for this fiscal year already exists' });
      return;
    }

    const agm = await prisma.aGM.create({
      data: {
        cooperativeId: tenantId,
        fiscalYear,
        agmNumber: agmNumber || 1,
        bookCloseDate: bookCloseDate ? new Date(bookCloseDate) : null,
        scheduledDate: new Date(scheduledDate),
        location,
        totalMembers: totalMembers || 0,
        presentMembers: presentMembers || 0,
        quorumThresholdPercent: quorumThresholdPercent || 51.0,
        approvedDividendBonus,
        approvedDividendCash,
        status: status || 'PLANNED',
        notes,
        minutesFileUrl,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'create', 'agm', agm.id, {
      fiscalYear: agm.fiscalYear,
      agmNumber: agm.agmNumber,
    });

    res.status(201).json({ agm });
  } catch (error) {
    console.error('Create AGM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/agm/:id
 * Get AGM details
 */
router.get('/agm/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const agm = await prisma.aGM.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!agm) {
      res.status(404).json({ error: 'AGM not found' });
      return;
    }

    res.json({ agm });
  } catch (error) {
    console.error('Get AGM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/agm/:id
 * Update AGM
 */
router.put('/agm/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      fiscalYear,
      agmNumber,
      bookCloseDate,
      scheduledDate,
      location,
      totalMembers,
      presentMembers,
      quorumThresholdPercent,
      approvedDividendBonus,
      approvedDividendCash,
      status,
      notes,
      minutesFileUrl,
    } = req.body;

    const agm = await prisma.aGM.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!agm) {
      res.status(404).json({ error: 'AGM not found' });
      return;
    }

    // If fiscal year is being changed, check for conflicts
    if (fiscalYear && fiscalYear !== agm.fiscalYear) {
      const existingAGM = await prisma.aGM.findUnique({
        where: {
          cooperativeId_fiscalYear: {
            cooperativeId: tenantId,
            fiscalYear,
          },
        },
      });

      if (existingAGM && existingAGM.id !== id) {
        res.status(400).json({ error: 'AGM for this fiscal year already exists' });
        return;
      }
    }

    const updatedAGM = await prisma.aGM.update({
      where: { id },
      data: {
        fiscalYear,
        agmNumber,
        bookCloseDate: bookCloseDate ? new Date(bookCloseDate) : undefined,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
        location,
        totalMembers,
        presentMembers,
        quorumThresholdPercent,
        approvedDividendBonus,
        approvedDividendCash,
        status,
        notes,
        minutesFileUrl,
      },
    });

    // Audit log
    await auditLogFromRequest(req, 'update', 'agm', id, {
      oldFiscalYear: agm.fiscalYear,
      newFiscalYear: fiscalYear || agm.fiscalYear,
      statusChanged: status !== agm.status,
      changes: { fiscalYear, status, presentMembers },
    });

    res.json({ agm: updatedAGM });
  } catch (error) {
    console.error('Update AGM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/governance/agm/:id
 * Delete AGM
 */
router.delete('/agm/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const agm = await prisma.aGM.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!agm) {
      res.status(404).json({ error: 'AGM not found' });
      return;
    }

    await prisma.aGM.delete({
      where: { id },
    });

    // Audit log
    await auditLogFromRequest(req, 'delete', 'agm', id);

    res.json({ message: 'AGM deleted successfully' });
  } catch (error) {
    console.error('Delete AGM error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== EXPORT ROUTES ====================

/**
 * GET /api/governance/committees/export
 * Export committees to CSV
 */
router.get('/committees/export', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { search, type, isStatutory } = req.query;

    // Build where clause (same as GET /committees)
    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { nameNepali: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (type) {
      where.type = type as string;
    }

    if (isStatutory !== undefined) {
      where.isStatutory = isStatutory === 'true';
    }

    // Fetch all committees (no pagination for export)
    const committees = await prisma.committee.findMany({
      where,
      include: {
        _count: {
          select: {
            members: {
              where: { isActive: true },
            },
            tenures: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Generate CSV
    const headers = [
      'Name',
      'Name (Nepali)',
      'Type',
      'Statutory',
      'Members',
      'Tenures',
      'Description',
      'Created At',
    ];
    const rows = committees.map((c) => [
      c.name,
      c.nameNepali || '',
      c.type,
      c.isStatutory ? 'Yes' : 'No',
      c._count.members.toString(),
      c._count.tenures.toString(),
      (c.description || '').replace(/,/g, ';'), // Replace commas in description
      new Date(c.createdAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Audit log
    await auditLogFromRequest(req, 'export', 'committee', undefined, { format: 'csv' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="committees-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export committees error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/meetings/export
 * Export meetings to CSV
 */
router.get('/meetings/export', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { search, meetingType, status, startDate, endDate } = req.query;

    // Build where clause (same as GET /meetings)
    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (meetingType) {
      where.meetingType = meetingType as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate as string);
      }
    }

    // Fetch all meetings
    const meetings = await prisma.meeting.findMany({
      where,
      include: {
        committee: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    // Generate CSV
    const headers = [
      'Title',
      'Type',
      'Status',
      'Scheduled Date',
      'Location',
      'Committee',
      'Description',
      'Created At',
    ];
    const rows = meetings.map((m) => [
      m.title,
      m.meetingType,
      m.status,
      new Date(m.scheduledDate).toLocaleDateString(),
      m.location || '',
      m.committee?.name || '',
      (m.description || '').replace(/,/g, ';'),
      new Date(m.createdAt).toLocaleDateString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Audit log
    await auditLogFromRequest(req, 'export', 'meeting', undefined, { format: 'csv' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="meetings-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export meetings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/agm/export
 * Export AGMs to CSV
 */
router.get('/agm/export', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { search, status, fiscalYear, startDate, endDate } = req.query;

    // Build where clause (same as GET /agm)
    const where: any = {
      cooperativeId: tenantId,
    };

    if (search) {
      where.OR = [
        { fiscalYear: { contains: search as string, mode: 'insensitive' } },
        { location: { contains: search as string, mode: 'insensitive' } },
        { notes: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status as string;
    }

    if (fiscalYear) {
      where.fiscalYear = fiscalYear as string;
    }

    if (startDate || endDate) {
      where.scheduledDate = {};
      if (startDate) {
        where.scheduledDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.scheduledDate.lte = new Date(endDate as string);
      }
    }

    // Fetch all AGMs
    const agms = await prisma.aGM.findMany({
      where,
      orderBy: {
        scheduledDate: 'desc',
      },
    });

    // Generate CSV
    const headers = [
      'Fiscal Year',
      'AGM Number',
      'Status',
      'Scheduled Date',
      'Book Close Date',
      'Location',
      'Total Members',
      'Present Members',
      'Quorum %',
      'Threshold %',
      'Dividend Bonus',
      'Dividend Cash',
      'Notes',
    ];
    const rows = agms.map((a) => [
      a.fiscalYear,
      a.agmNumber.toString(),
      a.status,
      new Date(a.scheduledDate).toLocaleDateString(),
      a.bookCloseDate ? new Date(a.bookCloseDate).toLocaleDateString() : '',
      a.location || '',
      a.totalMembers.toString(),
      a.presentMembers.toString(),
      ((a.presentMembers / a.totalMembers) * 100).toFixed(1),
      a.quorumThresholdPercent.toString(),
      a.approvedDividendBonus?.toString() || '',
      a.approvedDividendCash?.toString() || '',
      (a.notes || '').replace(/,/g, ';'),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Audit log
    await auditLogFromRequest(req, 'export', 'agm', undefined, { format: 'csv' });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="agms-${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export AGMs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== MEETING REMINDERS ====================

/**
 * GET /api/governance/meetings/upcoming
 * Get upcoming meetings (for reminders)
 */
router.get('/meetings/upcoming', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { days = '7' } = req.query;

    const daysAhead = parseInt(days as string, 10) || 7;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const meetings = await prisma.meeting.findMany({
      where: {
        cooperativeId: tenantId,
        status: 'scheduled',
        scheduledDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        committee: {
          select: {
            name: true,
            nameNepali: true,
          },
        },
      },
      orderBy: {
        scheduledDate: 'asc',
      },
    });

    res.json({ meetings, daysAhead });
  } catch (error) {
    console.error('Get upcoming meetings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/reports
 * Get all manager reports (with filters: fiscalYear, month, status)
 */
router.get('/reports', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, month, status, page = '1', limit = '20', search } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (fiscalYear) {
      where.fiscalYear = fiscalYear;
    }

    if (month) {
      where.month = month;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.title = {
        contains: search as string,
        mode: 'insensitive',
      };
    }

    const [reports, total] = await Promise.all([
      prisma.managerReport.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limitNum,
        include: {
          meeting: {
            select: {
              id: true,
              title: true,
              meetingNo: true,
            },
          },
        },
      }),
      prisma.managerReport.count({ where }),
    ]);

    res.json({
      reports,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        hasNextPage: pageNum < Math.ceil(total / limitNum),
        hasPreviousPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/reports
 * Create new manager report
 */
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, month, title } = req.body;

    if (!fiscalYear || !month) {
      res.status(400).json({ error: 'Fiscal year and month are required' });
      return;
    }

    // Check if report already exists for this fiscal year and month
    const existing = await prisma.managerReport.findFirst({
      where: {
        cooperativeId: tenantId,
        fiscalYear,
        month,
      },
    });

    if (existing) {
      res.status(400).json({ error: 'Report already exists for this fiscal year and month' });
      return;
    }

    const reportTitle = title || `${fiscalYear} ${month} - Monthly Progress Report`;

    const report = await prisma.managerReport.create({
      data: {
        cooperativeId: tenantId,
        title: reportTitle,
        fiscalYear,
        month,
        status: 'DRAFT',
      },
    });

    await auditLogFromRequest(req, 'create', 'manager_report', report.id, {
      fiscalYear,
      month,
    });

    res.status(201).json({ report });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/reports/:id
 * Get report details
 */
router.get('/reports/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const report = await prisma.managerReport.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            meetingNo: true,
            date: true,
          },
        },
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.json({ report });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/reports/:id
 * Update report (save draft)
 */
router.put('/reports/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      title,
      financialData,
      previousMonthData,
      memberData,
      loanData,
      liquidityData,
      governanceData,
      description,
      challenges,
      plans,
      suggestions,
    } = req.body;

    const report = await prisma.managerReport.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (report.status === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot update finalized report' });
      return;
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (financialData !== undefined) updateData.financialData = financialData;
    if (previousMonthData !== undefined) updateData.previousMonthData = previousMonthData;
    if (memberData !== undefined) updateData.memberData = memberData;
    if (loanData !== undefined) updateData.loanData = loanData;
    if (liquidityData !== undefined) updateData.liquidityData = liquidityData;
    if (governanceData !== undefined) updateData.governanceData = governanceData;
    if (description !== undefined) updateData.description = description;
    if (challenges !== undefined) updateData.challenges = challenges;
    if (plans !== undefined) updateData.plans = plans;
    if (suggestions !== undefined) updateData.suggestions = suggestions;

    const updatedReport = await prisma.managerReport.update({
      where: { id },
      data: updateData,
    });

    await auditLogFromRequest(req, 'update', 'manager_report', id, {
      changes: Object.keys(updateData),
    });

    res.json({ report: updatedReport });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/reports/:id/fetch-data
 * Auto-fetch/refresh data from CBS (only for DRAFT reports)
 */
router.post('/reports/:id/fetch-data', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const report = await prisma.managerReport.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (report.status === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot fetch data for finalized report' });
      return;
    }

    // Fetch all data from CBS/Accounting
    const reportData = await fetchReportData(tenantId, report.fiscalYear, report.month);

    // Update report with fetched data
    const updatedReport = await prisma.managerReport.update({
      where: { id },
      data: {
        financialData: reportData.financialData,
        previousMonthData: reportData.previousMonthData,
        memberData: reportData.memberData,
        loanData: reportData.loanData,
        liquidityData: reportData.liquidityData,
        governanceData: reportData.governanceData,
      },
    });

    await auditLogFromRequest(req, 'fetch_data', 'manager_report', id, {});

    res.json({ report: updatedReport });
  } catch (error) {
    console.error('Fetch report data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/governance/reports/:id/finalize
 * Finalize report (CRITICAL: Takes hard snapshot of all data)
 */
router.post('/reports/:id/finalize', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.params;

    const report = await prisma.managerReport.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (report.status === 'FINALIZED') {
      res.status(400).json({ error: 'Report is already finalized' });
      return;
    }

    // CRITICAL SNAPSHOT STEP: Re-fetch all current data from CBS/Accounting
    const reportData = await fetchReportData(tenantId, report.fiscalYear, report.month);

    // FREEZE DATA: Store the fetched JSON data into the ManagerReport database fields
    const finalizedReport = await prisma.managerReport.update({
      where: { id },
      data: {
        financialData: reportData.financialData,
        previousMonthData: reportData.previousMonthData,
        memberData: reportData.memberData,
        loanData: reportData.loanData,
        liquidityData: reportData.liquidityData,
        governanceData: reportData.governanceData,
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedBy: userId,
      },
    });

    await auditLogFromRequest(req, 'finalize', 'manager_report', id, {
      fiscalYear: report.fiscalYear,
      month: report.month,
    });

    res.json({ report: finalizedReport });
  } catch (error) {
    console.error('Finalize report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/governance/reports/:id
 * Delete draft report
 */
router.delete('/reports/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const report = await prisma.managerReport.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    if (report.status === 'FINALIZED') {
      res.status(400).json({ error: 'Cannot delete finalized report' });
      return;
    }

    await prisma.managerReport.delete({
      where: { id },
    });

    await auditLogFromRequest(req, 'delete', 'manager_report', id, {});

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/reports/:id/previous-month
 * Get previous month's data for comparison
 */
router.get('/reports/:id/previous-month', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const report = await prisma.managerReport.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Get previous month's finalized report
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
    const currentIndex = NEPALI_MONTHS.indexOf(report.month);
    const previousIndex = currentIndex === 0 ? 11 : currentIndex - 1;
    const previousMonth = NEPALI_MONTHS[previousIndex];

    const previousReport = await prisma.managerReport.findFirst({
      where: {
        cooperativeId: tenantId,
        fiscalYear: report.fiscalYear,
        month: previousMonth,
        status: 'FINALIZED',
      },
      orderBy: {
        finalizedAt: 'desc',
      },
    });

    if (!previousReport) {
      res.json({ previousMonthData: null });
      return;
    }

    res.json({
      previousMonthData: previousReport.financialData || null,
    });
  } catch (error) {
    console.error('Get previous month data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/governance/meetings/:id/available-reports
 * List FINALIZED reports not yet linked to a meeting
 */
router.get('/meetings/:id/available-reports', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: meetingId } = req.params;

    const reports = await prisma.managerReport.findMany({
      where: {
        cooperativeId: tenantId,
        status: 'FINALIZED',
        OR: [
          { presentedInMeetingId: null },
          { presentedInMeetingId: meetingId }, // Include if already linked to this meeting
        ],
      },
      orderBy: {
        finalizedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        fiscalYear: true,
        month: true,
        finalizedAt: true,
      },
    });

    res.json({ reports });
  } catch (error) {
    console.error('Get available reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/governance/meetings/:id/attach-report
 * Link report to meeting
 */
router.put('/meetings/:id/attach-report', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id: meetingId } = req.params;
    const { reportId } = req.body;

    if (!reportId) {
      res.status(400).json({ error: 'Report ID is required' });
      return;
    }

    // Verify meeting exists
    const meeting = await prisma.meeting.findFirst({
      where: {
        id: meetingId,
        cooperativeId: tenantId,
      },
    });

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found' });
      return;
    }

    // Verify report exists and is finalized
    const report = await prisma.managerReport.findFirst({
      where: {
        id: reportId,
        cooperativeId: tenantId,
        status: 'FINALIZED',
      },
    });

    if (!report) {
      res.status(404).json({ error: 'Report not found or not finalized' });
      return;
    }

    // Link report to meeting
    await prisma.managerReport.update({
      where: { id: reportId },
      data: {
        presentedInMeetingId: meetingId,
      },
    });

    await auditLogFromRequest(req, 'attach_report', 'meeting', meetingId, {
      reportId,
    });

    res.json({ message: 'Report attached to meeting successfully' });
  } catch (error) {
    console.error('Attach report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
