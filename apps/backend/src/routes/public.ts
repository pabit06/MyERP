import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { getCsrfToken } from '../middleware/csrf.js';

const router = Router();

/**
 * GET /api/public/profile/:subdomain
 * Get public cooperative profile by subdomain
 * This is a public endpoint (no authentication required)
 */
router.get('/profile/:subdomain', async (req: Request, res: Response) => {
  try {
    const { subdomain } = req.params;

    const cooperative = await prisma.cooperative.findUnique({
      where: { subdomain },
      select: {
        id: true,
        name: true,
        subdomain: true,
        profile: {
          select: {
            description: true,
            logoUrl: true,
            website: true,
            address: true,
            phone: true,
            email: true,
          },
        },
      },
    });

    if (!cooperative) {
      res.status(404).json({ error: 'Cooperative not found' });
      return;
    }

    res.json({ cooperative });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/public/csrf-token
 * Get CSRF token for client-side requests
 * This is a public endpoint (no authentication required)
 */
router.get('/csrf-token', getCsrfToken);

export default router;
