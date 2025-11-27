import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { saveUploadedFile, deleteFile } from '../lib/upload.js';
import { getCurrentNepaliFiscalYear } from '../lib/nepali-fiscal-year.js';

const router = Router();

// Map frontend status values to ChalaniStatus enum values
const mapChalaniStatus = (status: string): string | undefined => {
  const statusMap: Record<string, string> = {
    'DRAFT': 'DRAFT',
    'PENDING': 'PENDING',
    'IN_PROGRESS': 'IN_PROGRESS',
    'APPROVED': 'APPROVED',
    'SENT': 'SENT',
    'COMPLETED': 'COMPLETED',
    'ARCHIVED': 'ARCHIVED',
    'CANCELLED': 'CANCELLED',
    // Map invalid statuses that might come from frontend
    'ACTIVE': 'PENDING',        // Frontend "ACTIVE" maps to "PENDING" for Chalani
    'PROCESSING': 'IN_PROGRESS', // Frontend "PROCESSING" maps to "IN_PROGRESS" for Chalani
    'DONE': 'COMPLETED',        // Frontend "DONE" maps to "COMPLETED"
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
 * GET /api/patra-chalani
 * Get all patra chalanis with filters
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { type, status, category, search, fiscalYear, startDate, endDate, page = '1', limit = '20' } = req.query;

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
      const mappedStatus = mapChalaniStatus(status as string);
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
        { subject: { contains: search as string, mode: 'insensitive' } },
        { chalaniNumber: { contains: search as string, mode: 'insensitive' } },
        { patraNumber: { contains: search as string, mode: 'insensitive' } },
        { receiverName: { contains: search as string, mode: 'insensitive' } },
        { senderName: { contains: search as string, mode: 'insensitive' } },
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
      content,
      receiverName,
      receiverAddress,
      senderName,
      senderAddress,
      date,
      receivedDate,
      sentDate,
      priority,
      category,
      patraNumber,
      remarks,
      bodhartha,
      transportMode,
      fiscalYear,
    } = req.body;

    if (!type || !subject || !date) {
      res.status(400).json({ error: 'Type, subject, and date are required' });
      return;
    }

    if (!receiverName) {
      res.status(400).json({ error: 'Receiver name is required' });
      return;
    }

    // Generate chalani number
    // Use actual Nepali fiscal year (starts on Shrawan 1, approximately mid-July)
    // Fiscal year runs from Shrawan (month 4) to Ashad (month 3 of next year)
    const currentFiscalYear = getCurrentNepaliFiscalYear();
    let fiscalYearStr = fiscalYear || currentFiscalYear.label.replace('FY ', '');
    
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
    const count = await prisma.patraChalani.count({
      where: {
        cooperativeId: tenantId,
        type: type as string,
        fiscalYear: fiscalYearStr,
      },
    });
    const chalaniNumber = `PC-${String(bsYear).slice(-2)}-${String(count + 1).padStart(3, '0')}`;

    const patraChalani = await prisma.patraChalani.create({
      data: {
        cooperativeId: tenantId,
        fiscalYear: fiscalYearStr,
        serialNo: count + 1,
        chalaniNumber,
        type,
        subject,
        content,
        receiverName,
        receiverAddress,
        senderName,
        senderAddress,
        date: new Date(date),
        receivedDate: receivedDate ? new Date(receivedDate) : null,
        sentDate: sentDate ? new Date(sentDate) : null,
        priority: (priority || 'NORMAL').toUpperCase(),
        category,
        patraNumber,
        remarks,
        bodhartha,
        transportMode,
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
      content,
      receiverName,
      receiverAddress,
      senderName,
      senderAddress,
      date,
      receivedDate,
      sentDate,
      priority,
      status,
      category,
      patraNumber,
      remarks,
      bodhartha,
      transportMode,
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
    if (content !== undefined) updateData.content = content;
    if (receiverName !== undefined) updateData.receiverName = receiverName;
    if (receiverAddress !== undefined) updateData.receiverAddress = receiverAddress;
    if (senderName !== undefined) updateData.senderName = senderName;
    if (senderAddress !== undefined) updateData.senderAddress = senderAddress;
    if (date) updateData.date = new Date(date);
    if (receivedDate !== undefined) updateData.receivedDate = receivedDate ? new Date(receivedDate) : null;
    if (sentDate !== undefined) updateData.sentDate = sentDate ? new Date(sentDate) : null;
    if (priority) updateData.priority = (priority as string).toUpperCase();
    if (bodhartha !== undefined) updateData.bodhartha = bodhartha;
    if (transportMode !== undefined) updateData.transportMode = transportMode;
    if (status) {
      const mappedStatus = mapChalaniStatus(status as string);
      if (mappedStatus) {
        updateData.status = mappedStatus;
        if (mappedStatus === 'COMPLETED') {
          updateData.completedAt = new Date();
        }
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

