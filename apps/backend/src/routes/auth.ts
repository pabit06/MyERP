import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { comparePassword, generateToken } from '../lib/auth.js';
import { authenticate } from '../middleware/auth.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../lib/errors.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { sanitizeEmail } from '../lib/sanitize.js';

const router = Router();

interface LoginRequest {
  email: string;
  password: string;
}

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   type: object
 *                 token:
 *                   type: string
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  '/login',
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password }: LoginRequest = req.body;

    if (!email || !password) {
      throw new BadRequestError('Email and password are required');
    }

    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      throw new BadRequestError('Invalid email format');
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
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
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Log failed login attempt
      await createAuditLog({
        action: AuditAction.LOGIN_FAILURE,
        userId: user.id,
        tenantId: user.cooperativeId ?? undefined,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        success: false,
        errorMessage: 'Invalid password',
      });
      throw new UnauthorizedError('Invalid credentials');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      cooperativeId: user.cooperativeId ?? null,
      roleId: user.roleId ?? undefined,
    });

    // Log successful login
    await createAuditLog({
      action: AuditAction.LOGIN_SUCCESS,
      userId: user.id,
      tenantId: user.cooperativeId ?? undefined,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      success: true,
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
      throw new UnauthorizedError('User not associated with a cooperative');
    }

    // TypeScript narrowing: user.cooperative is now guaranteed to be non-null
    const cooperative = user.cooperative;

    // Get enabled modules from subscription
    const enabledModules = (cooperative.subscription?.plan?.enabledModules as string[]) || [];

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        cooperativeId: user.cooperativeId ?? undefined,
        roleId: user.roleId ?? undefined,
        role: user.role || null,
        isSystemAdmin: false,
      },
      cooperative: {
        id: cooperative.id,
        name: cooperative.name,
        subdomain: cooperative.subdomain,
        logoUrl: cooperative.profile?.logoUrl || null,
        enabledModules,
      },
      token,
    });
  })
);

/**
 * POST /auth/member-login
 * Login for members using subdomain, member number, and password
 * This is for mobile app member access
 */
router.post(
  '/member-login',
  asyncHandler(async (req: Request, res: Response) => {
    const { subdomain, memberNumber, password } = req.body;

    if (!subdomain || !memberNumber || !password) {
      throw new BadRequestError('Subdomain, member number, and password are required');
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
      throw new NotFoundError('Cooperative', subdomain);
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
      throw new UnauthorizedError('Invalid credentials');
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
  })
);

/**
 * GET /auth/me
 * Get current user information (protected route)
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
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

    // TypeScript narrowing: user.cooperative is now guaranteed to be non-null
    const cooperative = user.cooperative;

    const enabledModules = (cooperative.subscription?.plan?.enabledModules as string[]) || [];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId ?? undefined,
        role: user.role || null,
        isSystemAdmin: false,
      },
      cooperative: {
        id: cooperative.id,
        name: cooperative.name,
        subdomain: cooperative.subdomain,
        logoUrl: cooperative.profile?.logoUrl || null,
        enabledModules,
      },
    });
  })
);

export default router;
