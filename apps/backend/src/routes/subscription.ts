import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/subscription
 * Get current subscription for the cooperative
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }

    const cooperative = await prisma.cooperative.findUnique({
      where: { id: tenantId! },
      include: {
        subscription: {
          include: {
            plan: {
              select: {
                id: true,
                name: true,
                monthlyPrice: true,
                enabledModules: true,
              },
            },
          },
        },
      },
    });

    if (!cooperative || !cooperative.subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json({
      subscription: {
        id: cooperative.subscription.id,
        status: cooperative.subscription.status,
        startDate: cooperative.subscription.startDate,
        endDate: cooperative.subscription.endDate,
        plan: cooperative.subscription.plan,
      },
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/subscription/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      orderBy: {
        monthlyPrice: 'asc',
      },
      select: {
        id: true,
        name: true,
        monthlyPrice: true,
        enabledModules: true,
        createdAt: true,
      },
    });

    res.json({ plans });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/subscription/change-plan
 * Change subscription plan (admin only - in production, add payment processing)
 */
router.put('/change-plan', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { planId } = req.body;

    if (!planId) {
      res.status(400).json({ error: 'Plan ID is required' });
      return;
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    // Update subscription
    const subscription = await prisma.subscription.update({
      where: { cooperativeId: tenantId! },
      data: {
        planId,
        status: 'active',
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
            monthlyPrice: true,
            enabledModules: true,
          },
        },
      },
    });

    res.json({
      message: 'Subscription plan updated successfully',
      subscription,
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
