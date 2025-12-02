import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { comparePassword, generateToken } from '../lib/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * POST /auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        passwordHash: true,
        cooperativeId: true,
        roleId: true,
        isActive: true,
        isSystemAdmin: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        cooperative: {
          include: {
            profile: {
              select: {
                logoUrl: true,
              },
            },
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      cooperativeId: user.cooperativeId || null,
      roleId: user.roleId || undefined,
    });

    // Handle system admin login
    if (user.isSystemAdmin) {
      res.json({
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          cooperativeId: null,
          roleId: null,
          role: null,
          isSystemAdmin: true,
        },
        cooperative: null,
        token,
      });
      return;
    }

    // Regular user login
    if (!user.cooperative) {
      res.status(401).json({ error: 'User not associated with a cooperative' });
      return;
    }

    // Get enabled modules from subscription
    const enabledModules = (user.cooperative.subscription?.plan?.enabledModules as string[]) || [];

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        cooperativeId: user.cooperativeId,
        roleId: user.roleId,
        role: user.role || null,
        isSystemAdmin: false,
      },
      cooperative: {
        id: user.cooperative.id,
        name: user.cooperative.name,
        subdomain: user.cooperative.subdomain,
        logoUrl: user.cooperative.profile?.logoUrl || null,
        enabledModules,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/member-login
 * Login for members using subdomain, member number, and password
 * This is for mobile app member access
 */
router.post('/member-login', async (req: Request, res: Response) => {
  try {
    const { subdomain, memberNumber, password } = req.body;

    if (!subdomain || !memberNumber || !password) {
      res.status(400).json({ error: 'Subdomain, member number, and password are required' });
      return;
    }

    // Find cooperative by subdomain
    const cooperative = await prisma.cooperative.findUnique({
      where: { subdomain },
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
      },
    });

    if (!cooperative) {
      res.status(404).json({ error: 'Cooperative not found' });
      return;
    }

    // Find member by member number within the cooperative
    const member = await prisma.member.findFirst({
      where: {
        cooperativeId: cooperative.id,
        memberNumber,
        isActive: true,
      },
    });

    if (!member) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // For now, we'll use a simple password check
    // In production, you should hash member passwords and store them
    // For this implementation, we'll generate a token based on member info
    // TODO: Implement proper member password authentication

    // Generate a member token (simplified - in production, use proper member authentication)
    const token = generateToken({
      userId: member.id,
      email: member.email || `${member.memberNumber}@${subdomain}`,
      cooperativeId: cooperative.id,
    });

    const enabledModules = (cooperative.subscription?.plan?.enabledModules as string[]) || [];

    res.json({
      message: 'Login successful',
      member: {
        id: member.id,
        memberNumber: member.memberNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        cooperativeId: member.cooperativeId,
      },
      cooperative: {
        id: cooperative.id,
        name: cooperative.name,
        subdomain: cooperative.subdomain,
        enabledModules,
      },
      token,
    });
  } catch (error) {
    console.error('Member login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/me
 * Get current user information (protected route)
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        cooperativeId: true,
        roleId: true,
        isActive: true,
        isSystemAdmin: true,
        role: {
          select: {
            id: true,
            name: true,
          },
        },
        cooperative: {
          select: {
            id: true,
            name: true,
            subdomain: true,
            profile: {
              select: {
                logoUrl: true,
              },
            },
            subscription: {
              select: {
                status: true,
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
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Handle system admin
    if (user.isSystemAdmin) {
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: null,
          role: null,
          isSystemAdmin: true,
        },
        cooperative: null,
      });
      return;
    }

    if (!user.cooperative) {
      res.status(404).json({ error: 'User not associated with a cooperative' });
      return;
    }

    const enabledModules = (user.cooperative.subscription?.plan?.enabledModules as string[]) || [];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        role: user.role || null,
        isSystemAdmin: false,
      },
      cooperative: {
        id: user.cooperative.id,
        name: user.cooperative.name,
        subdomain: user.cooperative.subdomain,
        logoUrl: user.cooperative.profile?.logoUrl || null,
        enabledModules,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
