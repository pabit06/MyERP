import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { ShareService } from '../services/share.service.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { csrfProtection } from '../middleware/csrf.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { issueSharesSchema, returnSharesSchema, issueBonusSharesSchema } from '@myerp/shared-types';
import { paginationWithSearchSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';

const router: Router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * GET /api/shares/dashboard
 * Get summary statistics for shares
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }

    const [totalAccounts, totalKitta, totalAmount, recentTransactions] = await Promise.all([
      prisma.shareAccount.count({
        where: { cooperativeId: tenantId! },
      }),
      prisma.shareAccount.aggregate({
        where: { cooperativeId: tenantId! },
        _sum: { totalKitta: true },
      }),
      prisma.shareAccount.aggregate({
        where: { cooperativeId: tenantId! },
        _sum: { totalAmount: true },
      }),
      prisma.shareTransaction.findMany({
        where: { cooperativeId: tenantId! },
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
  })
);

/**
 * GET /api/shares/accounts
 * Get all share accounts for the cooperative (replaces /ledgers)
 * Also creates share accounts for approved members who don't have them yet
 * Supports pagination, search, and filtering
 */
router.get(
  '/accounts',
  validateQuery(
    paginationWithSearchSchema.extend({
      memberId: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, memberId, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (search) {
      where.OR = [
        { certificateNo: { contains: search, mode: 'insensitive' as const } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    // Find approved members who don't have share accounts yet
    // This handles members who were approved before the fix
    // Get all active members with member numbers
    const allActiveMembers = await prisma.member.findMany({
      where: {
        cooperativeId: tenantId!,
        workflowStatus: 'active',
        isActive: true,
        memberNumber: { not: null },
      },
      select: {
        id: true,
      },
    });

    // Get all memberIds that already have share accounts
    const membersWithAccounts = await prisma.shareAccount.findMany({
      where: { cooperativeId: tenantId! },
      select: { memberId: true },
    });
    const memberIdsWithAccounts = new Set(membersWithAccounts.map((acc) => acc.memberId));

    // Filter to get members without share accounts
    const approvedMembersWithoutAccounts = allActiveMembers.filter(
      (member) => !memberIdsWithAccounts.has(member.id)
    );

    // Create share accounts for approved members who don't have them
    if (approvedMembersWithoutAccounts.length > 0) {
      const { getCurrentSharePrice } = await import('../services/accounting.js');
      const unitPrice = await getCurrentSharePrice(tenantId!, 100);

      // Get the latest certificate number before the loop to ensure sequential numbering
      const latestCert = await prisma.shareAccount.findFirst({
        where: { cooperativeId: tenantId! },
        orderBy: { createdAt: 'desc' },
        select: { certificateNo: true },
      });

      let nextCertNumber = 1;
      if (latestCert?.certificateNo) {
        const match = latestCert.certificateNo.match(/CERT-(\d+)/);
        if (match) {
          nextCertNumber = parseInt(match[1], 10) + 1;
        }
      }

      for (const member of approvedMembersWithoutAccounts) {
        // Check again if account was created by another request
        const existingAccount = await prisma.shareAccount.findUnique({
          where: { memberId: member.id },
        });

        if (!existingAccount) {
          // Use transaction to ensure unique certificate number generation
          try {
            await prisma.$transaction(async (tx) => {
              // Double-check account doesn't exist (race condition protection)
              const stillMissing = await tx.shareAccount.findUnique({
                where: { memberId: member.id },
              });

              // Always get the current highest certificate number to keep nextCertNumber in sync
              // This ensures we don't reuse certificate numbers even if account creation is skipped
              const currentLatest = await tx.shareAccount.findFirst({
                where: { cooperativeId: tenantId! },
                orderBy: { createdAt: 'desc' },
                select: { certificateNo: true },
              });

              let certNumber = nextCertNumber;
              if (currentLatest?.certificateNo) {
                const match = currentLatest.certificateNo.match(/CERT-(\d+)/);
                if (match) {
                  const latestNum = parseInt(match[1], 10);
                  certNumber = latestNum >= nextCertNumber ? latestNum + 1 : nextCertNumber;
                }
              }

              if (!stillMissing) {
                const certNo = `CERT-${String(certNumber).padStart(6, '0')}`;

                await tx.shareAccount.create({
                  data: {
                    cooperativeId: tenantId!,
                    memberId: member.id,
                    certificateNo: certNo,
                    unitPrice,
                    totalKitta: 0,
                    totalAmount: 0,
                    issueDate: new Date(),
                  },
                });
              }

              // Always update nextCertNumber for next iteration, even if account creation was skipped
              // This prevents duplicate certificate numbers when concurrent requests process the same list
              nextCertNumber = certNumber + 1;
            });
          } catch (err) {
            // Ignore errors (e.g., if account was created by another request)
            console.warn(`Failed to create share account for member ${member.id}:`, err);
            // Still update nextCertNumber to prevent reuse even on error
            // Query the latest to get the most up-to-date certificate number
            try {
              const latestCert = await prisma.shareAccount.findFirst({
                where: { cooperativeId: tenantId! },
                orderBy: { createdAt: 'desc' },
                select: { certificateNo: true },
              });
              if (latestCert?.certificateNo) {
                const match = latestCert.certificateNo.match(/CERT-(\d+)/);
                if (match) {
                  const latestNum = parseInt(match[1], 10);
                  nextCertNumber = Math.max(nextCertNumber, latestNum + 1);
                }
              }
            } catch (updateErr) {
              // If we can't update, continue - the next iteration will query fresh
            }
          }
        }
      }
    }

    const [accounts, total] = await Promise.all([
      prisma.shareAccount.findMany(
        applySorting(
          applyPagination(
            {
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
            },
            { page, limit, sortBy, sortOrder }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.shareAccount.count({ where }),
    ]);

    res.json(createPaginatedResponse(accounts, total, { page, limit, sortBy, sortOrder }));
  })
);

/**
 * GET /api/shares/accounts/:memberId
 * Get share account for a specific member
 */
router.get(
  '/accounts/:memberId',
  validateParams(z.object({ memberId: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { memberId } = req.validatedParams!;

    // Verify member belongs to cooperative
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.cooperativeId !== tenantId!) {
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
        where: { cooperativeId: tenantId! },
      });
      const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

      account = await prisma.shareAccount.create({
        data: {
          memberId,
          cooperativeId: tenantId!,
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
          transactions: {
            orderBy: {
              date: 'desc',
            },
          },
        },
      });
    }

    res.json({ account });
  })
);

/**
 * GET /api/shares/statements/:memberId
 * Get member's share statement
 */
router.get(
  '/statements/:memberId',
  validateParams(z.object({ memberId: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { memberId } = req.validatedParams!;

    // Verify member belongs to cooperative
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.cooperativeId !== tenantId!) {
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
        where: { cooperativeId: tenantId! },
      });
      const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

      const newAccount = await prisma.shareAccount.create({
        data: {
          memberId,
          cooperativeId: tenantId!,
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
          transactions: {
            orderBy: {
              date: 'desc',
            },
          },
        },
      });
      account = newAccount;
    }

    res.json({ statement: { account } });
  })
);

/**
 * GET /api/shares/certificates
 * List all members with certificates ready to print (with pagination)
 */
router.get(
  '/certificates',
  validateQuery(paginationWithSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { page, limit, sortBy, sortOrder, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId!,
      totalKitta: { gt: 0 }, // Only accounts with shares
    };

    if (search) {
      where.OR = [
        { certificateNo: { contains: search, mode: 'insensitive' as const } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.shareAccount.findMany(
        applySorting(
          applyPagination(
            {
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
              },
            },
            { page, limit, sortBy, sortOrder }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.shareAccount.count({ where }),
    ]);

    res.json(createPaginatedResponse(accounts, total, { page, limit, sortBy, sortOrder }));
  })
);

/**
 * POST /api/shares/issue
 * Issue shares (purchase) with payment mode
 */
router.post(
  '/issue',
  validate(
    issueSharesSchema.extend({
      kitta: z.union([
        z.number().int().positive(),
        z.string().transform((val) => parseInt(val, 10)),
      ]),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { memberId, kitta, date, paymentMode, bankAccountId, savingAccountId, remarks } =
      req.validated!;

    const transaction = await ShareService.issueShares({
      cooperativeId: tenantId!,
      memberId,
      kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
      date: new Date(date as string),
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
  })
);

/**
 * POST /api/shares/return
 * Return shares (surrender)
 */
router.post(
  '/return',
  csrfProtection,
  validate(
    returnSharesSchema.extend({
      kitta: z.union([
        z.number().int().positive(),
        z.string().transform((val) => parseInt(val, 10)),
      ]),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { memberId, kitta, date, paymentMode, bankAccountId, remarks } = req.validated!;

    const transaction = await ShareService.returnShares({
      cooperativeId: tenantId!,
      memberId,
      kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
      date: new Date(date as string),
      paymentMode,
      bankAccountId,
      remarks,
      userId,
    });

    // Audit log
    const auditTenantId = tenantId!;
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId: auditTenantId,
      resourceType: 'ShareTransaction',
      resourceId: transaction.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'return',
        memberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
        amount: transaction.amount?.toString(),
      },
    });

    res.status(201).json({
      message: 'Shares returned successfully',
      transaction,
    });
  })
);

/**
 * POST /api/shares/transfer
 * Transfer shares between members
 */
router.post(
  '/transfer',
  csrfProtection,
  validate(
    z
      .object({
        fromMemberId: z.string().min(1),
        toMemberId: z.string().min(1),
        kitta: z.union([
          z.number().int().positive(),
          z.string().transform((val) => parseInt(val, 10)),
        ]),
        date: z.string().datetime().or(z.date()),
        remarks: z.string().optional(),
      })
      .refine((data) => data.fromMemberId !== data.toMemberId, {
        message: 'From and to member IDs must be different',
        path: ['toMemberId'],
      })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { fromMemberId, toMemberId, kitta, date, remarks } = req.validated!;

    const result = await ShareService.transferShares({
      cooperativeId: tenantId!,
      fromMemberId,
      toMemberId,
      kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
      date: new Date(date as string),
      remarks,
      userId,
    });

    // Audit log
    const auditTenantId = tenantId!;
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId: auditTenantId,
      resourceType: 'ShareTransaction',
      resourceId: result.fromTransaction?.id || result.toTransaction?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'transfer',
        fromMemberId,
        toMemberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
      },
    });

    res.status(201).json({
      message: 'Shares transferred successfully',
      ...result,
    });
  })
);

/**
 * POST /api/shares/bonus
 * Issue bonus shares
 */
router.post(
  '/bonus',
  csrfProtection,
  validate(
    issueBonusSharesSchema.extend({
      kitta: z.union([
        z.number().int().positive(),
        z.string().transform((val) => parseInt(val, 10)),
      ]),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const userId = req.user!.userId;
    const { memberId, kitta, date, remarks } = req.validated!;

    const transaction = await ShareService.issueBonusShares({
      cooperativeId: tenantId!,
      memberId,
      kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
      date: new Date(date as string),
      remarks,
      userId,
    });

    // Audit log
    const auditTenantId = tenantId!;
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId: auditTenantId,
      resourceType: 'ShareTransaction',
      resourceId: transaction.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'bonus_issue',
        memberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
      },
    });

    res.status(201).json({
      message: 'Bonus shares issued successfully',
      transaction,
    });
  })
);

/**
 * GET /api/shares/transactions
 * Get all share transactions for the cooperative
 */
router.get(
  '/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { memberId, type } = req.query;

    const where: any = {
      cooperativeId: tenantId!,
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
  })
);

// Legacy endpoints for backward compatibility
/**
 * GET /api/shares/ledgers
 * @deprecated Use /api/shares/accounts instead
 */
router.get(
  '/ledgers',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { memberId } = req.query;

    const where: any = {
      cooperativeId: tenantId!,
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
  })
);

export default router;
