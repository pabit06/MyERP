import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { saveUploadedFile, deleteFile } from '../lib/upload.js';
import { getCurrentNepaliFiscalYear } from '../lib/nepali-fiscal-year.js';

const router = Router();

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
 * GET /api/patra-chalani
 * Get all patra chalanis with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { type, status, category, search, startDate, endDate, page = '1', limit = '20' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      cooperativeId: tenantId,
    };

    if (type) {
      where.type = type as string;
    }

    if (status) {
      where.status = status as string;
    }

    if (category) {
      where.category = category as string;
    }

    if (search) {
      where.OR = [
        { subject: { contains: search as string, mode: 'insensitive' } },
        { chalaniNumber: { contains: search as string, mode: 'insensitive' } },
        { patraNumber: { contains: search as string, mode: 'insensitive' } },
        { from: { contains: search as string, mode: 'insensitive' } },
        { to: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.date.lte = new Date(endDate as string);
      }
    }

    const [patraChalanis, total] = await Promise.all([
      prisma.patraChalani.findMany({
        where,
        orderBy: { date: 'desc' },
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
          actions: {
            orderBy: { actionDate: 'desc' },
            take: 5, // Latest 5 actions
          },
          _count: {
            select: {
              documents: true,
              actions: true,
            },
          },
        },
      }),
      prisma.patraChalani.count({ where }),
    ]);

    res.json({
      patraChalanis,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (error) {
    console.error('Get patra chalanis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/patra-chalani/:id
 * Get single patra chalani with details
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const patraChalani = await prisma.patraChalani.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        actions: {
          orderBy: { actionDate: 'desc' },
        },
      },
    });

    if (!patraChalani) {
      res.status(404).json({ error: 'Patra Chalani not found' });
      return;
    }

    res.json({ patraChalani });
  } catch (error) {
    console.error('Get patra chalani error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/patra-chalani
 * Create a new patra chalani
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      type,
      subject,
      from,
      to,
      date,
      receivedDate,
      sentDate,
      priority,
      category,
      patraNumber,
      remarks,
    } = req.body;

    if (!type || !subject || !date) {
      res.status(400).json({ error: 'Type, subject, and date are required' });
      return;
    }

    // Generate chalani number
    // Use actual Nepali fiscal year (starts on Shrawan 1, approximately mid-July)
    // Fiscal year runs from Shrawan (month 4) to Ashad (month 3 of next year)
    const fiscalYear = getCurrentNepaliFiscalYear();
    const nepaliYear = fiscalYear.bsYear;
    const fiscalYearStart = fiscalYear.startDate;
    
    // Count documents created in the current Nepali fiscal year
    // This ensures the count matches the Nepali year used in the document number
    const count = await prisma.patraChalani.count({
      where: {
        cooperativeId: tenantId,
        type: type as string,
        createdAt: {
          gte: fiscalYearStart,
        },
      },
    });
    const chalaniNumber = `PC-${nepaliYear}-${String(count + 1).padStart(3, '0')}`;

    const patraChalani = await prisma.patraChalani.create({
      data: {
        cooperativeId: tenantId,
        chalaniNumber,
        type,
        subject,
        from,
        to,
        date: new Date(date),
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        sentDate: sentDate ? new Date(sentDate) : null,
        priority: priority || 'normal',
        category,
        patraNumber,
        remarks,
        createdBy: req.user!.userId,
      },
      include: {
        documents: true,
        actions: true,
      },
    });

    res.status(201).json({ patraChalani });
  } catch (error) {
    console.error('Create patra chalani error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/patra-chalani/:id
 * Update patra chalani
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      subject,
      from,
      to,
      date,
      receivedDate,
      sentDate,
      priority,
      status,
      category,
      patraNumber,
      remarks,
    } = req.body;

    const patraChalani = await prisma.patraChalani.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!patraChalani) {
      res.status(404).json({ error: 'Patra Chalani not found' });
      return;
    }

    const updateData: any = {};
    if (subject) updateData.subject = subject;
    if (from !== undefined) updateData.from = from;
    if (to !== undefined) updateData.to = to;
    if (date) updateData.date = new Date(date);
    if (receivedDate !== undefined) updateData.receivedDate = receivedDate ? new Date(receivedDate) : null;
    if (sentDate !== undefined) updateData.sentDate = sentDate ? new Date(sentDate) : null;
    if (priority) updateData.priority = priority;
    if (status) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }
    if (category !== undefined) updateData.category = category;
    if (patraNumber !== undefined) updateData.patraNumber = patraNumber;
    if (remarks !== undefined) updateData.remarks = remarks;

    const updated = await prisma.patraChalani.update({
      where: { id },
      data: updateData,
      include: {
        documents: true,
        actions: true,
      },
    });

    res.json({ patraChalani: updated });
  } catch (error) {
    console.error('Update patra chalani error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/patra-chalani/:id
 * Delete patra chalani
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const patraChalani = await prisma.patraChalani.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
      include: {
        documents: true,
      },
    });

    if (!patraChalani) {
      res.status(404).json({ error: 'Patra Chalani not found' });
      return;
    }

    // Delete associated files
    for (const doc of patraChalani.documents) {
      if (doc.filePath) {
        await deleteFile(doc.filePath);
      }
    }

    await prisma.patraChalani.delete({
      where: { id },
    });

    res.json({ message: 'Patra Chalani deleted successfully' });
  } catch (error) {
    console.error('Delete patra chalani error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/patra-chalani/:id/upload
 * Upload document to patra chalani
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

    const patraChalani = await prisma.patraChalani.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!patraChalani) {
      res.status(404).json({ error: 'Patra Chalani not found' });
      return;
    }

    const fileInfo = await saveUploadedFile(req.file, 'patra-chalani-documents', tenantId);

    const document = await prisma.patraChalaniDocument.create({
      data: {
        patraChalaniId: id,
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
    console.error('Upload patra chalani document error:', error);
    if (error.message && error.message.includes('Invalid file type')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

/**
 * POST /api/patra-chalani/:id/action
 * Add action to patra chalani
 */
router.post('/:id/action', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { actionType, actionTo, remarks } = req.body;

    if (!actionType) {
      res.status(400).json({ error: 'Action type is required' });
      return;
    }

    const patraChalani = await prisma.patraChalani.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
      },
    });

    if (!patraChalani) {
      res.status(404).json({ error: 'Patra Chalani not found' });
      return;
    }

    const action = await prisma.patraChalaniAction.create({
      data: {
        patraChalaniId: id,
        cooperativeId: tenantId,
        actionType,
        actionTo,
        remarks,
        actionBy: req.user!.userId,
      },
    });

    // Update status based on action type
    let statusUpdate: any = {};
    if (actionType === 'complete') {
      statusUpdate.status = 'completed';
      statusUpdate.completedAt = new Date();
    } else if (actionType === 'archive') {
      statusUpdate.status = 'archived';
    } else if (actionType === 'forward' || actionType === 'reply') {
      statusUpdate.status = 'in_progress';
    }

    if (Object.keys(statusUpdate).length > 0) {
      await prisma.patraChalani.update({
        where: { id },
        data: statusUpdate,
      });
    }

    res.status(201).json({ action });
  } catch (error) {
    console.error('Create patra chalani action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/patra-chalani/:id/download/:docId
 * Download patra chalani document
 */
router.get('/:id/download/:docId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id, docId } = req.params;

    const document = await prisma.patraChalaniDocument.findFirst({
      where: {
        id: docId,
        patraChalaniId: id,
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
    console.error('Download patra chalani document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

