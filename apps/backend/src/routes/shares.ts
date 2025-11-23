import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { ShareService } from '../services/share.service.js';

const router: Router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * GET /api/shares/dashboard
 * Get summary statistics for shares
 */
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const [totalAccounts, totalKitta, totalAmount, recentTransactions] = await Promise.all([
      prisma.shareAccount.count({
        where: { cooperativeId: tenantId },
      }),
      prisma.shareAccount.aggregate({
        where: { cooperativeId: tenantId },
        _sum: { totalKitta: true },
      }),
      prisma.shareAccount.aggregate({
        where: { cooperativeId: tenantId },
        _sum: { totalAmount: true },
      }),
      prisma.shareTransaction.findMany({
        where: { cooperativeId: tenantId },
        take: 10,
        orderBy: { date: 'desc' },
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    res.json({
      totalShareCapital: totalAmount._sum.totalAmount || 0,
      totalKitta: totalKitta._sum.totalKitta || 0,
      totalMembers: totalAccounts,
      recentTransactions,
    });
  } catch (error) {
    console.error('Get share dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/shares/accounts
 * Get all share accounts for the cooperative (replaces /ledgers)
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (memberId) {
      where.memberId = memberId as string;
    }

    const accounts = await prisma.shareAccount.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ accounts });
  } catch (error) {
    console.error('Get share accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/shares/accounts/:memberId
 * Get share account for a specific member
 */
router.get('/accounts/:memberId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;

    // Verify member belongs to cooperative
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.cooperativeId !== tenantId) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    let account = await prisma.shareAccount.findUnique({
      where: { memberId },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        transactions: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    // Create account if it doesn't exist
    if (!account) {
      const count = await prisma.shareAccount.count({
        where: { cooperativeId: tenantId },
      });
      const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

      account = await prisma.shareAccount.create({
        data: {
          memberId,
          cooperativeId: tenantId,
          certificateNo: certNo,
          totalKitta: 0,
          unitPrice: 100,
          totalAmount: 0,
        },
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
          transactions: [],
        },
      });
    }

    res.json({ account });
  } catch (error) {
    console.error('Get share account error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/shares/statements/:memberId
 * Get member's share statement
 */
router.get('/statements/:memberId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.params;

    // Verify member belongs to cooperative
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.cooperativeId !== tenantId) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    let account = await prisma.shareAccount.findUnique({
      where: { memberId },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        transactions: {
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    // Create account if it doesn't exist
    if (!account) {
      const count = await prisma.shareAccount.count({
        where: { cooperativeId: tenantId },
      });
      const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

      account = await prisma.shareAccount.create({
        data: {
          memberId,
          cooperativeId: tenantId,
          certificateNo: certNo,
          totalKitta: 0,
          unitPrice: 100,
          totalAmount: 0,
        },
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
              fullName: true,
            },
          },
          transactions: [],
        },
      });
    }

    res.json({ statement: { account } });
  } catch (error) {
    console.error('Get share statement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/shares/certificates
 * List all members with certificates ready to print
 */
router.get('/certificates', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const accounts = await prisma.shareAccount.findMany({
      where: {
        cooperativeId: tenantId,
        totalKitta: { gt: 0 }, // Only accounts with shares
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({ certificates: accounts });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/shares/issue
 * Issue shares (purchase) with payment mode
 */
router.post('/issue', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { memberId, kitta, date, paymentMode, bankAccountId, savingAccountId, remarks } =
      req.body;

    if (!memberId || !kitta || !date || !paymentMode) {
      res.status(400).json({
        error: 'Missing required fields: memberId, kitta, date, paymentMode',
      });
      return;
    }

    if (!['CASH', 'BANK', 'SAVING'].includes(paymentMode)) {
      res.status(400).json({
        error: 'Invalid payment mode. Must be: CASH, BANK, or SAVING',
      });
      return;
    }

    const transaction = await ShareService.issueShares({
      cooperativeId: tenantId,
      memberId,
      kitta: parseInt(kitta),
      date: new Date(date),
      paymentMode,
      bankAccountId,
      savingAccountId,
      remarks,
      userId,
    });

    res.status(201).json({
      message: 'Shares issued successfully',
      transaction,
    });
  } catch (error: any) {
    console.error('Issue shares error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/shares/return
 * Return shares (surrender)
 */
router.post('/return', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { memberId, kitta, date, paymentMode, bankAccountId, remarks } = req.body;

    if (!memberId || !kitta || !date || !paymentMode) {
      res.status(400).json({
        error: 'Missing required fields: memberId, kitta, date, paymentMode',
      });
      return;
    }

    if (!['CASH', 'BANK'].includes(paymentMode)) {
      res.status(400).json({
        error: 'Invalid payment mode. Must be: CASH or BANK',
      });
      return;
    }

    const transaction = await ShareService.returnShares({
      cooperativeId: tenantId,
      memberId,
      kitta: parseInt(kitta),
      date: new Date(date),
      paymentMode,
      bankAccountId,
      remarks,
      userId,
    });

    res.status(201).json({
      message: 'Shares returned successfully',
      transaction,
    });
  } catch (error: any) {
    console.error('Return shares error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/shares/transfer
 * Transfer shares between members
 */
router.post('/transfer', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { fromMemberId, toMemberId, kitta, date, remarks } = req.body;

    if (!fromMemberId || !toMemberId || !kitta || !date) {
      res.status(400).json({
        error: 'Missing required fields: fromMemberId, toMemberId, kitta, date',
      });
      return;
    }

    if (fromMemberId === toMemberId) {
      res.status(400).json({ error: 'Cannot transfer shares to the same member' });
      return;
    }

    const result = await ShareService.transferShares({
      cooperativeId: tenantId,
      fromMemberId,
      toMemberId,
      kitta: parseInt(kitta),
      date: new Date(date),
      remarks,
      userId,
    });

    res.status(201).json({
      message: 'Shares transferred successfully',
      ...result,
    });
  } catch (error: any) {
    console.error('Transfer shares error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/shares/bonus
 * Issue bonus shares
 */
router.post('/bonus', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.id;
    const { memberId, kitta, date, remarks } = req.body;

    if (!memberId || !kitta || !date) {
      res.status(400).json({
        error: 'Missing required fields: memberId, kitta, date',
      });
      return;
    }

    const transaction = await ShareService.issueBonusShares({
      cooperativeId: tenantId,
      memberId,
      kitta: parseInt(kitta),
      date: new Date(date),
      remarks,
      userId,
    });

    res.status(201).json({
      message: 'Bonus shares issued successfully',
      transaction,
    });
  } catch (error: any) {
    console.error('Issue bonus shares error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/shares/transactions
 * Get all share transactions for the cooperative
 */
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId, type } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (memberId) {
      where.memberId = memberId as string;
    }

    if (type) {
      where.type = type as string;
    }

    const transactions = await prisma.shareTransaction.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            fullName: true,
          },
        },
        account: {
          select: {
            id: true,
            certificateNo: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    res.json({ transactions });
  } catch (error) {
    console.error('Get share transactions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Legacy endpoints for backward compatibility
/**
 * GET /api/shares/ledgers
 * @deprecated Use /api/shares/accounts instead
 */
router.get('/ledgers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (memberId) {
      where.memberId = memberId as string;
    }

    const accounts = await prisma.shareAccount.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            transactions: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Map to old format for backward compatibility
    const ledgers = accounts.map((acc) => ({
      id: acc.id,
      memberId: acc.memberId,
      cooperativeId: acc.cooperativeId,
      totalShares: acc.totalKitta,
      shareValue: acc.unitPrice,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
      member: acc.member,
      _count: acc._count,
    }));

    res.json({ ledgers });
  } catch (error) {
    console.error('Get share ledgers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
