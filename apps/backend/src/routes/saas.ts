import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashPassword, generateToken } from '../lib/auth.js';

const router = Router();

interface RegisterRequest {
  name: string;
  subdomain: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * POST /saas/register
 * Register a new cooperative and create the first admin user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, subdomain, email, password, firstName, lastName }: RegisterRequest = req.body;

    // Validate required fields
    if (!name || !subdomain || !email || !password || !firstName || !lastName) {
      res.status(400).json({
        error: 'Missing required fields: name, subdomain, email, password, firstName, lastName',
      });
      return;
    }

    // Validate subdomain format (alphanumeric and hyphens only)
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

    // Get or create default plan (Basic plan with no modules)
    let defaultPlan = await prisma.plan.findFirst({
      where: { name: 'Basic' },
    });

    if (!defaultPlan) {
      defaultPlan = await prisma.plan.create({
        data: {
          name: 'Basic',
          monthlyPrice: 0,
          enabledModules: [],
        },
      });
    }

    // Create cooperative, subscription, and user in a transaction
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
          planId: defaultPlan.id,
          status: 'active',
        },
      });

      // Create cooperative profile
      await tx.cooperativeProfile.create({
        data: {
          cooperativeId: cooperative.id,
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

    // Generate JWT token
    const token = generateToken({
      userId: result.user.id,
      email: result.user.email,
      cooperativeId: result.cooperative.id,
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
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
