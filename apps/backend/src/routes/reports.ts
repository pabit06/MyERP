import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { AccountingService } from '../services/accounting.js';
import { accountingController } from '../controllers/AccountingController.js';
import { ReportBuilder, ReportConfigs, ReportFilter } from '../lib/report-builder.js';
import { prisma } from '../lib/prisma.js';
import {
  getCurrentNepaliFiscalYear,
  getCurrentNepaliCalendarYear,
  generateFiscalYears,
  generateCalendarYears,
  getFiscalYearRange,
  getCalendarYearRange,
} from '../lib/nepali-fiscal-year.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/reports/main
 * Generate main financial report with assets, liabilities, income, and expenses
 */
router.get('/main', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { fiscalYear, month } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Cooperative ID is required' });
    }

    const report = await accountingController.generateMainReport(
      tenantId,
      fiscalYear as string | undefined,
      month as string | undefined
    );

    res.json(report);
  } catch (error: any) {
    console.error('Report generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

/**
 * GET /api/reports/audit
 * Get audit logs report with filtering options
 */
router.get('/audit', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { action, entityType, entityId, userId, startDate, endDate, limit } = req.query;

    if (!tenantId) {
      return res.status(400).json({ error: 'Cooperative ID is required' });
    }

    const where: any = {
      cooperativeId: tenantId,
    };

    if (action) {
      where.action = action as string;
    }

    if (entityType) {
      where.entityType = entityType as string;
    }

    if (entityId) {
      where.entityId = entityId as string;
    }

    if (userId) {
      where.userId = userId as string;
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

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: limit ? parseInt(limit as string) : 1000,
    });

    // Get summary statistics
    const totalCount = await prisma.auditLog.count({ where });
    const actionCounts = await prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    });
    const entityTypeCounts = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where,
      _count: true,
    });

    res.json({
      auditLogs,
      summary: {
        total: totalCount,
        returned: auditLogs.length,
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
  } catch (error: any) {
    console.error('Audit report error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate audit report' });
  }
});

/**
 * POST /api/reports/build
 * Build a dynamic report based on configuration
 */
router.post('/build', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { config, filters } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Report configuration is required' });
    }

    const reportConfig: any = config;
    const customFilters: ReportFilter[] = filters || [];

    const result = await ReportBuilder.build(tenantId, reportConfig, customFilters);

    res.json(result);
  } catch (error: any) {
    console.error('Build report error:', error);
    res.status(500).json({ error: error.message || 'Failed to build report' });
  }
});

/**
 * GET /api/reports/configs
 * Get available report configurations
 */
router.get('/configs', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    console.error('Get report configs error:', error);
    res.status(500).json({ error: error.message || 'Failed to get report configs' });
  }
});

/**
 * GET /api/reports/configs/:name
 * Get a specific report configuration
 */
router.get('/configs/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const configKey = name as keyof typeof ReportConfigs;

    if (!ReportConfigs[configKey]) {
      return res.status(404).json({ error: 'Report configuration not found' });
    }

    res.json({ config: ReportConfigs[configKey] });
  } catch (error: any) {
    console.error('Get report config error:', error);
    res.status(500).json({ error: error.message || 'Failed to get report config' });
  }
});

/**
 * POST /api/reports/configs/:name/execute
 * Execute a predefined report configuration
 */
router.post('/configs/:name/execute', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name } = req.params;
    const { filters } = req.body;

    const configKey = name as keyof typeof ReportConfigs;

    if (!ReportConfigs[configKey]) {
      return res.status(404).json({ error: 'Report configuration not found' });
    }

    const customFilters: ReportFilter[] = filters || [];
    const result = await ReportBuilder.build(tenantId, ReportConfigs[configKey], customFilters);

    res.json(result);
  } catch (error: any) {
    console.error('Execute report error:', error);
    res.status(500).json({ error: error.message || 'Failed to execute report' });
  }
});

/**
 * GET /api/reports/fiscal-years
 * Get Nepali fiscal years and calendar years
 * Query params: type (fiscal|calendar|both), start (BS year), count (number of years)
 */
router.get('/fiscal-years', async (req: Request, res: Response) => {
  try {
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
  } catch (error: any) {
    console.error('Get fiscal years error:', error);
    res.status(500).json({ error: error.message || 'Failed to get fiscal years' });
  }
});

export default router;
