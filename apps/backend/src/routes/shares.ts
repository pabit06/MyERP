import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { shareController } from '../controllers/ShareController.js';
import { validate, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { csrfProtection } from '../middleware/csrf.js';
import { issueSharesSchema, returnSharesSchema, issueBonusSharesSchema } from '@myerp/shared-types';
import { paginationWithSearchSchema } from '../validators/common.js';
import { createPaginatedResponse } from '../lib/pagination.js';

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
    const stats = await shareController.getDashboardStats(req.user!.tenantId!);
    res.json(stats);
  })
);

/**
 * GET /api/shares/accounts
 * Get all share accounts for the cooperative
 */
router.get(
  '/accounts',
  validateQuery(
    paginationWithSearchSchema.extend({
      memberId: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder, memberId, search } = req.validatedQuery!;
    const result = await shareController.getAccounts(req.user!.tenantId!, {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      memberId,
    });
    res.json(
      createPaginatedResponse(result.accounts, result.total, { page, limit, sortBy, sortOrder })
    );
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
    const account = await shareController.getAccountByMemberId(
      req.validatedParams!.memberId,
      req.user!.tenantId!
    );
    res.json({ account });
  })
);

/**
 * GET /api/shares/statements/:memberId
 * Get member's share statement (legacy alias for accounts/:memberId)
 */
router.get(
  '/statements/:memberId',
  validateParams(z.object({ memberId: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const account = await shareController.getAccountByMemberId(
      req.validatedParams!.memberId,
      req.user!.tenantId!
    );
    res.json({ statement: { account } });
  })
);

/**
 * GET /api/shares/certificates
 * List all members with certificates ready to print
 */
router.get(
  '/certificates',
  validateQuery(paginationWithSearchSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { page, limit, sortBy, sortOrder, search } = req.validatedQuery!;
    const result = await shareController.getCertificates(req.user!.tenantId!, {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
    });
    res.json(
      createPaginatedResponse(result.accounts, result.total, { page, limit, sortBy, sortOrder })
    );
  })
);

/**
 * POST /api/shares/issue
 * Issue shares (purchase)
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
    const { memberId, kitta, date, paymentMode, bankAccountId, savingAccountId, remarks } =
      req.validated!;
    const transaction = await shareController.issueShares(
      {
        cooperativeId: req.user!.tenantId!,
        memberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
        date,
        paymentMode,
        bankAccountId,
        savingAccountId,
        remarks,
      },
      req.user!.userId
    );
    res.status(201).json({ message: 'Shares issued successfully', transaction });
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
    const { memberId, kitta, date, paymentMode, bankAccountId, remarks } = req.validated!;
    const transaction = await shareController.returnShares(
      {
        cooperativeId: req.user!.tenantId!,
        memberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
        date,
        paymentMode,
        bankAccountId,
        remarks,
      },
      req.user!.userId,
      req.ip,
      req.get('user-agent')
    );
    res.status(201).json({ message: 'Shares returned successfully', transaction });
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
    const { fromMemberId, toMemberId, kitta, date, remarks } = req.validated!;
    const result = await shareController.transferShares(
      {
        cooperativeId: req.user!.tenantId!,
        fromMemberId,
        toMemberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
        date,
        remarks,
      },
      req.user!.userId,
      req.ip,
      req.get('user-agent')
    );
    res.status(201).json({ message: 'Shares transferred successfully', ...result });
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
    const { memberId, kitta, date, remarks } = req.validated!;
    const transaction = await shareController.issueBonus(
      {
        cooperativeId: req.user!.tenantId!,
        memberId,
        kitta: typeof kitta === 'number' ? kitta : parseInt(kitta, 10),
        date,
        remarks,
      },
      req.user!.userId,
      req.ip,
      req.get('user-agent')
    );
    res.status(201).json({ message: 'Bonus shares issued successfully', transaction });
  })
);

/**
 * GET /api/shares/transactions
 * Get all share transactions
 */
router.get(
  '/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const { memberId, type } = req.query;
    const transactions = await shareController.getTransactions(req.user!.tenantId!, {
      memberId: memberId as string,
      type: type as string,
    });
    res.json({ transactions });
  })
);

/**
 * GET /api/shares/ledgers
 * @deprecated Use /api/shares/accounts instead
 */
router.get(
  '/ledgers',
  validateQuery(
    paginationWithSearchSchema.extend({
      memberId: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    // Redirect logic to new controller method
    const { page, limit, sortBy, sortOrder, memberId, search } = req.validatedQuery!;
    const result = await shareController.getAccounts(req.user!.tenantId!, {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      memberId,
    });
    res.json(
      createPaginatedResponse(result.accounts, result.total, { page, limit, sortBy, sortOrder })
    );
  })
);

export default router;
