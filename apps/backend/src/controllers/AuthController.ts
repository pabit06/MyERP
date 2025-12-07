import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { comparePassword, generateToken } from '../lib/auth.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../lib/errors.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';
import { sanitizeEmail } from '../lib/sanitize.js';

export class AuthController extends BaseController {
  /**
   * Admin/Staff Login
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    // Sanitize email input
    const sanitizedEmail = sanitizeEmail(email);
    if (!sanitizedEmail) {
      throw new BadRequestError('Invalid email format');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
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
      errorMessage: undefined,
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
  }

  /**
   * Member Login
   */
  async memberLogin(req: Request, res: Response) {
    const { subdomain, memberNumber, password } = req.body;

    // Find cooperative by subdomain
    const cooperative = await this.prisma.cooperative.findUnique({
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
    const member = await this.prisma.member.findFirst({
      where: {
        cooperativeId: cooperative.id,
        memberNumber,
        isActive: true,
      },
    });

    if (!member) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Verify password if passwordHash exists
    if (member.passwordHash) {
      const isValidPassword = await comparePassword(password, member.passwordHash);
      if (!isValidPassword) {
        // Log failed login attempt
        await createAuditLog({
          action: AuditAction.LOGIN_FAILURE,
          resourceType: 'Member',
          resourceId: member.id,
          tenantId: cooperative.id,
          userId: undefined,
          success: false,
          errorMessage: 'Invalid password',
          details: {
            memberNumber,
            subdomain,
          },
        });
        throw new UnauthorizedError('Invalid credentials');
      }
    }

    // Generate a member token
    const token = generateToken({
      userId: member.id,
      email: member.email || `${member.memberNumber}@${subdomain}`,
      cooperativeId: cooperative.id,
    });

    // Log successful login
    await createAuditLog({
      action: AuditAction.LOGIN_SUCCESS,
      resourceType: 'Member',
      resourceId: member.id,
      tenantId: cooperative.id,
      userId: undefined,
      success: true,
      details: {
        memberNumber,
        subdomain,
      },
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
      requiresPasswordChange: !member.passwordHash,
    });
  }

  /**
   * Get Current User
   */
  async getMe(req: Request, res: Response) {
    const userId = req.user!.userId;

    const user = await this.prisma.user.findUnique({
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
  }
}

export const authController = new AuthController();
