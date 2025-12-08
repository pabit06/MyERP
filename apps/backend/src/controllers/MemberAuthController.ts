import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { comparePassword, generateToken, hashPassword } from '../lib/auth.js';
import { BadRequestError, UnauthorizedError, NotFoundError } from '../lib/errors.js';
import { createAuditLog, AuditAction } from '../lib/audit-log.js';

export class MemberAuthController extends BaseController {
  /**
   * Member Login
   */
  async login(req: Request, res: Response) {
    const { subdomain, memberNumber, password } = req.body;

    if (!subdomain || !memberNumber || !password) {
      throw new BadRequestError('Subdomain, member number, and password are required');
    }

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

    // Verify password
    if (!member.passwordHash) {
      throw new UnauthorizedError(
        'Account not set up for online access. Please contact your branch.'
      );
    }

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

    // Update last login
    await this.prisma.member.update({
      where: { id: member.id },
      data: { lastLogin: new Date() },
    });

    // Generate a member token
    const token = generateToken({
      userId: member.id,
      email: member.email || `${member.memberNumber}@${subdomain}`,
      cooperativeId: cooperative.id,
      roleId: 'MEMBER',
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
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        cooperativeId: member.cooperativeId,
        lastLogin: new Date(),
      },
      cooperative: {
        id: cooperative.id,
        name: cooperative.name,
        subdomain: cooperative.subdomain,
        enabledModules,
      },
      token,
    });
  }

  /**
   * Get Current Member Profile
   */
  async getMe(req: Request, res: Response) {
    const memberId = req.user!.userId;

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: {
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
                plan: {
                  select: { enabledModules: true },
                },
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new UnauthorizedError('Member not found');
    }

    const cooperative = member.cooperative;
    const enabledModules = (cooperative.subscription?.plan?.enabledModules as string[]) || [];

    res.json({
      member: {
        id: member.id,
        memberNumber: member.memberNumber,
        firstName: member.firstName,
        lastName: member.lastName,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        cooperativeId: member.cooperativeId,
        lastLogin: member.lastLogin,
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

  /**
   * Change Password
   */
  async changePassword(req: Request, res: Response) {
    const memberId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError('Current and new password are required');
    }

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
    });

    if (!member || !member.passwordHash) {
      throw new UnauthorizedError('Member not found or setup');
    }

    const isValid = await comparePassword(currentPassword, member.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Invalid current password');
    }

    const hashedPassword = await hashPassword(newPassword);

    await this.prisma.member.update({
      where: { id: memberId },
      data: { passwordHash: hashedPassword },
    });

    await createAuditLog({
      action: AuditAction.PASSWORD_CHANGE,
      resourceType: 'Member',
      resourceId: member.id,
      tenantId: member.cooperativeId,
      userId: undefined,
      success: true,
      errorMessage: 'Password changed',
    });

    res.json({ message: 'Password updated successfully' });
  }
}

export const memberAuthController = new MemberAuthController();
