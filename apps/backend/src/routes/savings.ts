import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { savingsController } from '../controllers/SavingsController.js';
import { validate, validateAll, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { csrfProtection } from '../middleware/csrf.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import {
  createSavingProductSchema,
  createSavingAccountSchema,
  savingAccountTransactionSchema,
} from '@myerp/shared-types';
import { idSchema, paginationSchema, paginationWithSearchSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * @swagger
 * /savings/products:
 *   get:
 *     summary: Get all saving products
 *     description: Retrieve paginated list of saving products for the cooperative
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PaginationPage'
 *       - $ref: '#/components/parameters/PaginationLimit'
 *       - $ref: '#/components/parameters/PaginationSortBy'
 *       - $ref: '#/components/parameters/PaginationSortOrder'
 *     responses:
 *       200:
 *         description: List of saving products
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/products',
  validateQuery(paginationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { page, limit, sortBy, sortOrder } = req.validatedQuery!;

    const where = {
      cooperativeId: tenantId!,
    };

    const [products, total] = await Promise.all([
      prisma.savingProduct.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit, sortOrder: sortOrder || 'desc' }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.savingProduct.count({ where }),
    ]);

    res.json(
      createPaginatedResponse(products, total, { page, limit, sortOrder: sortOrder || 'desc' })
    );
  })
);

/**
 * POST /api/savings/products
 * Create a new saving product
 */
router.post(
  '/products',
  csrfProtection,
  validate(createSavingProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = req.validated!;

    const product = await savingsController.createProduct(
      {
        cooperativeId: tenantId!,
        ...data,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.CONFIGURATION_CHANGED,
      userId,
      tenantId: tenantId || undefined,
      resourceType: 'SavingProduct',
      resourceId: product.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'created', productName: product.name },
    });

    res.status(201).json({ product });
  })
);

/**
 * @swagger
 * /savings/accounts:
 *   get:
 *     summary: Get all saving accounts
 *     description: Retrieve paginated list of saving accounts with optional filtering
 *     tags: [Savings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/PaginationPage'
 *       - $ref: '#/components/parameters/PaginationLimit'
 *       - $ref: '#/components/parameters/PaginationSortBy'
 *       - $ref: '#/components/parameters/PaginationSortOrder'
 *       - $ref: '#/components/parameters/SearchQuery'
 *       - name: memberId
 *         in: query
 *         description: Filter by member ID
 *         required: false
 *         schema:
 *           type: string
 *       - name: status
 *         in: query
 *         description: Filter by account status
 *         required: false
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of saving accounts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
  '/accounts',
  validateQuery(
    paginationWithSearchSchema.extend({
      memberId: z.string().optional(),
      status: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, memberId, status, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (memberId) {
      where.memberId = memberId;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' as const } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      prisma.savingAccount.findMany(
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
                  },
                },
                product: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                  },
                },
              },
            },
            { page, limit, sortOrder: sortOrder || 'desc' }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.savingAccount.count({ where }),
    ]);

    res.json(
      createPaginatedResponse(accounts, total, { page, limit, sortOrder: sortOrder || 'desc' })
    );
  })
);

/**
 * POST /api/savings/accounts
 * Create a new saving account
 */
router.post(
  '/accounts',
  csrfProtection,
  validate(createSavingAccountSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = req.validated!;

    const account = await savingsController.createAccount(
      {
        cooperativeId: tenantId!,
        ...data,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId: tenantId || undefined,
      resourceType: 'SavingAccount',
      resourceId: account.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: { action: 'created', memberId: account.memberId },
    });

    res.status(201).json({ account });
  })
);

/**
 * GET /api/savings/accounts/:id
 * Get a specific saving account
 */
router.get(
  '/accounts/:id',
  validateParams(idSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId || req.currentCooperativeId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant ID is required' });
      return;
    }
    const { id } = req.validatedParams!;

    const account = await savingsController.getAccount(id, tenantId);
    res.json({ account });
  })
);

/**
 * POST /api/savings/accounts/:id/deposit
 * Deposit amount to saving account
 */
router.post(
  '/accounts/:id/deposit',
  csrfProtection,
  validateAll({
    params: idSchema,
    body: savingAccountTransactionSchema.extend({
      paymentMode: z.string().optional(),
      cashAccountCode: z.string().optional(),
      bankAccountId: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.validatedParams!;
    const { amount, paymentMode, cashAccountCode, bankAccountId, remarks, date } = req.validated!;

    const result = await savingsController.deposit(
      {
        accountId: id,
        amount,
        cooperativeId: tenantId!,
        paymentMode,
        cashAccountCode,
        bankAccountId,
        remarks,
        date: date ? new Date(date as string) : undefined,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.PAYMENT_PROCESSED,
      userId,
      tenantId: tenantId || undefined,
      resourceType: 'SavingAccount',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'deposit',
        amount: amount.toString(),
        transactionId: result.journalEntry?.id,
      },
    });

    res.json({ success: true, ...result });
  })
);

/**
 * POST /api/savings/accounts/:id/withdraw
 * Withdraw amount from saving account
 */
router.post(
  '/accounts/:id/withdraw',
  csrfProtection,
  validateAll({
    params: idSchema,
    body: savingAccountTransactionSchema.extend({
      paymentMode: z.string().optional(),
      cashAccountCode: z.string().optional(),
      bankAccountId: z.string().optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.validatedParams!;
    const { amount, paymentMode, cashAccountCode, bankAccountId, remarks, date } = req.validated!;

    const result = await savingsController.withdraw(
      {
        accountId: id,
        amount,
        cooperativeId: tenantId!,
        paymentMode,
        cashAccountCode,
        bankAccountId,
        remarks,
        date: date ? new Date(date as string) : undefined,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.PAYMENT_PROCESSED,
      userId,
      tenantId: tenantId || undefined,
      resourceType: 'SavingAccount',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'withdraw',
        amount: amount.toString(),
        transactionId: result.journalEntry?.id,
      },
    });

    res.json({ success: true, ...result });
  })
);

/**
 * POST /api/savings/interest/calculate
 * Calculate daily interest for all active saving accounts
 */
router.post(
  '/interest/calculate',
  validate(
    z.object({
      asOfDate: z.string().datetime().or(z.date()).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { asOfDate } = req.validated!;

    const result = await savingsController.calculateInterest(
      tenantId || req.currentCooperativeId!,
      asOfDate ? new Date(asOfDate as string) : undefined
    );

    res.json({ success: true, results: result });
  })
);

/**
 * POST /api/savings/interest/post
 * Post interest to saving accounts
 */
router.post(
  '/interest/post',
  csrfProtection,
  validate(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      interestExpenseGLCode: z.string().optional(),
      tdsPayableGLCode: z.string().optional(),
      date: z.string().datetime().or(z.date()).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { productId, interestExpenseGLCode, tdsPayableGLCode, date } = req.validated!;

    const result = await savingsController.postInterest(
      {
        cooperativeId: tenantId!,
        productId,
        interestExpenseGLCode,
        tdsPayableGLCode,
        date: date ? new Date(date as string) : undefined,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId: tenantId || undefined,
      resourceType: 'SavingProduct',
      resourceId: productId,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'interest_posted',
        accountsAffected: result.posted?.length || 0,
      },
    });

    res.json({ success: true, ...result });
  })
);

export default router;
