import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { isModuleEnabled } from '../../middleware/module.js';
import { requireRole } from '../../middleware/role.js';
import { csrfProtection } from '../../middleware/csrf.js';
import { createAuditLog, AuditAction } from '../../lib/audit-log.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import {
  startDay,
  previewSettlement,
  settleTeller,
  unsettleTeller,
  closeDay,
  forceCloseDay,
  reopenDay,
} from '../../services/cbs/day-book.service.js';
import {
  generateEODPDF,
  generateEODCSV,
  getCooperativeName,
  fetchJournalEntriesForDay,
  EODReportOptions,
} from '../../services/cbs/eod-report.service.js';
import { prisma } from '../../lib/prisma.js';
import { paginationWithSearchSchema } from '../../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../../lib/pagination.js';
import { validateQuery } from '../../middleware/validate.js';
import { z } from 'zod';

const router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * GET /api/cbs/day-book/status
 * Get current day status and date
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const activeDay = await prisma.dayBook.findFirst({
      where: {
        cooperativeId: cooperativeId!,
        status: 'OPEN',
      },
      include: {
        dayBeginByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!activeDay) {
      // If no active day, find the last closed day to show as system date
      const lastDay = await prisma.dayBook.findFirst({
        where: {
          cooperativeId: cooperativeId!,
        },
        orderBy: {
          date: 'desc',
        },
        include: {
          dayBeginByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (lastDay) {
        return res.json({
          status: lastDay.status,
          date: lastDay.date,
          openingCash: lastDay.openingCash,
          dayBeginBy: lastDay.dayBeginBy,
          dayBeginByUser: lastDay.dayBeginByUser,
          dayBeginAt: lastDay.createdAt,
        });
      }

      // If no day book exists at all, use subscription start date
      const subscription = await prisma.subscription.findUnique({
        where: { cooperativeId: cooperativeId! },
        select: { startDate: true },
      });

      if (subscription?.startDate) {
        return res.json({
          status: 'NO_DAY_OPEN',
          date: subscription.startDate,
          message: 'System ready. Please start the day.',
        });
      }

      return res.json({
        status: 'NO_DAY_OPEN',
        message: 'No active day found. Please start the day first.',
      });
    }

    res.json({
      status: activeDay.status,
      date: activeDay.date,
      openingCash: activeDay.openingCash,
      dayBeginBy: activeDay.dayBeginBy,
      dayBeginByUser: activeDay.dayBeginByUser,
      dayBeginAt: activeDay.createdAt,
    });
  } catch (error: unknown) {
    console.error('Get day status error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get day status';
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/cbs/day-book/start
 * Perform Day Begin (Manager Only)
 */
router.post(
  '/start',
  csrfProtection,
  requireRole('Manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const dayBook = await startDay(cooperativeId, new Date(date), userId);

    // Audit log
    await createAuditLog({
      action: AuditAction.SYSTEM_BACKUP,
      userId,
      tenantId: cooperativeId,
      resourceType: 'DayBook',
      resourceId: dayBook.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'day_started', date: dayBook.date.toISOString() },
    });

    res.status(201).json({
      message: 'Day started successfully',
      dayBook,
    });
  })
);

/**
 * POST /api/cbs/day-book/settle/preview
 * Preview settlement impact before actual settlement
 */
router.post('/settle/preview', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const { tellerId, physicalCash, denominationData } = req.body;

    if (!tellerId || physicalCash === undefined) {
      return res.status(400).json({ error: 'tellerId and physicalCash are required' });
    }

    const preview = await previewSettlement(
      cooperativeId!,
      tellerId,
      physicalCash,
      denominationData
    );
    res.json(preview);
  } catch (error: unknown) {
    console.error('Preview settlement error:', error);
    const message = error instanceof Error ? error.message : 'Failed to preview settlement';
    res.status(400).json({ error: message });
  }
});

/**
 * POST /api/cbs/day-book/settle
 * Perform Teller Settlement (Teller/Supervisor)
 */
router.post(
  '/settle',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { tellerId, physicalCash, denominationData, attachmentUrl, idempotencyKey } = req.body;

    if (!tellerId || physicalCash === undefined) {
      return res.status(400).json({ error: 'tellerId and physicalCash are required' });
    }

    const settlement = await settleTeller(
      cooperativeId,
      tellerId,
      physicalCash,
      userId,
      denominationData,
      attachmentUrl,
      idempotencyKey
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId: cooperativeId!,
      resourceType: 'TellerSettlement',
      resourceId: settlement.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'teller_settled',
        tellerId,
        physicalCash: physicalCash.toString(),
        difference: settlement.difference.toString(),
      },
    });

    res.status(201).json({
      message: 'Settlement completed successfully',
      settlement,
    });
  })
);

/**
 * POST /api/cbs/day-book/unsettle
 * Revert a pending settlement (Teller/Manager)
 */
router.post(
  '/unsettle',
  csrfProtection,
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { settlementId, reason } = req.body;

    if (!settlementId) {
      return res.status(400).json({ error: 'settlementId is required' });
    }

    const settlement = await unsettleTeller(cooperativeId, settlementId, userId, reason);

    // Audit log
    await createAuditLog({
      action: AuditAction.TRANSACTION_MODIFIED,
      userId,
      tenantId: cooperativeId!,
      resourceType: 'TellerSettlement',
      resourceId: settlementId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'unsettled', reason },
    });

    res.json({
      message: 'Settlement reverted successfully',
      settlement,
    });
  })
);

/**
 * POST /api/cbs/day-book/close
 * Perform Day End (Manager Only)
 */
router.post(
  '/close',
  csrfProtection,
  requireRole('Manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;

    const dayBook = await closeDay(cooperativeId, userId);

    // Audit log
    await createAuditLog({
      action: AuditAction.SYSTEM_BACKUP,
      userId,
      tenantId: cooperativeId!,
      resourceType: 'DayBook',
      resourceId: dayBook.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'day_closed', date: dayBook.date.toISOString() },
    });

    res.json({
      message: 'Day closed successfully',
      dayBook,
    });
  })
);

/**
 * POST /api/cbs/day-book/close/force
 * Force Close Day End (Manager Only)
 */
router.post(
  '/close/force',
  csrfProtection,
  requireRole('Manager'),
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { reason, approverId } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required for force close' });
    }

    const approver = approverId || userId; // Use provided approver or current user

    const dayBook = await forceCloseDay(cooperativeId, userId, reason, approver);

    // Audit log
    await createAuditLog({
      action: AuditAction.SYSTEM_BACKUP,
      userId,
      tenantId: cooperativeId!,
      resourceType: 'DayBook',
      resourceId: dayBook.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'day_force_closed', date: dayBook.date.toISOString(), reason },
    });

    res.json({
      message: 'Day force closed successfully',
      dayBook,
    });
  })
);

/**
 * POST /api/cbs/day-book/reopen
 * Reopen Day (Manager Only)
 */
router.post('/reopen', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { reason, approverId } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required for reopen' });
    }

    const approver = approverId || userId;

    const dayBook = await reopenDay(cooperativeId, userId, reason, approver);
    res.json({
      message: 'Day reopened successfully',
      dayBook,
    });
  } catch (error: unknown) {
    console.error('Reopen day error:', error);
    const message = error instanceof Error ? error.message : 'Failed to reopen day';
    res.status(400).json({ error: message });
  }
});

/**
 * GET /api/cbs/day-book/settlements
 * Get settlement history with reconciliation flags
 */
router.get(
  '/settlements',
  validateQuery(
    paginationWithSearchSchema.extend({
      day: z.string().optional(),
      tellerId: z.string().optional(),
      status: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const cooperativeId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, day, tellerId, status } = req.validatedQuery!;

    const where: Prisma.TellerSettlementWhereInput = {
      cooperativeId: cooperativeId!, // Direct query using cooperativeId for better performance
    };

    if (day) {
      const dayDate = new Date(day as string);
      dayDate.setHours(0, 0, 0, 0);
      where.dayBook = {
        date: dayDate,
      };
    }

    if (tellerId) {
      where.tellerId = tellerId;
    }

    if (status) {
      where.status = status;
    }

    const [settlements, total] = await Promise.all([
      prisma.tellerSettlement.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                dayBook: {
                  select: {
                    id: true,
                    date: true,
                    status: true,
                  },
                },
                teller: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                executedByUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                approvalByUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            { page, limit, sortOrder: sortOrder || 'desc' }
          ),
          sortBy,
          sortOrder,
          'executedAt'
        )
      ),
      prisma.tellerSettlement.count({ where }),
    ]);

    res.json(
      createPaginatedResponse(settlements, total, { page, limit, sortOrder: sortOrder || 'desc' })
    );
  })
);

/**
 * GET /api/cbs/day-book/reports/eod
 * Download consolidated EOD report (PDF/CSV/JSON)
 * Query params:
 *   - format: 'pdf', 'csv', or 'json' (default: 'json')
 *   - day: Date string (default: today)
 *   - language: 'en', 'ne', or 'both' (default: 'en')
 *   - dateFormat: 'ad', 'bs', or 'both' (default: 'both')
 *   - includeTransactions: 'true' or 'false' (default: 'false')
 *   - includeDenominations: 'true' or 'false' (default: 'false')
 */
router.get('/reports/eod', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    if (!cooperativeId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const {
      format = 'json',
      day,
      language = 'en',
      dateFormat = 'both',
      includeTransactions = 'false',
      includeDenominations = 'false',
    } = req.query;

    const dayDate = day ? new Date(day as string) : new Date();
    dayDate.setHours(0, 0, 0, 0);

    // Parse formatting options
    const options: EODReportOptions = {
      language: (language as string).toLowerCase() as 'en' | 'ne' | 'both',
      dateFormat: (dateFormat as string).toLowerCase() as 'ad' | 'bs' | 'both',
      includeTransactions: includeTransactions === 'true',
      includeDenominations: includeDenominations === 'true',
    };

    const dayBook = await prisma.dayBook.findUnique({
      where: {
        cooperativeId_date: {
          cooperativeId: cooperativeId,
          date: dayDate,
        },
      },
      include: {
        dayBeginByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        dayEndByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        settlements: {
          include: {
            teller: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            executedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            approvalByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!dayBook) {
      return res.status(404).json({ error: 'Day not found' });
    }

    // Fetch journal entries if requested
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let journalEntries: any[] | undefined;
    if (options.includeTransactions) {
      journalEntries = await fetchJournalEntriesForDay(cooperativeId, dayDate);
    }

    const cooperativeName = await getCooperativeName(cooperativeId);
    const reportData = {
      dayBook,
      cooperativeName,
      journalEntries,
      options,
    };

    const reportFormat = (format as string).toLowerCase();

    if (reportFormat === 'json') {
      // Return JSON format
      res.json({
        dayBook,
        journalEntries: options.includeTransactions ? journalEntries : undefined,
        summary: {
          openingCash: dayBook.openingCash,
          closingCash: dayBook.closingCash,
          transactionsCount: dayBook.transactionsCount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settlementsCount: (dayBook as any).settlements?.length || 0,
          journalEntriesCount: journalEntries?.length || 0,
        },
        options,
      });
    } else if (reportFormat === 'csv') {
      // Generate and return CSV
      const csvContent = generateEODCSV(reportData);

      const filename = `eod-report-${dayBook.date.toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    } else if (reportFormat === 'pdf') {
      // Generate and return PDF
      const pdfBuffer = await generateEODPDF(reportData);

      const filename = `eod-report-${dayBook.date.toISOString().split('T')[0]}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } else {
      res.status(400).json({
        error: 'Invalid format. Supported formats: json, csv, pdf',
      });
    }
  } catch (error: unknown) {
    console.error('Get EOD report error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get EOD report';
    res.status(500).json({ error: message });
  }
});

export default router;
