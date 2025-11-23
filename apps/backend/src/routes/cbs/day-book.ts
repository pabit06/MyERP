import { Router, Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { requireTenant } from '../../middleware/tenant.js';
import { isModuleEnabled } from '../../middleware/module.js';
import { requireRole } from '../../middleware/role.js';
import {
  getActiveDay,
  startDay,
  previewSettlement,
  settleTeller,
  unsettleTeller,
  closeDay,
  forceCloseDay,
  reopenDay,
} from '../../services/cbs/day-book.service.js';
import { prisma } from '../../lib/prisma.js';

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
    const activeDay = await prisma.dayBook.findFirst({
      where: {
        cooperativeId,
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
  } catch (error: any) {
    console.error('Get day status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get day status' });
  }
});

/**
 * POST /api/cbs/day-book/start
 * Perform Day Begin (Manager Only)
 */
router.post('/start', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { date } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const dayBook = await startDay(cooperativeId, new Date(date), userId);
    res.status(201).json({
      message: 'Day started successfully',
      dayBook,
    });
  } catch (error: any) {
    console.error('Start day error:', error);
    res.status(400).json({ error: error.message || 'Failed to start day' });
  }
});

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

    const preview = await previewSettlement(cooperativeId, tellerId, physicalCash, denominationData);
    res.json(preview);
  } catch (error: any) {
    console.error('Preview settlement error:', error);
    res.status(400).json({ error: error.message || 'Failed to preview settlement' });
  }
});

/**
 * POST /api/cbs/day-book/settle
 * Perform Teller Settlement (Teller/Supervisor)
 */
router.post('/settle', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
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

    res.status(201).json({
      message: 'Settlement completed successfully',
      settlement,
    });
  } catch (error: any) {
    console.error('Settle teller error:', error);
    
    // Handle specific error codes
    if (error.message.includes('TELLER_PENDING_SETTLEMENT')) {
      res.status(400).json({
        code: 'TELLER_PENDING_SETTLEMENT',
        error: error.message,
        details: {
          remediation: 'Please ensure all tellers have settled before closing the day.',
        },
      });
    } else {
      res.status(400).json({ error: error.message || 'Failed to settle teller' });
    }
  }
});

/**
 * POST /api/cbs/day-book/unsettle
 * Revert a pending settlement (Teller/Manager)
 */
router.post('/unsettle', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { settlementId, reason } = req.body;

    if (!settlementId) {
      return res.status(400).json({ error: 'settlementId is required' });
    }

    const settlement = await unsettleTeller(cooperativeId, settlementId, userId, reason);
    res.json({
      message: 'Settlement reverted successfully',
      settlement,
    });
  } catch (error: any) {
    console.error('Unsettle teller error:', error);
    res.status(400).json({ error: error.message || 'Failed to unsettle teller' });
  }
});

/**
 * POST /api/cbs/day-book/close
 * Perform Day End (Manager Only)
 */
router.post('/close', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;

    const dayBook = await closeDay(cooperativeId, userId);
    res.json({
      message: 'Day closed successfully',
      dayBook,
    });
  } catch (error: any) {
    console.error('Close day error:', error);
    
    // Handle specific error codes
    if (error.message.includes('TELLER_PENDING_SETTLEMENT')) {
      res.status(400).json({
        code: 'TELLER_PENDING_SETTLEMENT',
        error: error.message,
        details: {
          remediation: 'Please ensure all tellers have settled before closing the day.',
        },
      });
    } else {
      res.status(400).json({ error: error.message || 'Failed to close day' });
    }
  }
});

/**
 * POST /api/cbs/day-book/close/force
 * Force Close Day End (Manager Only)
 */
router.post('/close/force', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { reason, approverId } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'reason is required for force close' });
    }

    const approver = approverId || userId; // Use provided approver or current user

    const dayBook = await forceCloseDay(cooperativeId, userId, reason, approver);
    res.json({
      message: 'Day force closed successfully',
      dayBook,
    });
  } catch (error: any) {
    console.error('Force close day error:', error);
    res.status(400).json({ error: error.message || 'Failed to force close day' });
  }
});

/**
 * POST /api/cbs/day-book/reopen
 * Reopen Day (Manager Only)
 */
router.post('/reopen', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
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
  } catch (error: any) {
    console.error('Reopen day error:', error);
    res.status(400).json({ error: error.message || 'Failed to reopen day' });
  }
});

/**
 * GET /api/cbs/day-book/settlements
 * Get settlement history with reconciliation flags
 */
router.get('/settlements', async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const { day, tellerId, status } = req.query;

    const where: any = {
      cooperativeId, // Direct query using cooperativeId for better performance
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

    const settlements = await prisma.tellerSettlement.findMany({
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
      orderBy: {
        executedAt: 'desc',
      },
    });

    res.json({ settlements });
  } catch (error: any) {
    console.error('Get settlements error:', error);
    res.status(500).json({ error: error.message || 'Failed to get settlements' });
  }
});

/**
 * GET /api/cbs/day-book/reports/eod
 * Download consolidated EOD report (PDF/CSV)
 * TODO: Implement PDF/CSV generation
 */
router.get('/reports/eod', requireRole('Manager'), async (req: Request, res: Response) => {
  try {
    const cooperativeId = req.user!.tenantId;
    const { format = 'json', day } = req.query;

    const dayDate = day ? new Date(day as string) : new Date();
    dayDate.setHours(0, 0, 0, 0);

    const dayBook = await prisma.dayBook.findUnique({
      where: {
        cooperativeId_date: {
          cooperativeId,
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

    // For now, return JSON. PDF/CSV generation can be added later
    if (format === 'json') {
      res.json({
        dayBook,
        summary: {
          openingCash: dayBook.openingCash,
          closingCash: dayBook.closingCash,
          transactionsCount: dayBook.transactionsCount,
          settlementsCount: dayBook.settlements.length,
        },
      });
    } else {
      res.status(400).json({ error: 'Only JSON format is currently supported' });
    }
  } catch (error: any) {
    console.error('Get EOD report error:', error);
    res.status(500).json({ error: error.message || 'Failed to get EOD report' });
  }
});

export default router;

