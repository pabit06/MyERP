import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';

const router = Router();

// All routes require authentication, tenant context, and inventory module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('inventory'));

/**
 * GET /api/inventory/categories
 * Get all inventory categories
 */
router.get('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }

    const categories = await prisma.inventoryCategory.findMany({
      where: {
        cooperativeId: tenantId!,
      },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ categories });
  } catch (error) {
    console.error('Get inventory categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory/categories
 * Create a new inventory category
 */
router.post('/categories', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, description, parentId } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }

    // Check if category name already exists
    const existing = await prisma.inventoryCategory.findUnique({
      where: {
        cooperativeId_name: {
          cooperativeId: tenantId!,
          name,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Category name already exists' });
      return;
    }

    const category = await prisma.inventoryCategory.create({
      data: {
        cooperativeId: tenantId!,
        name,
        description,
        parentId: parentId || null,
      },
    });

    res.status(201).json({ category });
  } catch (error) {
    console.error('Create inventory category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/inventory/items
 * Get all inventory items (with optional filters)
 */
router.get('/items', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { categoryId, isActive } = req.query;

    const where: any = {
      cooperativeId: tenantId!,
    };

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    res.json({ items });
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/inventory/items
 * Create a new inventory item
 */
router.post('/items', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      code,
      name,
      description,
      categoryId,
      unit,
      quantity,
      minQuantity,
      maxQuantity,
      unitPrice,
      location,
    } = req.body;

    if (!code || !name || !unit) {
      res.status(400).json({ error: 'Missing required fields: code, name, unit' });
      return;
    }

    // Check if item code already exists
    const existing = await prisma.inventoryItem.findUnique({
      where: {
        cooperativeId_code: {
          cooperativeId: tenantId!,
          code,
        },
      },
    });

    if (existing) {
      res.status(409).json({ error: 'Item code already exists' });
      return;
    }

    const item = await prisma.inventoryItem.create({
      data: {
        cooperativeId: tenantId!,
        code,
        name,
        description,
        categoryId: categoryId || null,
        unit,
        quantity: quantity ? parseFloat(quantity) : 0,
        minQuantity: minQuantity ? parseFloat(minQuantity) : null,
        maxQuantity: maxQuantity ? parseFloat(maxQuantity) : null,
        unitPrice: unitPrice ? parseFloat(unitPrice) : null,
        location,
        isActive: true,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({ item });
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/inventory/items/:id
 * Update an inventory item
 */
router.put('/items/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const {
      name,
      description,
      categoryId,
      unit,
      quantity,
      minQuantity,
      maxQuantity,
      unitPrice,
      location,
      isActive,
    } = req.body;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        name,
        description,
        categoryId: categoryId !== undefined ? categoryId : undefined,
        unit,
        quantity: quantity !== undefined ? parseFloat(quantity) : undefined,
        minQuantity: minQuantity !== undefined ? parseFloat(minQuantity) : undefined,
        maxQuantity: maxQuantity !== undefined ? parseFloat(maxQuantity) : undefined,
        unitPrice: unitPrice !== undefined ? parseFloat(unitPrice) : undefined,
        location,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({ item: updatedItem });
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/inventory/items/:id
 * Get a specific inventory item
 */
router.get('/items/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id,
        cooperativeId: tenantId!,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
    });

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json({ item });
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
