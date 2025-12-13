import express, { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireSystemAdmin } from '../middleware/tenant.js';
import { prisma } from '../lib/prisma.js';
import { hashPassword } from '../lib/auth.js';

const router = express.Router();

// All routes require system admin
router.use(authenticate);
router.use(requireSystemAdmin);

/**
 * GET /api/system-admin/cooperatives
 * Get all cooperatives with pagination
 */
router.get('/cooperatives', async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', search } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { subdomain: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [cooperatives, total] = await Promise.all([
      prisma.cooperative.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          profile: true,
          subscription: {
            include: {
              plan: true,
            },
          },
          _count: {
            select: {
              users: true,
              members: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cooperative.count({ where }),
    ]);

    res.json({
      cooperatives,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  } catch (error) {
    console.error('Get cooperatives error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/system-admin/cooperatives
 * Create a new cooperative and admin user (System Admin only)
 */
router.post('/cooperatives', async (req: Request, res: Response) => {
  try {
    const {
      name,
      subdomain,
      email,
      password,
      firstName,
      lastName,
      planId,
      address,
      website,
      phone,
      description,
    } = req.body;

    // Validate required fields
    if (!name || !subdomain || !email || !password || !firstName || !lastName) {
      res.status(400).json({
        error: 'Missing required fields: name, subdomain, email, password, firstName, lastName',
      });
      return;
    }

    // Validate subdomain format
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      res.status(400).json({
        error: 'Subdomain must contain only lowercase letters, numbers, and hyphens',
      });
      return;
    }

    // Check if subdomain is already taken
    const existingCooperative = await prisma.cooperative.findUnique({
      where: { subdomain },
    });

    if (existingCooperative) {
      res.status(409).json({ error: 'Subdomain already taken' });
      return;
    }

    // Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }

    // Get plan (use provided planId or default to Basic plan)
    let plan = null;
    if (planId) {
      plan = await prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        res.status(404).json({ error: 'Plan not found' });
        return;
      }
    } else {
      plan = await prisma.plan.findFirst({ where: { name: 'Basic' } });
      if (!plan) {
        // Create Basic plan if it doesn't exist
        plan = await prisma.plan.create({
          data: {
            name: 'Basic',
            monthlyPrice: 0,
            enabledModules: [],
          },
        });
      }
    }

    // Create cooperative, subscription, profile, and user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create cooperative
      const cooperative = await tx.cooperative.create({
        data: {
          name,
          subdomain,
        },
      });

      // Create subscription
      await tx.subscription.create({
        data: {
          cooperativeId: cooperative.id,
          planId: plan.id,
          status: 'active',
        },
      });

      // Create cooperative profile
      await tx.cooperativeProfile.create({
        data: {
          cooperativeId: cooperative.id,
          description,
          address,
          website,
          phone,
        },
      });

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create admin user
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          cooperativeId: cooperative.id,
          isActive: true,
        },
      });

      return { cooperative, user };
    });

    res.status(201).json({
      message: 'Cooperative registered successfully',
      cooperative: {
        id: result.cooperative.id,
        name: result.cooperative.name,
        subdomain: result.cooperative.subdomain,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    });
  } catch (error) {
    console.error('Create cooperative error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/system-admin/cooperatives/:id
 * Get single cooperative details
 */
router.get('/cooperatives/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const cooperative = await prisma.cooperative.findUnique({
      where: { id },
      include: {
        profile: true,
        subscription: {
          include: {
            plan: true,
          },
        },
        _count: {
          select: {
            users: true,
            members: true,
            transactions: true,
          },
        },
      },
    });

    if (!cooperative) {
      res.status(404).json({ error: 'Cooperative not found' });
      return;
    }

    res.json(cooperative);
  } catch (error) {
    console.error('Get cooperative error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/system-admin/stats
 * Get system-wide statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [totalCooperatives, activeSubscriptions, totalUsers, totalMembers, totalTransactions] =
      await Promise.all([
        prisma.cooperative.count(),
        prisma.subscription.count({ where: { status: 'active' } }),
        prisma.user.count({ where: { isActive: true } }),
        prisma.member.count(),
        prisma.transaction.count(),
      ]);

    res.json({
      cooperatives: {
        total: totalCooperatives,
        active: activeSubscriptions,
      },
      users: {
        total: totalUsers,
      },
      members: {
        total: totalMembers,
      },
      transactions: {
        total: totalTransactions,
      },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/system-admin/subscriptions/:id
 * Update subscription (change plan, status, etc.)
 */
router.put('/subscriptions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { planId, status, endDate } = req.body;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: {
        ...(planId && { planId }),
        ...(status && { status }),
        ...(endDate && { endDate: new Date(endDate) }),
      },
      include: {
        plan: true,
        cooperative: {
          select: {
            id: true,
            name: true,
            subdomain: true,
          },
        },
      },
    });

    res.json(subscription);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/system-admin/plans
 * Get all subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      include: {
        _count: {
          select: {
            subscriptions: true,
          },
        },
      },
      orderBy: { monthlyPrice: 'asc' },
    });

    res.json(plans);
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/system-admin/plans
 * Create a new subscription plan
 */
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const { name, monthlyPrice, enabledModules } = req.body;

    if (!name || !monthlyPrice || !enabledModules) {
      res
        .status(400)
        .json({ error: 'Missing required fields: name, monthlyPrice, enabledModules' });
      return;
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        monthlyPrice: parseFloat(monthlyPrice),
        enabledModules: Array.isArray(enabledModules) ? enabledModules : [],
      },
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error('Create plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/system-admin/plans/:id
 * Update a subscription plan
 */
router.put('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, monthlyPrice, enabledModules } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (monthlyPrice !== undefined) updateData.monthlyPrice = parseFloat(monthlyPrice);
    if (enabledModules !== undefined)
      updateData.enabledModules = Array.isArray(enabledModules) ? enabledModules : [];

    const plan = await prisma.plan.update({
      where: { id },
      data: updateData,
    });

    res.json(plan);
  } catch (error) {
    console.error('Update plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
