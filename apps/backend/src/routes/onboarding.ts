import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

interface UpdateProfileRequest {
  description?: string;
  logoUrl?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
}

/**
 * PUT /onboarding/profile
 * Update cooperative profile (protected route)
 */
router.put('/profile', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { description, logoUrl, website, address, phone, email } = req.body as UpdateProfileRequest;

    // Update or create cooperative profile
    const profile = await prisma.cooperativeProfile.upsert({
      where: { cooperativeId: tenantId! },
      update: {
        description,
        logoUrl,
        website,
        address,
        phone,
        email,
      },
      create: {
        cooperativeId: tenantId!,
        description,
        logoUrl,
        website,
        address,
        phone,
        email,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      profile,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /onboarding/profile
 * Get cooperative profile (protected route)
 */
router.get('/profile', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }

    const profile = await prisma.cooperativeProfile.findUnique({
      where: { cooperativeId: tenantId! },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            createdAt: true,
          },
        },
      },
    });

    if (!profile) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    res.json({ profile });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

/**
 * PUT /onboarding/settings
 * Update cooperative settings (e.g., operation start date)
 */
router.put('/settings', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    if (!tenantId) {
      res.status(403).json({ error: 'Tenant context required' });
      return;
    }
    const { operationStartDate } = req.body;

    if (!operationStartDate) {
      res.status(400).json({ error: 'operationStartDate is required' });
      return;
    }

    // Update subscription start date as a proxy for operation start date
    await prisma.subscription.update({
      where: { cooperativeId: tenantId },
      data: {
        startDate: new Date(operationStartDate),
      },
    });

    res.json({
      message: 'Settings updated successfully',
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
