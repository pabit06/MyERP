import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { requireRole, logSensitiveDataAccess } from '../middleware/role.js';
import { generateTtrXml, generateStrXml } from '../services/aml/goaml.js';
import { screenMember } from '../services/aml/watchlist.js';
import { updateMemberRisk } from '../services/aml/risk.js';
import { saveUploadedFile, deleteFile } from '../lib/upload.js';
import multer from 'multer';
import * as fs from 'fs/promises';
import path from 'path';
import { validate, validateAll, validateQuery } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { paginationWithSearchSchema } from '../validators/common.js';
import { applyPagination, createPaginatedResponse, applySorting } from '../lib/pagination.js';
import { createAmlCaseSchema, updateAmlCaseStatusSchema } from '@myerp/shared-types';
import { idSchema } from '../validators/common.js';

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF and image files
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPEG, JPG, and PNG files are allowed.'));
    }
  },
});

const router = Router();

// All routes require authentication, tenant context, and compliance module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('compliance'));

/**
 * GET /api/compliance/audit-logs
 * Get audit logs (with pagination and optional filters)
 */
router.get(
  '/audit-logs',
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
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
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
      cooperativeId: tenantId!,
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
        where.timestamp.lte = new Date(endDate as string);
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
            { page, limit, sortBy, sortOrder }
          ),
          sortBy,
          sortOrder,
          'timestamp'
        )
      ),
      prisma.auditLog.count({ where }),
    ]);

    res.json(createPaginatedResponse(auditLogs, total, { page, limit, sortBy, sortOrder }));
  })
);

/**
 * POST /api/compliance/audit-logs
 * Create an audit log entry
 * Note: This is typically called automatically by the system, but can be used manually
 */
router.post(
  '/audit-logs',
  validate(
    z.object({
      action: z.string().min(1, 'Action is required'),
      entityType: z.string().min(1, 'Entity type is required'),
      entityId: z.string().optional(),
      details: z.any().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { action, entityType, entityId, details, ipAddress, userAgent } = req.validated!;

    const auditLog = await prisma.auditLog.create({
      data: {
        cooperativeId: tenantId!,
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
  })
);

// ==================== AML Endpoints ====================

/**
 * POST /api/compliance/log-attempt
 * Log a suspicious attempt that didn't result in a transaction
 */
router.post(
  '/log-attempt',
  validate(
    z.object({
      memberId: z.string().min(1, 'Member ID is required'),
      details: z.any(),
      notes: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { memberId, details, notes } = req.validated!;

    const amlFlag = await prisma.amlFlag.create({
      data: {
        memberId,
        cooperativeId: tenantId!,
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
        cooperativeId: tenantId!,
        type: 'SUSPICIOUS_ATTEMPT',
        status: 'open',
      },
    });

    if (!existingCase) {
      await prisma.amlCase.create({
        data: {
          memberId,
          cooperativeId: tenantId!,
          type: 'SUSPICIOUS_ATTEMPT',
          status: 'open',
          notes: notes || 'Suspicious attempt logged',
          isConfidential: true,
        },
      });
    }

    res.status(201).json({ amlFlag });
  })
);

/**
 * GET /api/compliance/aml/ttr
 * Get TTR queue (with pagination)
 */
router.get(
  '/aml/ttr',
  requireRole('ComplianceOfficer'),
  validateQuery(
    paginationWithSearchSchema.extend({
      status: z.string().optional(),
      startDate: z.string().datetime().or(z.date()).optional(),
      endDate: z.string().datetime().or(z.date()).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, status, startDate, endDate, search } =
      req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (status) {
      where.status = status;
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

    if (search) {
      where.OR = [
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
      ];
    }

    const [ttrReports, total] = await Promise.all([
      prisma.amlTtrReport.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                member: {
                  include: {
                    kyc: true,
                  },
                },
              },
            },
            { page, limit, sortBy, sortOrder }
          ),
          sortBy,
          sortOrder,
          'forDate'
        )
      ),
      prisma.amlTtrReport.count({ where }),
    ]);

    // Batch fetch SOF declarations for all TTRs to avoid N+1 queries
    const memberIds = [...new Set(ttrReports.map((ttr) => ttr.memberId))];
    const dateRanges = ttrReports.map((ttr) => ({
      memberId: ttr.memberId,
      startDate: ttr.forDate,
      endDate: new Date(ttr.forDate),
    }));

    // Fetch all SOF declarations for these members in the date ranges
    const allSofDeclarations = await prisma.sourceOfFundsDeclaration.findMany({
      where: {
        memberId: { in: memberIds },
        cooperativeId: tenantId!,
        OR: dateRanges.map((range) => ({
          memberId: range.memberId,
          createdAt: {
            gte: range.startDate,
            lt: new Date(range.endDate.getTime() + 24 * 60 * 60 * 1000), // Add 1 day
          },
        })),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Create a map of memberId + date -> SOF declaration
    const sofMap = new Map<string, (typeof allSofDeclarations)[0]>();
    for (const sof of allSofDeclarations) {
      const key = `${sof.memberId}-${sof.createdAt.toISOString().split('T')[0]}`;
      if (!sofMap.has(key)) {
        sofMap.set(key, sof);
      }
    }

    // Map TTRs with their SOF declarations
    const reportsWithSof = ttrReports.map((ttr) => {
      const ttrDate = ttr.forDate.toISOString().split('T')[0];
      const key = `${ttr.memberId}-${ttrDate}`;
      const sof = sofMap.get(key) || null;

      return {
        ...ttr,
        sourceOfFunds: sof,
      };
    });

    res.json(createPaginatedResponse(reportsWithSof, total, { page, limit, sortBy, sortOrder }));
  })
);

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

      // Validate that the path is within the uploads directory to prevent path traversal
      const uploadsRoot = path.join(process.cwd(), 'uploads');
      const resolvedPath = path.resolve(ttr.xmlPath);
      const resolvedRoot = path.resolve(uploadsRoot);

      if (!resolvedPath.startsWith(resolvedRoot)) {
        res.status(403).json({ error: 'Invalid file path: path must be within uploads directory' });
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
 * Get AML cases (with pagination and sensitive data access logging)
 */
router.get(
  '/aml/cases',
  requireRole('ComplianceOfficer'),
  logSensitiveDataAccess('GET /api/compliance/aml/cases'),
  validateQuery(
    paginationWithSearchSchema.extend({
      status: z.string().optional(),
      type: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { page, limit, sortBy, sortOrder, status, type, search } = req.validatedQuery!;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { member: { memberNumber: { contains: search, mode: 'insensitive' as const } } },
        { member: { firstName: { contains: search, mode: 'insensitive' as const } } },
        { member: { lastName: { contains: search, mode: 'insensitive' as const } } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.amlCase.findMany(
        applySorting(
          applyPagination(
            {
              where,
              include: {
                member: {
                  include: {
                    kyc: true,
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
      prisma.amlCase.count({ where }),
    ]);

    res.json(createPaginatedResponse(cases, total, { page, limit, sortBy, sortOrder }));
  })
);

/**
 * POST /api/compliance/aml/cases
 * Create AML case
 */
router.post(
  '/aml/cases',
  requireRole('ComplianceOfficer'),
  validate(createAmlCaseSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { memberId, caseType, description } = req.validated!;

    const amlCase = await prisma.amlCase.create({
      data: {
        memberId,
        cooperativeId: tenantId!,
        type: caseType,
        status: 'open',
        notes: description || null,
        isConfidential: true,
      },
    });

    res.status(201).json({ amlCase });
  })
);

/**
 * PUT /api/compliance/aml/cases/:id
 * Update AML case
 */
router.put(
  '/aml/cases/:id',
  requireRole('ComplianceOfficer'),
  validateAll({
    params: idSchema,
    body: updateAmlCaseStatusSchema,
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.validatedParams!;
    const { status, remarks } = req.validated!;

    const updateData: any = {
      status,
      notes: remarks,
    };
    if (status === 'CLOSED') updateData.closedAt = new Date();

    const amlCase = await prisma.amlCase.update({
      where: { id },
      data: updateData,
    });

    res.json({ amlCase });
  })
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
          cooperativeId: tenantId!,
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
      const tenantId = req.user!.tenantId || req.currentCooperativeId;
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant ID is required' });
        return;
      }

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
        cooperativeId: tenantId!,
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
 * POST /api/compliance/aml/source-of-funds/upload
 * Upload a file for source of funds declaration
 */
router.post(
  '/aml/source-of-funds/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const tenantId = req.user!.tenantId;
      if (!tenantId) {
        res.status(403).json({ error: 'Tenant context required' });
        return;
      }

      // Save file to disk
      const fileInfo = await saveUploadedFile(req.file, 'sof', tenantId);

      res.status(200).json({
        filePath: fileInfo.filePath,
        fileName: fileInfo.fileName,
        fileSize: fileInfo.fileSize,
        mimeType: fileInfo.mimeType,
      });
    } catch (error: any) {
      console.error('File upload error:', error);
      res.status(400).json({ error: error.message || 'Failed to upload file' });
    }
  }
);

/**
 * POST /api/compliance/aml/source-of-funds
 * Create or update source of funds declaration
 */
router.post(
  '/aml/source-of-funds',
  validate(
    z.object({
      transactionId: z.string().min(1, 'Transaction ID is required'),
      memberId: z.string().min(1, 'Member ID is required'),
      declaredText: z.string().min(1, 'Declared text is required'),
      attachmentPath: z.string().optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const { transactionId, memberId, declaredText, attachmentPath } = req.validated!;

    // Check if SOF already exists
    const existing = await prisma.sourceOfFundsDeclaration.findFirst({
      where: {
        transactionId,
        memberId,
      },
    });

    let sof;
    if (existing) {
      // Delete old file if new one is provided
      if (attachmentPath && existing.attachmentPath && attachmentPath !== existing.attachmentPath) {
        try {
          await deleteFile(existing.attachmentPath);
        } catch (error) {
          console.error('Error deleting old file:', error);
          // Continue even if deletion fails
        }
      }

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
          cooperativeId: tenantId!,
          declaredText,
          attachmentPath: attachmentPath || null,
        },
      });
    }

    res.status(201).json({ sourceOfFunds: sof });
  })
);

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
      const startDate = new Date(reportYear, 0, 1, 0, 0, 0); // January 1st of the report year
      const endDate = new Date(reportYear, 11, 31, 23, 59, 59); // December 31st of the report year

      // Aggregate by risk category and factors
      // Filter members created during the report year
      const members = await prisma.member.findMany({
        where: {
          cooperativeId: tenantId!,
          isActive: true,
          createdAt: {
            gte: startDate, // Members created on or after January 1st of the report year
            lte: endDate, // Members created on or before December 31st of the report year
          },
        },
        select: {
          riskCategory: true,
          riskFactors: true,
          pepStatus: true,
          kyc: {
            select: {
              nationality: true,
              permanentProvince: true,
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
        const geography = member.kyc?.nationality || member.kyc?.permanentProvince || 'Unknown';
        report.byGeography[geography] = (report.byGeography[geography] || 0) + 1;
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
