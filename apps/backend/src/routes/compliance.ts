import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { requireRole, logSensitiveDataAccess } from '../middleware/role.js';
import { generateTtrXml, generateStrXml } from '../services/aml/goaml.js';
import { screenMember, rescreenAllMembers } from '../services/aml/watchlist.js';
import { updateMemberRisk } from '../services/aml/risk.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const router = Router();

// All routes require authentication, tenant context, and compliance module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('compliance'));

/**
 * GET /api/compliance/audit-logs
 * Get audit logs (with optional filters)
 */
router.get('/audit-logs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { action, entityType, entityId, userId, startDate, endDate } = req.query;

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
        where.timestamp.lte = new Date(endDate as string);
      }
    }

    const auditLogs = await prisma.auditLog.findMany({
      where,
      orderBy: {
        timestamp: 'desc',
      },
      take: 1000, // Limit to prevent huge responses
    });

    res.json({ auditLogs, count: auditLogs.length });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/compliance/audit-logs
 * Create an audit log entry
 * Note: This is typically called automatically by the system, but can be used manually
 */
router.post('/audit-logs', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { action, entityType, entityId, details, ipAddress, userAgent } = req.body;

    if (!action || !entityType) {
      res.status(400).json({ error: 'Missing required fields: action, entityType' });
      return;
    }

    const auditLog = await prisma.auditLog.create({
      data: {
        cooperativeId: tenantId,
        action,
        entityType,
        entityId: entityId || null,
        userId: req.user!.userId,
        details: details || null,
        ipAddress: ipAddress || req.ip || null,
        userAgent: userAgent || req.get('user-agent') || null,
        timestamp: new Date(),
      },
    });

    res.status(201).json({ auditLog });
  } catch (error) {
    console.error('Create audit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== AML Endpoints ====================

/**
 * POST /api/compliance/log-attempt
 * Log a suspicious attempt that didn't result in a transaction
 */
router.post('/log-attempt', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId, details, notes } = req.body;

    if (!memberId || !details) {
      res.status(400).json({ error: 'Missing required fields: memberId, details' });
      return;
    }

    const amlFlag = await prisma.amlFlag.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        type: 'SUSPICIOUS_ATTEMPT',
        details,
        isAttempted: true,
        status: 'pending',
      },
    });

    // Create AML case if it doesn't exist
    const existingCase = await prisma.amlCase.findFirst({
      where: {
        memberId,
        cooperativeId: tenantId,
        type: 'SUSPICIOUS_ATTEMPT',
        status: 'open',
      },
    });

    if (!existingCase) {
      await prisma.amlCase.create({
        data: {
          memberId,
          cooperativeId: tenantId,
          type: 'SUSPICIOUS_ATTEMPT',
          status: 'open',
          notes: notes || 'Suspicious attempt logged',
          isConfidential: true,
        },
      });
    }

    res.status(201).json({ amlFlag });
  } catch (error) {
    console.error('Log attempt error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/compliance/aml/ttr
 * Get TTR queue
 */
router.get('/aml/ttr', requireRole('ComplianceOfficer'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, startDate, endDate } = req.query;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (status) {
      where.status = status as string;
    }

    if (startDate || endDate) {
      where.forDate = {};
      if (startDate) {
        where.forDate.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.forDate.lte = new Date(endDate as string);
      }
    }

    const ttrReports = await prisma.amlTtrReport.findMany({
      where,
      include: {
        member: {
          include: {
            kyc: true,
          },
        },
      },
      orderBy: {
        forDate: 'desc',
      },
    });

    // Fetch SOF declarations for each TTR (by member and date range)
    const reportsWithSof = await Promise.all(
      ttrReports.map(async (ttr) => {
        const nextDay = new Date(ttr.forDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const sof = await prisma.sourceOfFundsDeclaration.findFirst({
          where: {
            memberId: ttr.memberId,
            cooperativeId: tenantId,
            createdAt: {
              gte: ttr.forDate,
              lt: nextDay,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        return {
          ...ttr,
          sourceOfFunds: sof || null,
        };
      })
    );

    res.json({ ttrReports: reportsWithSof, count: reportsWithSof.length });
  } catch (error) {
    console.error('Get TTR reports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/compliance/aml/ttr/:id/generate-xml
 * Generate goAML XML for a TTR
 */
router.post(
  '/aml/ttr/:id/generate-xml',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const xmlPath = await generateTtrXml(id);

      res.json({
        message: 'XML generated successfully',
        xmlPath,
      });
    } catch (error: any) {
      console.error('Generate TTR XML error:', error);
      res.status(400).json({ error: error.message || 'Failed to generate XML' });
    }
  }
);

/**
 * GET /api/compliance/aml/ttr/:id/xml
 * Download TTR XML file
 */
router.get(
  '/aml/ttr/:id/xml',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const ttr = await prisma.amlTtrReport.findUnique({
        where: { id },
      });

      if (!ttr || !ttr.xmlPath) {
        res.status(404).json({ error: 'XML file not found' });
        return;
      }

      // Check if file exists
      try {
        await fs.access(ttr.xmlPath);
      } catch {
        res.status(404).json({ error: 'XML file not found on disk' });
        return;
      }

      res.download(ttr.xmlPath);
    } catch (error) {
      console.error('Download TTR XML error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/compliance/aml/ttr/:id
 * Update TTR report (e.g., reject with reason)
 */
router.put(
  '/aml/ttr/:id',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;

      const ttr = await prisma.amlTtrReport.update({
        where: { id },
        data: {
          status: status || undefined,
          remarks: remarks || undefined,
        },
      });

      res.json({ ttr });
    } catch (error) {
      console.error('Update TTR error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/compliance/aml/cases
 * Get AML cases (with sensitive data access logging)
 */
router.get(
  '/aml/cases',
  requireRole('ComplianceOfficer'),
  logSensitiveDataAccess('GET /api/compliance/aml/cases'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { status, type } = req.query;

      const where: any = {
        cooperativeId: tenantId,
      };

      if (status) {
        where.status = status as string;
      }

      if (type) {
        where.type = type as string;
      }

      const cases = await prisma.amlCase.findMany({
        where,
        include: {
          member: {
            include: {
              kyc: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({ cases, count: cases.length });
    } catch (error) {
      console.error('Get AML cases error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/compliance/aml/cases
 * Create AML case
 */
router.post('/aml/cases', requireRole('ComplianceOfficer'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId, type, notes } = req.body;

    if (!memberId || !type) {
      res.status(400).json({ error: 'Missing required fields: memberId, type' });
      return;
    }

    const amlCase = await prisma.amlCase.create({
      data: {
        memberId,
        cooperativeId: tenantId,
        type,
        status: 'open',
        notes: notes || null,
        isConfidential: true,
      },
    });

    res.status(201).json({ amlCase });
  } catch (error) {
    console.error('Create AML case error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/compliance/aml/cases/:id
 * Update AML case
 */
router.put(
  '/aml/cases/:id',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (notes !== undefined) updateData.notes = notes;
      if (status === 'closed') updateData.closedAt = new Date();

      const amlCase = await prisma.amlCase.update({
        where: { id },
        data: updateData,
      });

      res.json({ amlCase });
    } catch (error) {
      console.error('Update AML case error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/compliance/aml/cases/:id/generate-str
 * Generate STR XML for an AML case
 */
router.post(
  '/aml/cases/:id/generate-str',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const xmlPath = await generateStrXml(id);

      res.json({
        message: 'STR XML generated successfully',
        xmlPath,
      });
    } catch (error: any) {
      console.error('Generate STR XML error:', error);
      res.status(400).json({ error: error.message || 'Failed to generate XML' });
    }
  }
);

/**
 * POST /api/compliance/aml/whitelist-match
 * Whitelist a watchlist match (mark as false positive)
 */
router.post(
  '/aml/whitelist-match',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { memberId, sanctionListId, sanctionListType, reason } = req.body;

      if (!memberId || !sanctionListId || !sanctionListType || !reason) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const whitelisted = await prisma.whitelistedMatch.create({
        data: {
          memberId,
          cooperativeId: tenantId,
          sanctionListId,
          sanctionListType,
          reason,
          whitelistedById: req.user!.userId,
        },
      });

      res.status(201).json({ whitelisted });
    } catch (error) {
      console.error('Whitelist match error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/compliance/aml/screen-member/:memberId
 * Screen a member against watchlists
 */
router.post(
  '/aml/screen-member/:memberId',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { memberId } = req.params;
      const tenantId = req.user!.tenantId;

      const { matches } = await screenMember(memberId, tenantId);

      res.json({ matches });
    } catch (error: any) {
      console.error('Screen member error:', error);
      res.status(400).json({ error: error.message || 'Failed to screen member' });
    }
  }
);

/**
 * GET /api/compliance/aml/kym-status
 * Get KYM status (members with expiring/expired KYM)
 */
router.get(
  '/aml/kym-status',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { expired, pepOnly } = req.query;

      const where: any = {
        cooperativeId: tenantId,
        isActive: true,
      };

      if (pepOnly === 'true') {
        where.pepStatus = true;
      }

      if (expired === 'true') {
        where.nextKymReviewDate = {
          lte: new Date(),
        };
      } else if (expired === 'false') {
        // Expiring soon (within 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        where.nextKymReviewDate = {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        };
      }

      const members = await prisma.member.findMany({
        where,
        include: {
          kyc: true,
        },
        orderBy: {
          nextKymReviewDate: 'asc',
        },
      });

      res.json({ members, count: members.length });
    } catch (error) {
      console.error('Get KYM status error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/compliance/aml/update-risk/:memberId
 * Manually trigger risk assessment update
 */
router.post(
  '/aml/update-risk/:memberId',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const { memberId } = req.params;

      await updateMemberRisk(memberId);

      const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
          id: true,
          riskCategory: true,
          riskFactors: true,
          nextKymReviewDate: true,
        },
      });

      res.json({ member });
    } catch (error: any) {
      console.error('Update risk error:', error);
      res.status(400).json({ error: error.message || 'Failed to update risk' });
    }
  }
);

/**
 * POST /api/compliance/aml/source-of-funds
 * Create or update source of funds declaration
 */
router.post('/aml/source-of-funds', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { transactionId, memberId, declaredText, attachmentPath } = req.body;

    if (!transactionId || !memberId || !declaredText) {
      res
        .status(400)
        .json({ error: 'Missing required fields: transactionId, memberId, declaredText' });
      return;
    }

    // Check if SOF already exists
    const existing = await prisma.sourceOfFundsDeclaration.findFirst({
      where: {
        transactionId,
        memberId,
      },
    });

    let sof;
    if (existing) {
      sof = await prisma.sourceOfFundsDeclaration.update({
        where: { id: existing.id },
        data: {
          declaredText,
          attachmentPath: attachmentPath || existing.attachmentPath,
        },
      });
    } else {
      sof = await prisma.sourceOfFundsDeclaration.create({
        data: {
          transactionId,
          memberId,
          cooperativeId: tenantId,
          declaredText,
          attachmentPath: attachmentPath || null,
        },
      });
    }

    res.status(201).json({ sourceOfFunds: sof });
  } catch (error) {
    console.error('Create SOF declaration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/compliance/aml/risk-report
 * Generate Schedule-3 annual risk assessment report
 */
router.get(
  '/aml/risk-report',
  requireRole('ComplianceOfficer'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      const { year } = req.query;

      const reportYear = year ? parseInt(year as string) : new Date().getFullYear();
      const startDate = new Date(reportYear, 0, 1);
      const endDate = new Date(reportYear, 11, 31, 23, 59, 59);

      // Aggregate by risk category and factors
      const members = await prisma.member.findMany({
        where: {
          cooperativeId: tenantId,
          isActive: true,
        },
        select: {
          riskCategory: true,
          riskFactors: true,
          pepStatus: true,
          kyc: {
            select: {
              country: true,
              state: true,
              occupation: true,
            },
          },
        },
      });

      // Calculate aggregates
      const report = {
        year: reportYear,
        totalMembers: members.length,
        byRiskCategory: {
          high: members.filter((m) => m.riskCategory === 'HIGH').length,
          medium: members.filter((m) => m.riskCategory === 'MEDIUM').length,
          low: members.filter((m) => m.riskCategory === 'LOW').length,
        },
        byRiskFactor: {} as Record<string, number>,
        pepCount: members.filter((m) => m.pepStatus).length,
        byGeography: {} as Record<string, number>,
        byOccupation: {} as Record<string, number>,
      };

      // Aggregate by risk factors
      members.forEach((member) => {
        if (member.riskFactors && Array.isArray(member.riskFactors)) {
          (member.riskFactors as string[]).forEach((factor) => {
            report.byRiskFactor[factor] = (report.byRiskFactor[factor] || 0) + 1;
          });
        }
      });

      // Aggregate by geography
      members.forEach((member) => {
        const country = member.kyc?.country || 'Unknown';
        report.byGeography[country] = (report.byGeography[country] || 0) + 1;
      });

      // Aggregate by occupation
      members.forEach((member) => {
        const occupation = member.kyc?.occupation || 'Unknown';
        report.byOccupation[occupation] = (report.byOccupation[occupation] || 0) + 1;
      });

      res.json({ report });
    } catch (error) {
      console.error('Generate risk report error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
