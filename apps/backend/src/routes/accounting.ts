import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { accountingController } from '../controllers/AccountingController.js';
import { AccountingService } from '../services/accounting.js';
import { prisma } from '../lib/prisma.js';
import { validate, validateAll, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { csrfProtection } from '../middleware/csrf.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { paginationSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';
import {
  createChartOfAccountsSchema,
  updateChartOfAccountsSchema,
  createJournalEntrySchema,
} from '@myerp/shared-types';
import { idSchema } from '../validators/common.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

/**
 * POST /api/accounting/seed
 * Trigger the default NFRS Chart of Accounts seeding
 */
router.post('/seed', csrfProtection, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.userId;
  const result = await accountingController.seedDefaultAccounts(tenantId, userId);
  
  // Audit log
  await createAuditLog({
    action: AuditAction.CONFIGURATION_CHANGED,
    userId,
    tenantId,
    resourceType: 'ChartOfAccounts',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    success: true,
    details: { action: 'seed_default_accounts' },
  });
  
  res.json(result);
}));

/**
 * GET /api/accounting/accounts
 * Fetch Chart of Accounts (with pagination, optionally filtered by type)
 */
router.get(
  '/accounts',
  validateQuery(
    paginationSchema.extend({
      type: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, type } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
      isActive: true,
    };

    if (type) {
      where.type = type.toLowerCase();
    }

    const [accounts, total] = await Promise.all([
      prisma.chartOfAccounts.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                parent: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    type: true,
                  },
                },
                _count: {
                  select: { ledgerEntries: true },
                },
              },
            },
            { page, limit }
          ),
          sortBy || 'code',
          sortOrder || 'asc',
          'code'
        )
      ),
      prisma.chartOfAccounts.count({ where }),
    ]);

    res.json(createPaginatedResponse(accounts, total, { page, limit }));
  })
);

/**
 * POST /api/accounting/accounts
 * Create a new account head
 * Supports new code structure: BB-GGGGG-SS-SSSSS
 * If code is not provided, it will be auto-generated
 */
router.post(
  '/accounts',
  csrfProtection,
  validate(
    createChartOfAccountsSchema.extend({
      code: z.string().min(1).optional(), // Code is optional, can be auto-generated
      subType: z.string().optional(),
      branch: z.string().optional(),
      autoGenerateCode: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = req.validated!;

    const account = await accountingController.createAccount(
      {
        cooperativeId: tenantId,
        ...data,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.CONFIGURATION_CHANGED,
      userId,
      tenantId,
      resourceType: 'ChartOfAccounts',
      resourceId: account.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'created', accountCode: account.code, accountName: account.name },
    });

    res.status(201).json(account);
  })
);

/**
 * POST /api/accounting/accounts/generate-code
 * Generate a new account code automatically
 */
router.post(
  '/accounts/generate-code',
  validate(
    z.object({
      type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
      subType: z.string().optional().default('00'),
      branch: z.string().optional().default('00'),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { type, subType = '00', branch = '00' } = req.validated!;

    const code = await accountingController.generateAccountCode(tenantId, type, subType, branch);
    res.json({ code });
  })
);

/**
 * PUT /api/accounting/accounts/:id
 * Update an account
 */
router.put(
  '/accounts/:id',
  csrfProtection,
  validateAll({
    params: idSchema,
    body: updateChartOfAccountsSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.validatedParams!;
    const data = req.validated!;

    const userId = req.user!.userId;
    const account = await accountingController.updateAccount(id, tenantId, data, userId);

    // Audit log
    await createAuditLog({
      action: AuditAction.CONFIGURATION_CHANGED,
      userId,
      tenantId,
      resourceType: 'ChartOfAccounts',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'updated', accountCode: account.code },
    });

    res.json(account);
  })
);

/**
 * DELETE /api/accounting/accounts/:id
 * Delete an account (only if unused)
 */
router.delete('/accounts/:id', csrfProtection, validateParams(idSchema), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.validatedParams!;

  const userId = req.user!.userId;
  await accountingController.deleteAccount(id, tenantId, userId);

  // Audit log
  await createAuditLog({
    action: AuditAction.CONFIGURATION_CHANGED,
    userId,
    tenantId,
    resourceType: 'ChartOfAccounts',
    resourceId: id,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    success: true,
    details: { action: 'deleted' },
  });

  res.json({ message: 'Account deleted successfully' });
}));

/**
 * POST /api/accounting/product-gl-map
 * Create or update Product GL Mapping
 * Maps loan/saving products to their corresponding GL accounts
 */
router.post(
  '/product-gl-map',
  csrfProtection,
  validate(
    z.object({
      productType: z.enum(['loan', 'saving']),
      productId: z.string().min(1, 'Product ID is required'),
      mapping: z.record(z.any()),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { productType, productId, mapping } = req.validated!;

    const result = await accountingController.setProductGLMap(
      tenantId,
      productType,
      productId,
      mapping
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.CONFIGURATION_CHANGED,
      userId,
      tenantId,
      resourceType: 'ProductGLMapping',
      resourceId: productId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'created_or_updated', productType },
    });

    res.json(result);
  })
);

/**
 * GET /api/accounting/product-gl-map/:productType/:productId
 * Get Product GL Mapping
 */
router.get(
  '/product-gl-map/:productType/:productId',
  validateParams(
    z.object({
      productType: z.enum(['loan', 'saving']),
      productId: z.string().min(1),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { productType, productId } = req.validatedParams!;

    const mapping = await accountingController.getProductGLMap(
      tenantId,
      productType as 'loan' | 'saving',
      productId
    );

    if (!mapping) {
      return res.status(404).json({ error: 'Product GL mapping not found' });
    }

    res.json(mapping);
  })
);

/**
 * POST /api/accounting/loan-repayment
 * Create loan repayment journal entry
 * Dr. Cash, Cr. Loan Principal, Cr. Interest Income, Cr. Penalty (optional)
 */
router.post(
  '/loan-repayment',
  csrfProtection,
  validate(
    z.object({
      loanProductId: z.string().min(1, 'Loan product ID is required'),
      memberLoanAccountCode: z.string().min(1, 'Member loan account code is required'),
      principalAmount: z.number().nonnegative('Principal amount must be non-negative'),
      interestAmount: z.number().nonnegative('Interest amount must be non-negative'),
      penaltyAmount: z.number().nonnegative().optional().default(0),
      cashAccountCode: z.string().optional().default('00-10100-01-00001'),
      description: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const {
      loanProductId,
      memberLoanAccountCode,
      principalAmount,
      interestAmount,
      penaltyAmount = 0,
      cashAccountCode = '00-10100-01-00001',
      description,
    } = req.validated!;

    const result = await accountingController.loanRepaymentEntry(
      tenantId,
      loanProductId,
      memberLoanAccountCode,
      principalAmount,
      interestAmount,
      penaltyAmount,
      cashAccountCode,
      description,
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.PAYMENT_PROCESSED,
      userId,
      tenantId,
      resourceType: 'LoanRepayment',
      resourceId: result.journalEntry?.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { 
        loanProductId,
        principalAmount: principalAmount.toString(),
        interestAmount: interestAmount.toString(),
        penaltyAmount: penaltyAmount.toString(),
        journalEntryNumber: result.journalEntry?.entryNumber,
      },
    });

    res.status(201).json(result);
  })
);

/**
 * GET /api/accounting/net-profit
 * Calculate Net Profit (Total Income - Total Expenses)
 * Query params: startDate (optional), endDate (optional)
 */
router.get('/net-profit', asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { startDate, endDate } = req.query;

  const start = startDate ? new Date(startDate as string) : undefined;
  const end = endDate ? new Date(endDate as string) : undefined;

  const result = await accountingController.calculateNetProfit(tenantId, start, end);

  res.json(result);
}));

/**
 * GET /api/accounting/accounts/:id/statement
 * Get ledger statement for a specific account
 */
router.get('/accounts/:id/statement', validateParams(idSchema), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.validatedParams!;
    const { startDate, endDate } = req.query;

    const account = await prisma.chartOfAccounts.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
        isActive: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Build date filter
    const dateFilter: any = {
      accountId: id,
      cooperativeId: tenantId,
    };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate as string);
      }
    }

    // Get ledger entries
    const ledgerEntries = await prisma.ledger.findMany({
      where: dateFilter,
      orderBy: { createdAt: 'asc' },
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            description: true,
            date: true,
          },
        },
        transaction: {
          select: {
            id: true,
            transactionNumber: true,
            description: true,
            date: true,
          },
        },
      },
    });

    // Get opening balance (balance before startDate if provided)
    let openingBalance = 0;
    if (startDate) {
      const openingLedger = await prisma.ledger.findFirst({
        where: {
          accountId: id,
          cooperativeId: tenantId,
          createdAt: { lt: new Date(startDate as string) },
        },
        orderBy: { createdAt: 'desc' },
      });
      openingBalance = openingLedger ? Number(openingLedger.balance) : 0;
    }

    res.json({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
      openingBalance,
      entries: ledgerEntries.map((entry) => ({
        id: entry.id,
        date: entry.createdAt,
        entryNumber:
          entry.journalEntry?.entryNumber || entry.transaction?.transactionNumber || 'N/A',
        description:
          entry.journalEntry?.description || entry.transaction?.description || 'Ledger Entry',
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: Number(entry.balance),
      })),
    });
}));

/**
 * GET /api/accounting/journal-entries/:entryNumber
 * Get journal entry details by entry number (e.g., JE-2025-000031)
 */
router.get(
  '/journal-entries/:entryNumber',
  validateParams(z.object({ entryNumber: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { entryNumber } = req.validatedParams!;

    const journalEntry = await prisma.journalEntry.findFirst({
      where: {
        entryNumber,
        cooperativeId: tenantId,
      },
      include: {
        ledgers: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Calculate totals
    const totalDebit = journalEntry.ledgers.reduce(
      (sum, ledger) => sum + Number(ledger.debit),
      0
    );
    const totalCredit = journalEntry.ledgers.reduce(
      (sum, ledger) => sum + Number(ledger.credit),
      0
    );

    res.json({
      journalEntry: {
        id: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        description: journalEntry.description,
        date: journalEntry.date,
        createdAt: journalEntry.createdAt,
      },
      entries: journalEntry.ledgers.map((ledger) => ({
        id: ledger.id,
        account: {
          id: ledger.account.id,
          code: ledger.account.code,
          name: ledger.account.name,
          type: ledger.account.type,
        },
        debit: Number(ledger.debit),
        credit: Number(ledger.credit),
        balance: Number(ledger.balance),
      })),
      totals: {
        debit: totalDebit,
        credit: totalCredit,
      },
    });
  })
);

/**
 * POST /api/accounting/migrate-old-accounts
 * Migrate old account codes to NFRS format
 * Consolidates balances from old accounts (1001, 3001, 4001) to NFRS accounts
 */
router.post('/migrate-old-accounts', csrfProtection, asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.userId;
  const result = await AccountingService.migrateOldAccountsToNFRS(tenantId);
  
  // Audit log
  await createAuditLog({
    action: AuditAction.SYSTEM_BACKUP,
    userId,
    tenantId,
    resourceType: 'ChartOfAccounts',
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    success: true,
    details: { action: 'migrate_old_accounts' },
  });
  
  res.json(result);
}));

export default router;
