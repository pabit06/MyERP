import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { fixedDepositController } from '../controllers/FixedDepositController.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { FDInterestPostingFrequency, FDPenaltyType } from '@prisma/client';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

// Schemas
const createProductSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  minAmount: z.number().positive(),
  maxAmount: z.number().positive().optional(),
  interestRate: z.number().positive(),
  postingFrequency: z.nativeEnum(FDInterestPostingFrequency),
  durationMonths: z.number().int().positive(),
  penaltyType: z.nativeEnum(FDPenaltyType),
  penaltyValue: z.number().nonnegative().optional(),
  isPrematureAllowed: z.boolean().default(true),
});

const openAccountSchema = z
  .object({
    memberId: z.string().min(1),
    productId: z.string().min(1),
    amount: z.number().positive(),
    sourceAccountId: z.string().optional(),
    cashAccountCode: z.string().optional(),
    nomineeName: z.string().optional(),
    nomineeRelation: z.string().optional(),
    nomineePhone: z.string().optional(),
    nomineeFatherName: z.string().optional(),
    remarks: z.string().optional(),
  })
  .refine((data) => data.sourceAccountId || data.cashAccountCode, {
    message: 'Either sourceAccountId (Savings) or cashAccountCode must be provided',
    path: ['cashAccountCode'],
  });

/**
 * POST /api/fixed-deposits/products
 * Create a new FD Product
 */
router.post(
  '/products',
  validate(createProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await fixedDepositController.createProduct(tenantId!, req.validated!);
    res.status(201).json(result);
  })
);

/**
 * GET /api/fixed-deposits/products
 * List all active FD Products
 */
router.get(
  '/products',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await fixedDepositController.getProducts(tenantId!);
    res.json(result);
  })
);

/**
 * POST /api/fixed-deposits/accounts
 * Open a new FD Account
 */
router.post(
  '/accounts',
  validate(openAccountSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const result = await fixedDepositController.openAccount(tenantId!, userId!, req.validated!);
    res.status(201).json(result);
  })
);

/**
 * POST /api/fixed-deposits/interest/calculate
 * Trigger Daily Interest Calculation
 */
router.post(
  '/interest/calculate',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const result = await fixedDepositController.calculateDailyInterest(tenantId!);
    res.json(result);
  })
);

/**
 * GET /api/fixed-deposits/accounts
 * List all active FD Accounts
 */
router.get(
  '/accounts',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const memberId = req.query.memberId as string | undefined;
    const result = await fixedDepositController.getAccounts(tenantId!, memberId);
    res.json(result);
  })
);

/**
 * POST /api/fixed-deposits/accounts/:id/close
 * Close FD Account
 */
router.post(
  '/accounts/:id/close',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const accountId = req.params.id;
    const result = await fixedDepositController.closeAccount(
      tenantId!,
      userId!,
      accountId!,
      req.body
    );
    res.json(result);
  })
);

export default router;
