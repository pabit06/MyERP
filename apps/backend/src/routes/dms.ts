import { Router, Request, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { saveUploadedFile, deleteFile } from '../lib/upload.js';
import { promises as fs } from 'fs';
import path from 'path';

const router = Router();

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'text/plain',
      'text/csv',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          'Invalid file type. Allowed types: PDF, Word, Excel, PowerPoint, Images, Text, CSV.'
        )
      );
    }
  },
});

// All routes require authentication, tenant context, and DMS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('dms'));

/**
 * GET /api/dms/member-documents
 * Get all member documents (with optional filters)
 */
router.get('/member-documents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { memberId, documentType } = req.query;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (memberId) {
      where.memberId = memberId as string;
    }

    if (documentType) {
      where.documentType = documentType as string;
    }

    const documents = await prisma.memberDocument.findMany({
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
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get member documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/dms/member-documents
 * Create a new member document record
 * Note: File upload should be handled separately, this creates the database record
 */
router.post('/member-documents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId, documentType, fileName, filePath, fileSize, mimeType, description } =
      req.body;

    if (!memberId || !documentType || !fileName || !filePath) {
      res.status(400).json({
        error: 'Missing required fields: memberId, documentType, fileName, filePath',
      });
      return;
    }

    // Verify member belongs to cooperative
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || member.cooperativeId !== tenantId) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    const document = await prisma.memberDocument.create({
      data: {
        memberId,
        cooperativeId: tenantId!,
        documentType,
        fileName,
        filePath,
        fileSize: fileSize ? parseInt(fileSize) : null,
        mimeType,
        description,
        uploadedBy: req.user!.userId,
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ document });
  } catch (error) {
    console.error('Create member document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dms/official-documents
 * Get all official documents (with optional filters)
 */
router.get('/official-documents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { documentType, category, isPublic } = req.query;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (documentType) {
      where.documentType = documentType as string;
    }

    if (category) {
      where.category = category as string;
    }

    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }

    const documents = await prisma.officialDocument.findMany({
      where,
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    res.json({ documents });
  } catch (error) {
    console.error('Get official documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/dms/official-documents
 * Create a new official document record
 */
router.post('/official-documents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      documentType,
      title,
      fileName,
      filePath,
      fileSize,
      mimeType,
      description,
      category,
      version,
      isPublic,
      effectiveDate,
      expiryDate,
    } = req.body;

    if (!documentType || !title || !fileName || !filePath) {
      res.status(400).json({
        error: 'Missing required fields: documentType, title, fileName, filePath',
      });
      return;
    }

    const document = await prisma.officialDocument.create({
      data: {
        cooperativeId: tenantId!,
        documentType,
        title,
        fileName,
        filePath,
        fileSize: fileSize ? parseInt(fileSize) : null,
        mimeType,
        description,
        category,
        version: version || '1.0',
        isPublic: isPublic || false,
        uploadedBy: req.user!.userId,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    });

    res.status(201).json({ document });
  } catch (error) {
    console.error('Create official document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/dms/member-documents/:id
 * Delete a member document
 */
router.delete('/member-documents/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const document = await prisma.memberDocument.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Delete file from disk
    if (document.filePath) {
      await deleteFile(document.filePath);
    }

    await prisma.memberDocument.delete({
      where: { id },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete member document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/dms/official-documents/:id
 * Delete an official document
 */
router.delete('/official-documents/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const document = await prisma.officialDocument.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Delete file from disk
    if (document.filePath) {
      await deleteFile(document.filePath);
    }

    await prisma.officialDocument.delete({
      where: { id },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete official document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/dms/member-documents/upload
 * Upload a member document with file
 */
router.post(
  '/member-documents/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const { memberId, documentType, description } = req.body;

      if (!memberId || !documentType) {
        res.status(400).json({
          error: 'Missing required fields: memberId, documentType',
        });
        return;
      }

      // Verify member belongs to cooperative
      const member = await prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!member || member.cooperativeId !== tenantId) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      // Save file
      const fileInfo = await saveUploadedFile(req.file, 'member-documents', tenantId);

      // Create document record
      const document = await prisma.memberDocument.create({
        data: {
          memberId,
          cooperativeId: tenantId!,
          documentType,
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          description,
          uploadedBy: req.user!.userId,
        },
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.status(201).json({ document });
    } catch (error: any) {
      console.error('Upload member document error:', error);
      if (error.message && error.message.includes('Invalid file type')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * POST /api/dms/official-documents/upload
 * Upload an official document with file
 */
router.post(
  '/official-documents/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId;
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      const {
        documentType,
        title,
        description,
        category,
        version,
        isPublic,
        effectiveDate,
        expiryDate,
      } = req.body;

      if (!documentType || !title) {
        res.status(400).json({
          error: 'Missing required fields: documentType, title',
        });
        return;
      }

      // Save file
      const fileInfo = await saveUploadedFile(req.file, 'official-documents', tenantId);

      // Create document record
      const document = await prisma.officialDocument.create({
        data: {
          cooperativeId: tenantId!,
          documentType,
          title,
          fileName: fileInfo.fileName,
          filePath: fileInfo.filePath,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          description,
          category,
          version: version || '1.0',
          isPublic: isPublic === 'true' || isPublic === true,
          uploadedBy: req.user!.userId,
          effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
      });

      res.status(201).json({ document });
    } catch (error: any) {
      console.error('Upload official document error:', error);
      if (error.message && error.message.includes('Invalid file type')) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  }
);

/**
 * GET /api/dms/documents/search
 * Search documents with filters
 * NOTE: This route must be defined BEFORE parameterized routes like /documents/:id/*
 */
router.get('/documents/search', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      q, // search query
      type, // 'member' | 'official' | 'all'
      documentType,
      category,
      memberId,
      fileType,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const results: any[] = [];
    const totalCounts = { member: 0, official: 0 };

    // When searching across both tables (type === 'all'), we need to fetch ALL results
    // from both tables, combine them, sort, and then paginate. This is the only way to
    // guarantee correct pagination across two separate tables.
    // For single-table searches (type === 'member' or 'official'), we can use normal database pagination.
    const isCrossTableSearch = type === 'all' || !type;
    const MAX_FETCH_LIMIT = 10000; // Safety limit to prevent memory exhaustion
    const fetchLimit = isCrossTableSearch
      ? MAX_FETCH_LIMIT // Fetch all (up to limit) when searching across tables
      : pageNum * limitNum; // Use normal pagination for single-table searches

    // Search member documents
    if (type === 'all' || type === 'member' || !type) {
      const memberWhere: any = {
        cooperativeId: tenantId!,
      };

      if (memberId) {
        memberWhere.memberId = memberId as string;
      }

      if (documentType) {
        memberWhere.documentType = documentType as string;
      }

      if (fileType) {
        memberWhere.mimeType = { contains: fileType as string };
      }

      if (q) {
        memberWhere.OR = [
          { fileName: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
        ];
      }

      if (startDate || endDate) {
        memberWhere.uploadedAt = {};
        if (startDate) {
          memberWhere.uploadedAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          memberWhere.uploadedAt.lte = new Date(endDate as string);
        }
      }

      const [memberDocs, memberCount] = await Promise.all([
        prisma.memberDocument.findMany({
          where: memberWhere,
          include: {
            member: {
              select: {
                id: true,
                memberNumber: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { uploadedAt: 'desc' },
          ...(isCrossTableSearch
            ? { take: fetchLimit } // Fetch all (up to limit) for cross-table search
            : { skip, take: limitNum }), // Use normal pagination for single-table search
        }),
        prisma.memberDocument.count({ where: memberWhere }),
      ]);

      totalCounts.member = memberCount;

      // For single-table search, return paginated results directly
      if (type === 'member') {
        return res.json({
          documents: memberDocs.map((doc) => ({
            ...doc,
            docType: 'member',
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: memberCount,
            memberCount,
            officialCount: 0,
          },
        });
      }

      // For cross-table search, add to results for later combination
      results.push(
        ...memberDocs.map((doc) => ({
          ...doc,
          docType: 'member',
        }))
      );
    }

    // Search official documents
    if (type === 'all' || type === 'official' || !type) {
      const officialWhere: any = {
        cooperativeId: tenantId!,
      };

      if (documentType) {
        officialWhere.documentType = documentType as string;
      }

      if (category) {
        officialWhere.category = category as string;
      }

      if (fileType) {
        officialWhere.mimeType = { contains: fileType as string };
      }

      if (q) {
        officialWhere.OR = [
          { title: { contains: q as string, mode: 'insensitive' } },
          { fileName: { contains: q as string, mode: 'insensitive' } },
          { description: { contains: q as string, mode: 'insensitive' } },
        ];
      }

      if (startDate || endDate) {
        officialWhere.uploadedAt = {};
        if (startDate) {
          officialWhere.uploadedAt.gte = new Date(startDate as string);
        }
        if (endDate) {
          officialWhere.uploadedAt.lte = new Date(endDate as string);
        }
      }

      const [officialDocs, officialCount] = await Promise.all([
        prisma.officialDocument.findMany({
          where: officialWhere,
          orderBy: { uploadedAt: 'desc' },
          ...(isCrossTableSearch
            ? { take: fetchLimit } // Fetch all (up to limit) for cross-table search
            : { skip, take: limitNum }), // Use normal pagination for single-table search
        }),
        prisma.officialDocument.count({ where: officialWhere }),
      ]);

      totalCounts.official = officialCount;

      // For single-table search, return paginated results directly
      if (type === 'official') {
        return res.json({
          documents: officialDocs.map((doc) => ({
            ...doc,
            docType: 'official',
          })),
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: officialCount,
            memberCount: 0,
            officialCount,
          },
        });
      }

      // For cross-table search, add to results for later combination
      results.push(
        ...officialDocs.map((doc) => ({
          ...doc,
          docType: 'official',
        }))
      );
    }

    // For cross-table search: sort combined results by uploadedAt (most recent first)
    // then apply pagination to the combined and sorted results
    if (isCrossTableSearch) {
      results.sort((a, b) => {
        const dateA = new Date(a.uploadedAt).getTime();
        const dateB = new Date(b.uploadedAt).getTime();
        return dateB - dateA;
      });

      // Apply pagination to the combined and sorted results
      const paginatedResults = results.slice(skip, skip + limitNum);

      return res.json({
        documents: paginatedResults,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCounts.member + totalCounts.official,
          memberCount: totalCounts.member,
          officialCount: totalCounts.official,
        },
      });
    }

    // This should not be reached, but handle it just in case
    const paginatedResults = results.slice(skip, skip + limitNum);

    res.json({
      documents: paginatedResults,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCounts.member + totalCounts.official,
        memberCount: totalCounts.member,
        officialCount: totalCounts.official,
      },
    });
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/dms/documents/bulk-delete
 * Bulk delete documents
 * NOTE: This route must be defined BEFORE parameterized routes like /documents/:id/*
 */
router.post('/documents/bulk-delete', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { ids, types } = req.body; // ids: string[], types: ('member' | 'official')[]

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'No document IDs provided' });
      return;
    }

    if (!types || !Array.isArray(types) || types.length !== ids.length) {
      res.status(400).json({ error: 'Types array must match IDs array' });
      return;
    }

    let deletedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < ids.length; i++) {
      const id = ids[i];
      const type = types[i];

      try {
        if (type === 'member') {
          const doc = await prisma.memberDocument.findFirst({
            where: { id, cooperativeId: tenantId! },
          });
          if (doc) {
            if (doc.filePath) {
              await deleteFile(doc.filePath);
            }
            await prisma.memberDocument.delete({ where: { id } });
            deletedCount++;
          }
        } else if (type === 'official') {
          const doc = await prisma.officialDocument.findFirst({
            where: { id, cooperativeId: tenantId! },
          });
          if (doc) {
            if (doc.filePath) {
              await deleteFile(doc.filePath);
            }
            await prisma.officialDocument.delete({ where: { id } });
            deletedCount++;
          }
        }
      } catch (error: any) {
        errors.push(`Failed to delete ${id}: ${error.message}`);
      }
    }

    res.json({
      message: `Deleted ${deletedCount} document(s)`,
      deletedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Bulk delete documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dms/documents/:id/download
 * Download a document file
 */
router.get('/documents/:id/download', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { type } = req.query; // 'member' or 'official'

    let document: any = null;

    if (type === 'member') {
      document = await prisma.memberDocument.findFirst({
        where: {
          id,
          cooperativeId: tenantId!,
        },
      });
    } else if (type === 'official') {
      document = await prisma.officialDocument.findFirst({
        where: {
          id,
          cooperativeId: tenantId!,
        },
      });
    } else {
      // Try both
      document =
        (await prisma.memberDocument.findFirst({
          where: { id, cooperativeId: tenantId! },
        })) ||
        (await prisma.officialDocument.findFirst({
          where: { id, cooperativeId: tenantId! },
        }));
    }

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const cleanPath = document.filePath.startsWith('/')
      ? document.filePath.slice(1)
      : document.filePath;
    const fullPath = path.join(process.cwd(), cleanPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    res.download(fullPath, document.fileName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dms/documents/:id/preview
 * Get document preview URL
 */
router.get('/documents/:id/preview', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { type } = req.query; // 'member' or 'official'

    let document: any = null;

    if (type === 'member') {
      document = await prisma.memberDocument.findFirst({
        where: {
          id,
          cooperativeId: tenantId!,
        },
      });
    } else if (type === 'official') {
      document = await prisma.officialDocument.findFirst({
        where: {
          id,
          cooperativeId: tenantId!,
        },
      });
    } else {
      document =
        (await prisma.memberDocument.findFirst({
          where: { id, cooperativeId: tenantId! },
        })) ||
        (await prisma.officialDocument.findFirst({
          where: { id, cooperativeId: tenantId! },
        }));
    }

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    // Return the file path for preview (frontend will construct the URL)
    res.json({
      filePath: document.filePath,
      fileName: document.fileName,
      mimeType: document.mimeType,
    });
  } catch (error) {
    console.error('Get document preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/dms/member-documents/:id
 * Update member document metadata
 */
router.put('/member-documents/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { documentType, description } = req.body;

    const document = await prisma.memberDocument.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const updated = await prisma.memberDocument.update({
      where: { id },
      data: {
        documentType: documentType || document.documentType,
        description: description !== undefined ? description : document.description,
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ document: updated });
  } catch (error) {
    console.error('Update member document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/dms/official-documents/:id
 * Update official document metadata
 */
router.put('/official-documents/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      documentType,
      title,
      description,
      category,
      version,
      isPublic,
      effectiveDate,
      expiryDate,
    } = req.body;

    const document = await prisma.officialDocument.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    const updated = await prisma.officialDocument.update({
      where: { id },
      data: {
        documentType: documentType || document.documentType,
        title: title || document.title,
        description: description !== undefined ? description : document.description,
        category: category !== undefined ? category : document.category,
        version: version || document.version,
        isPublic: isPublic !== undefined ? isPublic : document.isPublic,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : document.effectiveDate,
        expiryDate: expiryDate ? new Date(expiryDate) : document.expiryDate,
      },
    });

    res.json({ document: updated });
  } catch (error) {
    console.error('Update official document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/dms/statistics
 * Get DMS statistics
 */
router.get('/statistics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const [memberDocCount, officialDocCount, memberDocs, officialDocs] = await Promise.all([
      prisma.memberDocument.count({ where: { cooperativeId: tenantId! } }),
      prisma.officialDocument.count({ where: { cooperativeId: tenantId! } }),
      prisma.memberDocument.findMany({
        where: { cooperativeId: tenantId! },
        select: { fileSize: true, documentType: true },
      }),
      prisma.officialDocument.findMany({
        where: { cooperativeId: tenantId! },
        select: { fileSize: true, documentType: true },
      }),
    ]);

    // Calculate total storage
    const totalStorage =
      memberDocs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0) +
      officialDocs.reduce((sum, doc) => sum + (doc.fileSize || 0), 0);

    // Count by document type
    const memberDocTypes: Record<string, number> = {};
    memberDocs.forEach((doc) => {
      memberDocTypes[doc.documentType] = (memberDocTypes[doc.documentType] || 0) + 1;
    });

    const officialDocTypes: Record<string, number> = {};
    officialDocs.forEach((doc) => {
      officialDocTypes[doc.documentType] = (officialDocTypes[doc.documentType] || 0) + 1;
    });

    // Recent uploads (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentMemberDocs, recentOfficialDocs] = await Promise.all([
      prisma.memberDocument.count({
        where: {
          cooperativeId: tenantId!,
          uploadedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.officialDocument.count({
        where: {
          cooperativeId: tenantId!,
          uploadedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    res.json({
      totalDocuments: memberDocCount + officialDocCount,
      memberDocuments: memberDocCount,
      officialDocuments: officialDocCount,
      totalStorage,
      storageFormatted: formatBytes(totalStorage),
      memberDocTypes,
      officialDocTypes,
      recentUploads: recentMemberDocs + recentOfficialDocs,
      recentMemberUploads: recentMemberDocs,
      recentOfficialUploads: recentOfficialDocs,
    });
  } catch (error) {
    console.error('Get DMS statistics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format bytes
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default router;
