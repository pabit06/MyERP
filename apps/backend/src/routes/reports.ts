import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { accountingController } from '../controllers/AccountingController.js';
import { ReportBuilder, ReportConfigs, ReportFilter } from '../lib/report-builder.js';
import { prisma } from '../lib/prisma.js';
import {
  getCurrentNepaliFiscalYear,
  getCurrentNepaliCalendarYear,
  generateFiscalYears,
  generateCalendarYears,
} from '../lib/nepali-fiscal-year.js';
import { validate, validateParams, validateQuery, validateAll } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { paginationWithSearchSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/reports/main
 * Generate main financial report with assets, liabilities, income, and expenses
 */
router.get(
  '/main',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, month } = req.query;

    const report = await accountingController.generateMainReport(
      tenantId,
      fiscalYear as string | undefined,
      month as string | undefined
    );

    res.json(report);
  })
);

/**
 * GET /api/reports/audit
 * Get audit logs report with pagination and filtering options
 */
router.get(
  '/audit',
  validateQuery(
    paginationWithSearchSchema.extend({
      action: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().optional(),
      userId: z.string().optional(),
      startDate: z.string().datetime().or(z.date()).optional(),
      endDate: z.string().datetime().or(z.date()).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      action,
      entityType,
      entityId,
      userId,
      startDate,
      endDate,
      search,
    } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entityType = entityType;
    }

    if (entityId) {
      where.entityId = entityId;
    }

    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate as string);
      }
      if (endDate) {
        // Add one day to include the entire end date
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.timestamp.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' as const } },
        { entityType: { contains: search, mode: 'insensitive' as const } },
        { entityId: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany(
        applySorting(
          applyPagination(
            {
              where,
            },
            { page, limit }
          ),
          sortBy,
          sortOrder,
          'timestamp'
        )
      ),
      prisma.auditLog.count({ where }),
    ]);

    // Get summary statistics
    const [actionCounts, entityTypeCounts] = await Promise.all([
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ['entityType'],
        where,
        _count: true,
      }),
    ]);

    const paginatedResponse = createPaginatedResponse(auditLogs, total, { page, limit });

    res.json({
      ...paginatedResponse,
      summary: {
        total,
        actionCounts: actionCounts.map((item) => ({
          action: item.action,
          count: item._count,
        })),
        entityTypeCounts: entityTypeCounts.map((item) => ({
          entityType: item.entityType,
          count: item._count,
        })),
      },
    });
  })
);

/**
 * POST /api/reports/build
 * Build a dynamic report based on configuration
 */
router.post(
  '/build',
  validate(
    z.object({
      config: z.any(),
      filters: z.array(z.any()).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { config, filters } = req.validated!;

    const reportConfig: any = config;
    const customFilters: ReportFilter[] = filters || [];

    const result = await ReportBuilder.build(tenantId, reportConfig, customFilters);

    res.json(result);
  })
);

/**
 * GET /api/reports/configs
 * Get available report configurations
 */
router.get(
  '/configs',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      configs: Object.values(ReportConfigs).map((config) => ({
        name: config.name,
        description: config.description,
        entityType: config.entityType,
        columns: config.columns.map((col) => ({
          key: col.key,
          label: col.label,
          type: col.type,
        })),
      })),
    });
  })
);

/**
 * GET /api/reports/configs/:name
 * Get a specific report configuration
 */
router.get(
  '/configs/:name',
  validateParams(z.object({ name: z.string().min(1) })),
  asyncHandler(async (req: Request, res: Response) => {
    const { name } = req.validatedParams!;
    const configKey = name as keyof typeof ReportConfigs;

    if (!ReportConfigs[configKey]) {
      res.status(404).json({ error: 'Report configuration not found' });
      return;
    }

    res.json({ config: ReportConfigs[configKey] });
  })
);

/**
 * POST /api/reports/configs/:name/execute
 * Execute a predefined report configuration
 */
router.post(
  '/configs/:name/execute',
  validateAll({
    params: z.object({ name: z.string().min(1) }),
    body: z.object({
      filters: z.array(z.any()).optional(),
    }),
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { name } = req.validatedParams!;
    const { filters } = req.validated!;

    const configKey = name as keyof typeof ReportConfigs;

    if (!ReportConfigs[configKey]) {
      res.status(404).json({ error: 'Report configuration not found' });
      return;
    }

    const customFilters: ReportFilter[] = filters || [];
    const result = await ReportBuilder.build(tenantId, ReportConfigs[configKey], customFilters);

    res.json(result);
  })
);

/**
 * GET /api/reports/fiscal-years
 * Get Nepali fiscal years and calendar years
 * Query params: type (fiscal|calendar|both), start (BS year), count (number of years)
 */
router.get(
  '/fiscal-years',
  asyncHandler(async (req: Request, res: Response) => {
    const { type = 'both', start, count = '10' } = req.query;
    const startYear = start ? parseInt(start as string) : null;
    const countNum = parseInt(count as string) || 10;

    const result: any = {};

    if (type === 'both' || type === 'fiscal') {
      if (startYear) {
        result.fiscalYears = generateFiscalYears(startYear, countNum);
      } else {
        const current = getCurrentNepaliFiscalYear();
        result.currentFiscalYear = current;
        result.fiscalYears = generateFiscalYears(current.bsYear, countNum);
      }
    }

    if (type === 'both' || type === 'calendar') {
      if (startYear) {
        result.calendarYears = generateCalendarYears(startYear, countNum);
      } else {
        const current = getCurrentNepaliCalendarYear();
        result.currentCalendarYear = current;
        result.calendarYears = generateCalendarYears(current.bsYear, countNum);
      }
    }

    res.json(result);
  })
);

export default router;
