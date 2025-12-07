import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { generateMemberNumber } from '../lib/member-number.js';
import { getCachedData, setCachedData } from '../lib/cache.js';
import {
  createMemberSchema,
  updateMemberSchema,
  updateMemberStatusSchema,
  KymFormSchema,
  InstitutionKymFormSchema,
} from '@myerp/shared-types';
import { postEntryFee, getCurrentSharePrice } from '../services/accounting.js';
import { NotFoundError, ValidationError, BadRequestError } from '../lib/errors.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { validate, validateAll } from '../middleware/validate.js';
import { csrfProtection } from '../middleware/csrf.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { sanitizeText, sanitizeEmail } from '../lib/sanitize.js';

const router: Router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/members/:id/kym
 * Get a member's KYM (Know Your Member) information.
 */
router.get(
  '/:id/kym',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { id: memberId } = req.params;

    const member = await prisma.member.findFirst({
      where: { id: memberId, cooperativeId: tenantId! },
    });

    if (!member) {
      throw new NotFoundError('Member', memberId);
    }

    const kymData = await prisma.memberKYC.findUnique({
      where: { memberId },
      include: {
        otherCooperativeMemberships: true,
        familyMemberCooperativeMemberships: true,
        familyMemberInThisInstitution: true,
        otherEarningFamilyMembers: true,
        incomeSourceDetails: true,
      },
    });

    if (!kymData) {
      throw new NotFoundError('KYM information', memberId);
    }

    res.json(kymData);
  })
);

/**
 * PUT /api/members/:id/kym
 * Create or Update a member's comprehensive KYM (Know Your Member) information.
 */
router.put(
  '/:id/kym',
  csrfProtection,
  validateAll({
    params: z.object({ id: z.string().min(1) }),
    body: KymFormSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id: memberId } = req.validatedParams!;

    const kycData = req.validated!;

    const existingMember = await prisma.member.findFirst({
      where: { id: memberId, cooperativeId: tenantId! },
    });

    if (!existingMember) {
      throw new NotFoundError('Member', memberId);
    }

    const {
      otherCooperativeMemberships,
      familyMemberCooperativeMemberships,
      familyMemberInThisInstitution,
      otherEarningFamilyMembers,
      incomeSourceDetails,
      firstName: _firstName, // Remove - this belongs to Member model, not MemberKYC
      surname: _surname, // Remove - this belongs to Member model, not MemberKYC
      ...mainKycData
    } = kycData;

    await prisma.$transaction(async (tx) => {
      // Upsert the main KYC data
      const kycProfile = await tx.memberKYC.upsert({
        where: { memberId },
        update: {
          ...mainKycData,
          isComplete: true,
          completedAt: new Date(),
        },
        create: {
          ...mainKycData,
          memberId,
          cooperativeId: tenantId!,
          isComplete: true,
          completedAt: new Date(),
        },
      });

      const memberKycId = kycProfile.id;

      // Clear existing related data using memberKycId
      await Promise.all([
        tx.otherCooperativeMembership.deleteMany({ where: { memberKycId } }),
        tx.familyMemberCooperativeMembership.deleteMany({ where: { memberKycId } }),
        tx.familyMemberInThisInstitution.deleteMany({ where: { memberKycId } }),
        tx.otherEarningFamilyMember.deleteMany({ where: { memberKycId } }),
        tx.incomeSourceDetail.deleteMany({ where: { memberKycId } }),
      ]);

      // Create new related data
      if (otherCooperativeMemberships && otherCooperativeMemberships.length > 0) {
        await tx.otherCooperativeMembership.createMany({
          data: otherCooperativeMemberships.map((item: any) => ({ ...item, memberKycId })),
        });
      }
      if (familyMemberCooperativeMemberships && familyMemberCooperativeMemberships.length > 0) {
        await tx.familyMemberCooperativeMembership.createMany({
          data: familyMemberCooperativeMemberships.map((item: any) => ({ ...item, memberKycId })),
        });
      }
      if (familyMemberInThisInstitution && familyMemberInThisInstitution.length > 0) {
        await tx.familyMemberInThisInstitution.createMany({
          data: familyMemberInThisInstitution.map((item: any) => ({ ...item, memberKycId })),
        });
      }
      if (otherEarningFamilyMembers && otherEarningFamilyMembers.length > 0) {
        await tx.otherEarningFamilyMember.createMany({
          data: otherEarningFamilyMembers.map((item: any) => ({ ...item, memberKycId })),
        });
      }
      if (incomeSourceDetails && incomeSourceDetails.length > 0) {
        await tx.incomeSourceDetail.createMany({
          data: incomeSourceDetails.map((item: any) => ({ ...item, memberKycId })),
        });
      }

      // Generate member number if not already assigned
      const currentMember = await tx.member.findUnique({
        where: { id: memberId },
        select: { memberNumber: true },
      });
      let memberNumber = currentMember?.memberNumber;
      if (!memberNumber) {
        memberNumber = await generateMemberNumber(tenantId!);
        await tx.member.update({
          where: { id: memberId },
          data: { memberNumber },
        });
      }

      // Update member status to active after KYC completion
      await tx.member.update({
        where: { id: memberId },
        data: {
          workflowStatus: 'active',
          isActive: true,
        },
      });
    });

    // Auto-post share capital and entry fee to ledger after KYC completion
    try {
      const kycForPosting = await prisma.memberKYC.findUnique({
        where: { memberId },
      });

      if (kycForPosting) {
        const initialShareAmount = kycForPosting.initialShareAmount
          ? Number(kycForPosting.initialShareAmount)
          : 0;
        const entryFeeAmount = kycForPosting.initialOtherAmount
          ? Number(kycForPosting.initialOtherAmount)
          : 0; // Using initialOtherAmount for entry fee (prabesh shulka)

        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { memberNumber: true },
        });

        if (initialShareAmount > 0 && member?.memberNumber) {
          const sharePrice = await getCurrentSharePrice(tenantId || req.currentCooperativeId!, 100);
          const shares = Math.floor(initialShareAmount / sharePrice);

          if (shares > 0) {
            // Use ShareService to issue shares (handles account creation, transaction, and accounting)
            const { ShareService } = await import('../services/share.service.js');
            await ShareService.issueShares({
              cooperativeId: tenantId!,
              memberId,
              kitta: shares,
              amount: initialShareAmount, // Use exact initialShareAmount to ensure accounting matches
              date: new Date(),
              paymentMode: 'CASH', // Initial shares are typically cash
              remarks: 'Initial share purchase upon KYC completion',
              userId: req.user!.userId,
            });
          }
        }

        if (entryFeeAmount > 0 && member?.memberNumber) {
          await postEntryFee(
            tenantId || req.currentCooperativeId!,
            entryFeeAmount,
            memberId,
            member.memberNumber,
            new Date()
          );
        }
      }
    } catch (accountingError) {
      // Don't fail the request if accounting posting fails
      // This is intentionally caught and ignored - accounting errors are non-critical here
    }

    res.json({ message: 'KYM (Know Your Member) information updated successfully' });
  })
);

/**
 * PUT /api/members/:id/institution-kym
 * Create or Update an institution member's comprehensive KYM (Know Your Member) information.
 */
router.put(
  '/:id/institution-kym',
  csrfProtection,
  validateAll({
    params: z.object({ id: z.string().min(1) }),
    body: InstitutionKymFormSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id: memberId } = req.validatedParams!;

    const kycData = req.validated!;

    const existingMember = await prisma.member.findFirst({
      where: { id: memberId, cooperativeId: tenantId! },
    });

    if (!existingMember) {
      throw new NotFoundError('Member', memberId);
    }

    const {
      boardOfDirectors,
      chiefExecutive,
      accountOperators,
      hasBylawsConstitution: _hasBylawsConstitution,
      hasOfficialLetter: _hasOfficialLetter,
      hasFinancialStatement: _hasFinancialStatement,
      hasTaxClearance: _hasTaxClearance,
      hasTaxFilingDetails: _hasTaxFilingDetails,
      hasBoardDecision: _hasBoardDecision,
      ...mainKycData
    } = kycData;

    // Validate required fields
    if (!mainKycData.initialShareAmount || Number(mainKycData.initialShareAmount) <= 0) {
      throw new ValidationError('Share amount is required and must be greater than 0', {
        field: 'initialShareAmount',
      });
    }

    // Validate share amount is divisible by 100 (per kitta = Rs. 100)
    const shareAmount = Number(mainKycData.initialShareAmount);
    if (shareAmount % 100 !== 0) {
      throw new ValidationError('Share amount must be divisible by 100 (per kitta = Rs. 100)', {
        field: 'initialShareAmount',
      });
    }

    // Convert numeric fields
    const numericFields = [
      'initialShareAmount',
      'initialSavingsAmount',
      'initialOtherAmount',
      'estimatedAnnualTransaction',
    ];

    numericFields.forEach((field) => {
      const fieldValue = (mainKycData as any)[field];
      if (fieldValue !== undefined && fieldValue !== null) {
        if (typeof fieldValue === 'string') {
          (mainKycData as any)[field] = parseFloat(fieldValue);
        }
      }
    });

    await prisma.$transaction(async (tx) => {
      await (tx as any).institutionKYC.upsert({
        where: { memberId },
        update: {
          ...mainKycData,
          boardOfDirectors: boardOfDirectors as any,
          chiefExecutive: chiefExecutive as any,
          accountOperators: accountOperators as any,
          isComplete: true,
          completedAt: new Date(),
        },
        create: {
          ...mainKycData,
          boardOfDirectors: boardOfDirectors as any,
          chiefExecutive: chiefExecutive as any,
          accountOperators: accountOperators as any,
          memberId,
          cooperativeId: tenantId!,
          isComplete: true,
          completedAt: new Date(),
        },
      });

      // Update member status
      await tx.member.update({
        where: { id: memberId },
        data: { workflowStatus: 'under_review' },
      });
    });

    // Record payments when application is submitted (same as individual members)
    try {
      const { postEntryFee, postAdvancePayment } = await import('../services/accounting.js');

      const initialShareAmount = mainKycData.initialShareAmount
        ? Number(mainKycData.initialShareAmount)
        : 0;
      const initialSavingsAmount = mainKycData.initialSavingsAmount
        ? Number(mainKycData.initialSavingsAmount)
        : 0;
      const entryFeeAmount = mainKycData.initialOtherAmount
        ? Number(mainKycData.initialOtherAmount)
        : 0;

      // Entry fee is posted directly to income (non-refundable, compulsory)
      if (entryFeeAmount > 0) {
        const tempMemberId = `TEMP-${memberId.substring(0, 8)}`;
        await postEntryFee(
          tenantId || req.currentCooperativeId!,
          entryFeeAmount,
          memberId,
          tempMemberId,
          new Date()
        );
      }

      // Share capital and savings are recorded as advance payment (refundable if rejected)
      const advanceAmount = initialShareAmount + initialSavingsAmount;
      if (advanceAmount > 0) {
        const memberName =
          existingMember.fullName ||
          existingMember.institutionName ||
          `${existingMember.firstName} ${existingMember.lastName}`.trim() ||
          'Unknown';
        await postAdvancePayment(
          tenantId || req.currentCooperativeId!,
          advanceAmount,
          memberId,
          memberName,
          new Date()
        );
      }
    } catch (paymentError) {
      console.error('Error recording payments for institution:', paymentError);
      // Don't fail the KYC submission if payment recording fails, but log it
    }

    res.json({ message: 'Institution KYM (Know Your Member) information updated successfully' });
  })
);

/**
 * GET /api/members/summary
 * Fast endpoint for summary counts (used for cards and sidebar badge)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }

    // Fast count queries
    const [totalMembers, activeMembers, pendingKYC, membersWithCapitalLedger] = await Promise.all([
      // Count only actual members (those with member numbers)
      prisma.member.count({
        where: {
          cooperativeId: tenantId!,
          memberNumber: { not: null },
        },
      }),
      prisma.member.count({
        where: {
          cooperativeId: tenantId!,
          isActive: true,
          memberNumber: { not: null }, // Active members must have member numbers
        },
      }),
      prisma.member.count({
        where: {
          cooperativeId: tenantId!,
          workflowStatus: {
            in: ['application', 'under_review'],
          },
        },
      }),
      // Count members who have share accounts
      prisma.member.count({
        where: {
          cooperativeId: tenantId!,
          shareAccount: {
            isNot: null,
          },
        },
      }),
    ]);

    res.json({
      totalMembers,
      activeMembers,
      membersWithCapitalLedger,
      pendingKYC,
    });
  } catch (error) {
    console.error('Get member summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/members/charts
 * Heavy endpoint for chart data (cached for 1-2 hours)
 * Uses database aggregations for optimal performance
 */
router.get(
  '/charts',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const cacheKey = `members:charts:${tenantId}`;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Run all aggregations in parallel for optimal performance
    const [
      workflowBreakdownData,
      statusDistributionData,
      genderDistributionData,
      geographicDistributionData,
      ageGroupData,
      growthDataRaw,
      registrationTrendsRaw,
      workflowTrendsData,
    ] = await Promise.all([
      // 1. Workflow Breakdown
      prisma.member.groupBy({
        by: ['workflowStatus'],
        where: { cooperativeId: tenantId! },
        _count: { workflowStatus: true },
      }),

      // 2. Status Distribution (Active vs. Inactive)
      prisma.member.groupBy({
        by: ['isActive'],
        where: { cooperativeId: tenantId! },
        _count: { isActive: true },
      }),

      // 3. Gender Distribution
      prisma.memberKYC.groupBy({
        by: ['gender'],
        where: {
          member: { cooperativeId: tenantId! },
          gender: { not: null },
        },
        _count: { gender: true },
      }),

      // 4. Geographic Distribution
      prisma.memberKYC.groupBy({
        by: ['permanentProvince'],
        where: {
          member: { cooperativeId: tenantId! },
          permanentProvince: { not: null },
        },
        _count: { permanentProvince: true },
      }),

      // 5. Age Groups (using raw SQL for complex date calculations)
      prisma.$queryRaw<Array<{ ageGroup: string; count: number }>>`
        SELECT
          CASE
            WHEN age BETWEEN 18 AND 25 THEN '18-25'
            WHEN age BETWEEN 26 AND 35 THEN '26-35'
            WHEN age BETWEEN 36 AND 45 THEN '36-45'
            WHEN age BETWEEN 46 AND 55 THEN '46-55'
            WHEN age BETWEEN 56 AND 65 THEN '56-65'
            WHEN age > 65 THEN '65+'
            ELSE 'Unknown'
          END as "ageGroup",
          COUNT(*)::int as "count"
        FROM (
          SELECT
            EXTRACT(YEAR FROM AGE(NOW(), kyc."dateOfBirth"))::int as age
          FROM "member_kyc" kyc
          INNER JOIN "members" m ON kyc."memberId" = m.id
          WHERE m."cooperativeId" = ${tenantId}
            AND kyc."dateOfBirth" IS NOT NULL
        ) as ages
        GROUP BY "ageGroup"
        ORDER BY "ageGroup"
      `,

      // 6. Member Growth (last 90 days, grouped by week)
      prisma.$queryRaw<Array<{ week: Date; count: number }>>`
        SELECT
          DATE_TRUNC('week', m."createdAt")::date as "week",
          COUNT(*)::int as "count"
        FROM "members" m
        WHERE m."cooperativeId" = ${tenantId}
          AND m."createdAt" >= NOW() - INTERVAL '90 days'
        GROUP BY DATE_TRUNC('week', m."createdAt")
        ORDER BY "week" ASC
      `,

      // 7. Registration Trends (last 30 days, daily)
      prisma.$queryRaw<Array<{ date: string; count: number }>>`
        SELECT
          DATE(m."createdAt")::text as "date",
          COUNT(*)::int as "count"
        FROM "members" m
        WHERE m."cooperativeId" = ${tenantId}
          AND m."createdAt" >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(m."createdAt")
        ORDER BY "date" ASC
      `,

      // 8. (NEW) Workflow Trends
      // This query calculates the average time in days a member
      // spends in each status. It's now hyper-accurate.
      prisma.$queryRaw<Array<{ status: string; count: number; avgDays: number }>>`
        WITH status_durations AS (
          SELECT
            "toStatus" as "status",
            -- Calculate duration from this entry until the next one (or NOW())
            (LEAD("changedAt", 1, NOW()) OVER (
              PARTITION BY "memberId"
              ORDER BY "changedAt" ASC
            ) - "changedAt") as duration
          FROM "workflow_history"
          WHERE "cooperativeId" = ${tenantId}
        )
        SELECT
          "status",
          COUNT(*)::int as "count",
          -- Get average duration in days, rounded to 2 decimal places
          ROUND(AVG(EXTRACT(EPOCH FROM duration) / 86400)::numeric, 2) as "avgDays"
        FROM status_durations
        GROUP BY "status"
      `,
    ]);

    // Format data for frontend
    const workflowBreakdown = Object.fromEntries(
      workflowBreakdownData.map((d) => [d.workflowStatus || 'unknown', d._count.workflowStatus])
    );

    const statusDistribution = {
      active: statusDistributionData.find((d) => d.isActive === true)?._count.isActive || 0,
      inactive: statusDistributionData.find((d) => d.isActive === false)?._count.isActive || 0,
      pendingKYC: Object.entries(workflowBreakdown)
        .filter(([status]) => ['application', 'under_review'].includes(status))
        .reduce((sum, [, count]) => sum + count, 0),
    };

    const genderDistribution = Object.fromEntries(
      genderDistributionData.map((d) => [d.gender || 'unknown', d._count.gender])
    );

    const geographicDistribution = Object.fromEntries(
      geographicDistributionData.map((d) => [
        d.permanentProvince || 'Unknown',
        d._count?.permanentProvince || 0,
      ])
    );

    const ageGroups = Object.fromEntries(ageGroupData.map((d) => [d.ageGroup, d.count]));

    // Format growth data (ensure all weeks are represented)
    const growthData: { week: string; count: number }[] = [];
    const now = new Date();
    for (let i = 12; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      // Align to start of week (Monday) - PostgreSQL DATE_TRUNC uses Monday as week start
      const dayOfWeek = weekStart.getDay();
      const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const alignedWeekStart = new Date(weekStart);
      alignedWeekStart.setDate(diff);
      alignedWeekStart.setHours(0, 0, 0, 0);
      const weekLabel = alignedWeekStart.toISOString().split('T')[0];

      const weekData = growthDataRaw.find((g) => {
        const weekDate = new Date(g.week);
        weekDate.setHours(0, 0, 0, 0);
        return weekDate.getTime() === alignedWeekStart.getTime();
      });
      growthData.push({
        week: weekLabel,
        count: weekData ? weekData.count : 0,
      });
    }

    // Format registration trends (ensure all days are represented)
    const registrationTrends: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateLabel = date.toISOString().split('T')[0];
      const dayData = registrationTrendsRaw.find((t) => t.date === dateLabel);
      registrationTrends.push({
        date: dateLabel,
        count: dayData ? dayData.count : 0,
      });
    }

    // Workflow trends - now using the new WorkflowHistory table for accurate analytics
    const workflowTrends = workflowTrendsData.map((item) => ({
      status: item.status,
      avgDays: Number(item.avgDays),
      count: item.count,
    }));

    const chartData = {
      growth: growthData,
      statusDistribution,
      workflowBreakdown,
      demographics: {
        gender: genderDistribution,
        ageGroups,
      },
      geographic: geographicDistribution,
      registrationTrends,
      workflowTrends,
    };

    // Cache for 1 hour (3600 seconds)
    setCachedData(cacheKey, chartData, 3600);

    res.json(chartData);
  })
);

/**
 * GET /api/members/upcoming-birthdays
 * Get members with upcoming birthdays
 */
router.get(
  '/upcoming-birthdays',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const daysAhead = parseInt(req.query.daysAhead as string) || 30;

    if (!tenantId) {
      throw new BadRequestError('Cooperative ID is required');
    }

    const { getUpcomingBirthdays } = await import('../services/member-statistics.js');
    const upcomingBirthdays = await getUpcomingBirthdays(tenantId, daysAhead);

    res.json(upcomingBirthdays);
  })
);

/**
 * GET /api/members/list
 * Get member list with basic information (S.N., Membership Number, Name, Temporary Address, Phone Number)
 */
router.get(
  '/list',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const includeInactive = req.query.includeInactive === 'true';

    if (!tenantId) {
      throw new BadRequestError('Cooperative ID is required');
    }

    const { getMemberList } = await import('../services/member-statistics.js');
    const memberList = await getMemberList(tenantId, includeInactive);

    res.json(memberList);
  })
);

/**
 * GET /api/members
 * Get all members (with optional filters and pagination)
 * Query parameters:
 *   - page: Page number (default: 1)
 *   - limit: Items per page (default: 20, max: 100)
 *   - isActive: Filter by active status (true/false)
 *   - search: Search across member fields
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { isActive, search, page = '1', limit = '20', hasMemberNumber } = req.query;

    // Parse and validate pagination parameters
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    if (hasMemberNumber === 'true') {
      where.memberNumber = { not: null };
    }

    if (search) {
      where.OR = [
        { memberNumber: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { middleName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { fullName: { contains: search as string, mode: 'insensitive' } },
        { fullNameNepali: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Fetch total count for pagination metadata
    const totalMembers = await prisma.member.count({ where });

    // Fetch paginated members
    const members = await prisma.member.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limitNum,
    });

    res.json({
      members,
      pagination: {
        total: totalMembers,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalMembers / limitNum),
        hasNextPage: pageNum < Math.ceil(totalMembers / limitNum),
        hasPreviousPage: pageNum > 1,
      },
    });
  })
);

/**
 * GET /api/members/:id
 * Get a specific member
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { id } = req.params;

    const member = await prisma.member.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!member) {
      throw new NotFoundError('Member', id);
    }

    // Fetch related data in parallel for optimal performance
    const [savingAccounts, loanApplications, shareAccount] = await Promise.all([
      prisma.savingAccount.findMany({
        where: { memberId: id, cooperativeId: tenantId! },
        select: {
          id: true,
          accountNumber: true,
          balance: true,
          status: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.loanApplication.findMany({
        where: { memberId: id, cooperativeId: tenantId! },
        select: {
          id: true,
          applicationNumber: true,
          loanAmount: true,
          status: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      }),
      prisma.shareAccount.findUnique({
        where: { memberId: id },
        select: {
          totalKitta: true,
          unitPrice: true,
          totalAmount: true,
        },
      }),
    ]);

    res.json({
      member: {
        ...member,
        savingAccounts: savingAccounts || [],
        loanApplications: loanApplications || [],
        shareAccount: shareAccount
          ? {
              totalKitta: shareAccount.totalKitta,
              unitPrice: shareAccount.unitPrice,
              totalAmount: shareAccount.totalAmount,
            }
          : null,
      },
    });
  })
);

/**
 * POST /api/members
 * Create a new member (member number will be auto-generated after approval)
 */
router.post(
  '/',
  csrfProtection,
  validate(createMemberSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }

    // Request body is already validated and available in req.validated
    const {
      memberType,
      firstName,
      lastName,
      institutionName,
      middleName,
      fullName,
      fullNameNepali,
      email,
      phone,
    } = req.validated!;

    // Auto-generate fullName if not provided
    let generatedFullName = fullName;
    if (!generatedFullName) {
      if (memberType === 'INSTITUTION') {
        generatedFullName = institutionName?.toUpperCase() || '';
      } else {
        const nameParts = [firstName, middleName, lastName].filter(Boolean);
        generatedFullName = nameParts.join(' ').toUpperCase();
      }
    }

    // Create member without member number (will be generated after approval)
    const member = await prisma.member.create({
      data: {
        memberNumber: null, // Will be generated after approval
        memberType: (memberType || 'INDIVIDUAL') as any, // Type assertion until Prisma client is regenerated
        cooperativeId: tenantId!,
        firstName: memberType === 'INSTITUTION' ? null : firstName?.toUpperCase() || null,
        middleName:
          memberType === 'INSTITUTION' ? null : middleName ? middleName.toUpperCase() : null,
        lastName: memberType === 'INSTITUTION' ? null : lastName?.toUpperCase() || null,
        institutionName:
          memberType === 'INSTITUTION' ? institutionName?.toUpperCase() || null : null,
        fullName: generatedFullName,
        fullNameNepali: fullNameNepali || null,
        email: email || null,
        phone: phone || null,
        isActive: false, // Not active until approved
        workflowStatus: 'application',
      } as any, // Type assertion for entire data object until Prisma client is regenerated
    });

    res.status(201).json({ member });
  })
);

/**
 * PUT /api/members/:id/status
 * Updates a member's workflow status and logs the change.
 * This is the primary endpoint for all workflow actions (Approve, Reject, etc.)
 */
router.put(
  '/:id/status',
  csrfProtection,
  validateAll({
    params: z.object({ id: z.string().min(1) }),
    body: updateMemberStatusSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const staffId = req.user!.userId; // The staff member making the change
    const { id: memberId } = req.validatedParams!;

    // Request body is already validated and available in req.validated
    const { toStatus, remarks } = req.validated!;

    // 2. Get the current member
    const existingMember = await prisma.member.findFirst({
      where: { id: memberId, cooperativeId: tenantId! },
    });

    if (!existingMember) {
      throw new NotFoundError('Member', memberId);
    }

    const fromStatus = existingMember.workflowStatus;

    // 3. Check if status is actually changing
    if (fromStatus === toStatus) {
      throw new BadRequestError('Member is already in this status');
    }

    // 4. Generate Member Number if moving to 'active'
    let newMemberNumber = existingMember.memberNumber;
    if (toStatus === 'active' && existingMember.memberNumber === null) {
      newMemberNumber = await generateMemberNumber(tenantId || req.currentCooperativeId!);
    }

    // 5. Run the update in a transaction
    const [updatedMember] = await prisma.$transaction([
      // 5a. Update the member's status
      prisma.member.update({
        where: { id: memberId },
        data: {
          workflowStatus: toStatus,
          memberNumber: newMemberNumber,
          // If moving to 'active', also set isActive = true
          isActive: toStatus === 'active' ? true : existingMember.isActive,
        },
      }),
      // 5b. Log the change in the new history table
      prisma.workflowHistory.create({
        data: {
          cooperativeId: tenantId!,
          memberId: memberId,
          changedById: staffId,
          fromStatus: fromStatus,
          toStatus: toStatus,
          remarks: remarks || null,
        },
      }),
    ]);

    // Auto-post share capital and entry fee when member is approved (active)
    if (toStatus === 'active' && updatedMember.memberNumber) {
      try {
        const kycData = await prisma.memberKYC.findUnique({
          where: { memberId },
        });

        // Also check Institution KYC if not found
        const kyc =
          kycData ||
          (await prisma.institutionKYC.findUnique({
            where: { memberId },
          }));

        // Check if share account already exists
        let existingShares = await prisma.shareAccount.findUnique({
          where: { memberId },
        });

        // Create share account for all approved members (even if they have no initial shares)
        // This ensures they appear on the share register
        if (!existingShares) {
          const unitPrice = await getCurrentSharePrice(tenantId || req.currentCooperativeId!, 100);

          // Use transaction to ensure atomic certificate number generation
          existingShares = await prisma.$transaction(async (tx) => {
            // Double-check account doesn't exist (race condition protection)
            const stillMissing = await tx.shareAccount.findUnique({
              where: { memberId },
            });

            if (!stillMissing) {
              // Get the current highest certificate number in this transaction
              const latestCert = await tx.shareAccount.findFirst({
                where: { cooperativeId: tenantId! },
                orderBy: { createdAt: 'desc' },
                select: { certificateNo: true },
              });

              let certNumber = 1;
              if (latestCert?.certificateNo) {
                const match = latestCert.certificateNo.match(/CERT-(\d+)/);
                if (match) {
                  certNumber = parseInt(match[1], 10) + 1;
                }
              }

              const certNo = `CERT-${String(certNumber).padStart(6, '0')}`;

              return await tx.shareAccount.create({
                data: {
                  cooperativeId: tenantId!,
                  memberId,
                  certificateNo: certNo,
                  unitPrice,
                  totalKitta: 0,
                  totalAmount: 0,
                  issueDate: new Date(),
                },
              });
            }
            // If account was created by another request, return null
            return null;
          });

          // If account was created by another request, fetch it
          if (!existingShares) {
            existingShares = await prisma.shareAccount.findUnique({
              where: { memberId },
            });
          }
        }

        if (kyc) {
          const initialShareAmount = kyc.initialShareAmount ? Number(kyc.initialShareAmount) : 0;
          const entryFeeAmount = kyc.initialOtherAmount ? Number(kyc.initialOtherAmount) : 0;

          // Issue initial shares if amount is specified and shares haven't been issued yet
          // Check if shares were already issued to prevent duplicate transactions
          if (initialShareAmount > 0) {
            // Re-fetch share account to get latest state (in case it was just created or updated)
            const currentShareAccount = await prisma.shareAccount.findUnique({
              where: { memberId },
            });

            // Check if shares have already been issued (account has shares > 0)
            const hasSharesAlready = currentShareAccount
              ? currentShareAccount.totalKitta > 0 || currentShareAccount.totalAmount > 0
              : false;

            if (!hasSharesAlready) {
              const sharePrice = await getCurrentSharePrice(
                tenantId || req.currentCooperativeId!,
                100
              );
              const shares = Math.floor(initialShareAmount / sharePrice);

              if (shares > 0) {
                const { ShareService } = await import('../services/share.service.js');
                await ShareService.issueShares({
                  cooperativeId: tenantId!,
                  memberId,
                  kitta: shares,
                  amount: initialShareAmount,
                  date: new Date(),
                  paymentMode: 'CASH', // Initial shares are typically cash/entry
                  remarks: 'Initial share purchase upon Membership Approval',
                  userId: staffId,
                });
              }
            }
          }

          // Post entry fee if not already posted (prevent duplicate postings)
          // Note: During KYC submission, entry fee is posted with tempMemberId (TEMP-...)
          // During approval, we check for existing entry fees using memberId and memberNumber
          if (entryFeeAmount > 0 && updatedMember.memberNumber) {
            // Check if entry fee was already posted during KYC submission
            // The description format: "Entry fee (Prabesh Shulka) from applicant ${memberNumber} - Application submitted (Non-refundable)"
            // During KYC submission, memberNumber is TEMP-${memberId.substring(0, 8)}
            // During approval, memberNumber is the actual member number
            // Use case-insensitive matching and check for both patterns to catch all cases
            const tempMemberIdPattern = `TEMP-${memberId.substring(0, 8)}`;
            const existingEntryFee = await prisma.journalEntry.findFirst({
              where: {
                cooperativeId: tenantId!,
                OR: [
                  // Check by actual memberNumber (used during approval or if posted after member number is assigned)
                  {
                    AND: [
                      {
                        description: {
                          contains: updatedMember.memberNumber,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        OR: [
                          { description: { contains: 'Entry fee', mode: 'insensitive' as const } },
                          {
                            description: {
                              contains: 'Prabesh Shulka',
                              mode: 'insensitive' as const,
                            },
                          },
                          {
                            description: { contains: 'प्रवेश शुल्क', mode: 'insensitive' as const },
                          },
                        ],
                      },
                    ],
                  },
                  // Check by tempMemberId pattern (used during KYC submission before member number is assigned)
                  {
                    AND: [
                      {
                        description: {
                          contains: tempMemberIdPattern,
                          mode: 'insensitive' as const,
                        },
                      },
                      {
                        OR: [
                          { description: { contains: 'Entry fee', mode: 'insensitive' as const } },
                          {
                            description: {
                              contains: 'Prabesh Shulka',
                              mode: 'insensitive' as const,
                            },
                          },
                          {
                            description: { contains: 'प्रवेश शुल्क', mode: 'insensitive' as const },
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            });

            if (!existingEntryFee) {
              await postEntryFee(
                tenantId || req.currentCooperativeId!,
                entryFeeAmount,
                memberId,
                updatedMember.memberNumber!,
                new Date()
              );
            }
          }
        }
      } catch (err) {
        console.error('Error posting initial shares/fees on approval:', err);
        // Don't fail the approval response, but log the error
      }
    }

    // Audit log for status change
    await createAuditLog({
      action: toStatus === 'active' ? AuditAction.MEMBER_ACTIVATED : AuditAction.MEMBER_UPDATED,
      userId: staffId,
      tenantId: tenantId || undefined,
      resourceType: 'Member',
      resourceId: memberId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        fromStatus,
        toStatus,
        memberNumber: updatedMember.memberNumber,
      },
    });

    res.json({ member: updatedMember });
  })
);

/**
 * PUT /api/members/:id
 * Update a member
 */
router.put(
  '/:id',
  csrfProtection,
  validateAll({
    params: z.object({ id: z.string().min(1) }),
    body: updateMemberSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.validatedParams!;

    // Request body is already validated and available in req.validated

    // Verify member belongs to cooperative
    const existing = await prisma.member.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!existing) {
      throw new NotFoundError('Member', id);
    }

    const { firstName, middleName, lastName, fullName, fullNameNepali, email, phone, isActive } =
      req.validated!;

    // Auto-generate fullName if not provided and name parts are being updated
    let generatedFullName = fullName;
    if (
      !generatedFullName &&
      (firstName !== undefined || middleName !== undefined || lastName !== undefined)
    ) {
      const nameParts = [
        firstName !== undefined ? firstName : existing.firstName,
        middleName !== undefined ? middleName : existing.middleName,
        lastName !== undefined ? lastName : existing.lastName,
      ].filter(Boolean);
      generatedFullName = nameParts.join(' ').toUpperCase();
    }

    const updateData: any = {
      email: email !== undefined ? email || null : existing.email,
      phone: phone !== undefined ? phone || null : existing.phone,
      isActive: isActive !== undefined ? isActive : existing.isActive,
    };

    if (firstName !== undefined) updateData.firstName = firstName.toUpperCase();
    if (middleName !== undefined)
      updateData.middleName = middleName ? middleName.toUpperCase() : null;
    if (lastName !== undefined) updateData.lastName = lastName.toUpperCase();
    if (generatedFullName !== undefined) updateData.fullName = generatedFullName;
    if (fullNameNepali !== undefined) updateData.fullNameNepali = fullNameNepali || null;

    // Sanitize inputs
    if (email !== undefined) {
      updateData.email = email ? sanitizeEmail(email) : null;
    }
    if (phone !== undefined) {
      updateData.phone = phone ? sanitizeText(phone) : null;
    }
    if (fullNameNepali !== undefined) {
      updateData.fullNameNepali = fullNameNepali ? sanitizeText(fullNameNepali) : null;
    }

    const member = await prisma.member.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await createAuditLog({
      action: AuditAction.MEMBER_UPDATED,
      userId: req.user!.userId,
      tenantId: tenantId || undefined,
      resourceType: 'Member',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        changes: Object.keys(updateData),
      },
    });

    res.json({ member });
  })
);

/**
 * DELETE /api/members/:id
 * Soft delete a member (set isActive to false)
 */
router.delete(
  '/:id',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    // Verify member belongs to cooperative
    const existing = await prisma.member.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!existing) {
      throw new NotFoundError('Member', id);
    }

    // Soft delete by setting isActive to false
    const member = await prisma.member.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'Member deactivated successfully', member });
  })
);

export default router;
