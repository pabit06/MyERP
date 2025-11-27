import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { saveUploadedFile, deleteFile } from '../lib/upload.js';
import { getCurrentNepaliFiscalYear } from '../lib/nepali-fiscal-year.js';

const router = Router();

// Map frontend status values to DartaStatus enum values
const mapDartaStatus = (status: string): string | undefined => {
  const statusMap: Record<string, string> = {
    'PENDING': 'ACTIVE',      // Frontend "PENDING" maps to "ACTIVE" in schema
    'ACTIVE': 'ACTIVE',
    'IN_PROGRESS': 'PROCESSING', // Frontend "IN_PROGRESS" maps to "PROCESSING" in schema
    'PROCESSING': 'PROCESSING',
    'COMPLETED': 'COMPLETED',
    'DONE': 'COMPLETED',
    'ARCHIVED': 'ARCHIVED',
    'CANCELLED': 'CANCELLED',
  };
  return statusMap[status.toUpperCase()];
};

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'text/plain',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// All routes require authentication, tenant context, and DMS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('dms'));

/**
 * GET /api/darta
 * Get all dartas with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, category, search, fiscalYear, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (status) {
      const mappedStatus = mapDartaStatus(status as string);
      if (mappedStatus) {
        where.status = mappedStatus;
      }
    }

    if (category) {
      where.category = category as string;
    }

    if (fiscalYear) {
      where.fiscalYear = fiscalYear as string;
    }

    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { dartaNumber: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [dartas, total] = await Promise.all([
      prisma.darta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        include: {
          documents: {
            select: {
              id: true,
              title: true,
              fileName: true,
            },
          },
          _count: {
            select: {
              documents: true,
              movements: true,
            },
          },
        },
      }),
      prisma.darta.count({ where }),
    ]);

    res.json({
      dartas,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (error) {
    console.error('Get dartas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/darta/:id
 * Get single darta with details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const darta = await prisma.darta.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        movements: {
          orderBy: { movedAt: 'desc' },
          include: {
            // Include user details if needed
          },
        },
      },
    });

    if (!darta) {
      res.status(404).json({ error: 'Darta not found' });
      return;
    }

    res.json({ darta });
  } catch (error) {
    console.error('Get darta error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/darta
 * Create a new darta
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { 
      title, 
      description, 
      category, 
      subject, 
      priority, 
      remarks,
      senderName,
      senderAddress,
      senderChalaniNo,
      senderChalaniDate,
      receivedDate,
      fiscalYear: fiscalYearParam
    } = req.body;

    if (!title) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    if (!senderName) {
      res.status(400).json({ error: 'Sender name is required' });
      return;
    }

    // Generate darta number
    // Use actual Nepali fiscal year (starts on Shrawan 1, approximately mid-July)
    // Fiscal year runs from Shrawan (month 4) to Ashad (month 3 of next year)
    const currentFiscalYear = getCurrentNepaliFiscalYear();
    let fiscalYearStr = fiscalYearParam || currentFiscalYear.label.replace('FY ', '');
    
    // Normalize fiscal year format to shortened format (2-digit/2-digit) to match frontend
    // Accepts both "2081/82" and "081/082" formats, normalizes to "081/082"
    let bsYear: number;
    if (fiscalYearStr.includes('/')) {
      const [startYearStr, endYearStr] = fiscalYearStr.split('/');
      if (startYearStr.length === 2) {
        // Already in shortened format "080/081"
        bsYear = 2000 + parseInt(startYearStr);
      } else {
        // Full format "2081/82" - convert to shortened format
        bsYear = parseInt(startYearStr);
        // End year is always bsYear + 1 for fiscal year format
        const endYear = bsYear + 1;
        fiscalYearStr = `${String(bsYear).slice(-2)}/${String(endYear).slice(-2)}`;
      }
    } else {
      // Fallback to current fiscal year
      bsYear = currentFiscalYear.bsYear;
      fiscalYearStr = `${String(bsYear).slice(-2)}/${String(bsYear + 1).slice(-2)}`;
    }
    
    // Count documents with the same fiscalYear string (not by date, to handle custom fiscal years)
    // This ensures the count matches the fiscal year used in the document number
    const count = await prisma.darta.count({
      where: {
        cooperativeId: tenantId,
        fiscalYear: fiscalYearStr,
      },
    });
    const dartaNumber = `D-${String(bsYear).slice(-2)}-${String(count + 1).padStart(3, '0')}`;

    const darta = await prisma.darta.create({
      data: {
        cooperativeId: tenantId,
        fiscalYear: fiscalYearStr,
        serialNo: count + 1,
        dartaNumber,
        title,
        description,
        category,
        subject,
        priority: (priority || 'NORMAL').toUpperCase(),
        remarks,
        senderName,
        senderAddress,
        senderChalaniNo,
        senderChalaniDate: senderChalaniDate ? new Date(senderChalaniDate) : null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        createdBy: req.user!.userId,
      },
      include: {
        documents: true,
        movements: true,
      },
    });

    // Create initial movement record
    await prisma.dartaMovement.create({
      data: {
        dartaId: darta.id,
        cooperativeId: tenantId,
        movementType: 'create',
        movedBy: req.user!.userId,
      },
    });

    res.status(201).json({ darta });
  } catch (error) {
    console.error('Create darta error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/darta/:id
 * Update darta
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { title, description, category, subject, priority, status, remarks } = req.body;

    const darta = await prisma.darta.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!darta) {
      res.status(404).json({ error: 'Darta not found' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (subject !== undefined) updateData.subject = subject;
    if (priority) updateData.priority = (priority as string).toUpperCase();
    if (status) {
      const mappedStatus = mapDartaStatus(status as string);
      if (mappedStatus) {
        updateData.status = mappedStatus;
        if (mappedStatus === 'COMPLETED' || mappedStatus === 'ARCHIVED') {
          updateData.closedAt = new Date();
          updateData.closedBy = req.user!.userId;
        }
      }
    }
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await prisma.darta.update({
      where: { id },
      data: updateData,
      include: {
        documents: true,
        movements: true,
      },
    });

    res.json({ darta: updated });
  } catch (error) {
    console.error('Update darta error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/darta/:id
 * Delete darta
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const darta = await prisma.darta.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        documents: true,
      },
    });

    if (!darta) {
      res.status(404).json({ error: 'Darta not found' });
      return;
    }

    // Delete associated files
    for (const doc of darta.documents) {
      if (doc.filePath) {
        await deleteFile(doc.filePath);
      }
    }

    await prisma.darta.delete({
      where: { id },
    });

    res.json({ message: 'Darta deleted successfully' });
  } catch (error) {
    console.error('Delete darta error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/darta/:id/upload
 * Upload document to darta
 */
router.post('/:id/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const { title, description } = req.body;

    const darta = await prisma.darta.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!darta) {
      res.status(404).json({ error: 'Darta not found' });
      return;
    }

    const fileInfo = await saveUploadedFile(req.file, 'darta-documents', tenantId);

    const document = await prisma.dartaDocument.create({
      data: {
        dartaId: id,
        cooperativeId: tenantId,
        title: title || req.file.originalname,
        fileName: fileInfo.fileName,
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
        mimeType: fileInfo.mimeType,
        description,
        uploadedBy: req.user!.userId,
      },
    });

    res.status(201).json({ document });
  } catch (error: any) {
    console.error('Upload darta document error:', error);
    if (error.message && error.message.includes('Invalid file type')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/darta/:id/movement
 * Record darta movement
 */
router.post('/:id/movement', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { movementType, fromUserId, toUserId, fromDepartment, toDepartment, remarks } = req.body;

    if (!movementType) {
      res.status(400).json({ error: 'Movement type is required' });
      return;
    }

    const darta = await prisma.darta.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!darta) {
      res.status(404).json({ error: 'Darta not found' });
      return;
    }

    const movement = await prisma.dartaMovement.create({
      data: {
        dartaId: id,
        cooperativeId: tenantId,
        movementType,
        fromUserId,
        toUserId,
        fromDepartment,
        toDepartment,
        remarks,
        movedBy: req.user!.userId,
      },
    });

    res.status(201).json({ movement });
  } catch (error) {
    console.error('Create darta movement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/darta/:id/download/:docId
 * Download darta document
 */
router.get('/:id/download/:docId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id, docId } = req.params;

    const document = await prisma.dartaDocument.findFirst({
      where: {
        id: docId,
        dartaId: id,
        cooperativeId: tenantId,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const { promises: fs } = await import('fs');
    const path = await import('path');
    const cleanPath = document.filePath.startsWith('/') ? document.filePath.slice(1) : document.filePath;
    const fullPath = path.join(process.cwd(), cleanPath);

    try {
      await fs.access(fullPath);
    } catch {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    res.download(fullPath, document.fileName);
  } catch (error) {
    console.error('Download darta document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

