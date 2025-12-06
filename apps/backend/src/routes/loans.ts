import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { loansController } from '../controllers/LoansController.js';
import { validate, validateAll, validateParams, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { csrfProtection } from '../middleware/csrf.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { createLoanProductSchema, createLoanApplicationSchema } from '@myerp/shared-types';
import { idSchema, paginationSchema, paginationWithSearchSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * GET /api/loans/products
 * Get all loan products for the cooperative (with pagination)
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
      prisma.loanProduct.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit, sortBy, sortOrder }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.loanProduct.count({ where }),
    ]);

    res.json(createPaginatedResponse(products, total, { page, limit, sortBy, sortOrder }));
  })
);

/**
 * POST /api/loans/products
 * Create a new loan product
 */
router.post(
  '/products',
  csrfProtection,
  validate(createLoanProductSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = req.validated!;

    const product = await loansController.createProduct(
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
      tenantId,
      resourceType: 'LoanProduct',
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
 * GET /api/loans/applications
 * Get all loan applications for the cooperative (with pagination)
 */
router.get(
  '/applications',
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
        { applicationNumber: { contains: search, mode: 'insensitive' as const } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [applications, total] = await Promise.all([
      prisma.loanApplication.findMany(
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
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'createdAt'
        )
      ),
      prisma.loanApplication.count({ where }),
    ]);

    res.json(createPaginatedResponse(applications, total, { page, limit }));
  })
);

/**
 * POST /api/loans/applications
 * Create a new loan application
 */
router.post(
  '/applications',
  csrfProtection,
  validate(createLoanApplicationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const data = req.validated!;

    const application = await loansController.createApplication(
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
      tenantId,
      resourceType: 'LoanApplication',
      resourceId: application.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'created',
        memberId: application.memberId,
        amount: application.requestedAmount?.toString(),
      },
    });

    res.status(201).json({ application });
  })
);

/**
 * POST /api/loans/applications/:id/approve
 * Approve a loan application and generate EMI schedule
 */
router.post(
  '/applications/:id/approve',
  csrfProtection,
  validateAll({
    params: idSchema,
    body: z.object({
      disbursedDate: z.string().datetime().or(z.date()).optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.validatedParams!;
    const { disbursedDate } = req.validated!;

    const result = await loansController.approveApplication(
      id,
      tenantId,
      {
        disbursedDate: disbursedDate ? new Date(disbursedDate as string) : undefined,
      },
      userId
    );

    // Audit log
    await createAuditLog({
      action: AuditAction.TRANSACTION_CREATED,
      userId,
      tenantId,
      resourceType: 'LoanApplication',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
      details: {
        action: 'approved',
        memberId: result.application.memberId,
        amount: result.application.approvedAmount?.toString(),
      },
    });

    res.json({
      message: 'Loan application approved and EMI schedule generated',
      application: result.application,
      emiSchedule: result.emiSchedules,
    });
  })
);

/**
 * GET /api/loans/applications/:id/emi-schedule
 * Get EMI schedule for a loan application
 */
router.get(
  '/applications/:id/emi-schedule',
  validateParams(idSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { id } = req.validatedParams!;

    const emiSchedule = await loansController.getEMISchedule(id, tenantId);
    res.json({ emiSchedule });
  })
);

export default router;
