import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthController } from '../../src/controllers/AuthController.js';
import { Request, Response } from 'express';
import { UnauthorizedError } from '../../src/lib/errors.js';
import * as authLib from '../../src/lib/auth.js';

const mocks = vi.hoisted(() => {
  return {
    prisma: {
      user: { findUnique: vi.fn() },
      cooperative: { findUnique: vi.fn() },
      member: { findFirst: vi.fn() },
      auditLog: { create: vi.fn() },
      $transaction: vi.fn((callback) =>
        callback({
          user: { findUnique: vi.fn() },
          cooperative: { findUnique: vi.fn() },
          member: { findFirst: vi.fn() },
          auditLog: { create: vi.fn() },
        } as any)
      ),
    },
    hooks: { execute: vi.fn() },
  };
});

const mockPrisma = mocks.prisma;

// Mock BaseController's Prisma usage
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: mocks.prisma,
}));

// Mock permissions
vi.mock('../../src/lib/permissions.js', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  hasAnyPermission: vi.fn().mockResolvedValue(true),
  isSystemAdmin: vi.fn().mockResolvedValue(false),
}));

// Mock hooks
vi.mock('../../src/lib/hooks.js', () => ({
  hooks: mocks.hooks,
}));

// Mock external libraries
vi.mock('../../src/lib/auth.js', async () => {
  const actual = await vi.importActual('../../src/lib/auth.js');
  return {
    ...actual,
    comparePassword: vi.fn(),
    generateToken: vi.fn(),
  };
});

vi.mock('../../src/lib/audit-log.js', () => ({
  createAuditLog: vi.fn(),
  AuditAction: {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
  },
}));

// Mock config to avoid environment variable validation
vi.mock('../../src/config/env.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-jwt-secret',
    NODE_ENV: 'test',
  },
}));

vi.mock('../../src/config/index.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    JWT_SECRET: 'test-jwt-secret',
    NODE_ENV: 'test',
  },
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('AuthController Integration', () => {
  let authController: AuthController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    authController = new AuthController();
    // Inject mock prisma manually just in case
    (authController as any).prisma = mockPrisma;

    mockReq = {
      body: {},
      ip: '127.0.0.1',
      get: vi.fn().mockReturnValue('User-Agent'),
    };
    mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
        cooperative: {
          id: 'coop-1',
          name: 'Test Coop',
          profile: {},
          subscription: { plan: { enabledModules: [] } },
        },
      };

      mockReq.body = { email: 'test@example.com', password: 'password' };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (authLib.comparePassword as any).mockResolvedValue(true);
      (authLib.generateToken as any).mockReturnValue('fake-jwt-token');

      await authController.login(mockReq as Request, mockRes as Response);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: expect.any(Object),
      });
      expect(authLib.comparePassword).toHaveBeenCalledWith('password', 'hashed-password');
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: 'fake-jwt-token',
        })
      );
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        isActive: true,
        cooperative: { id: 'coop-1', subscription: {} },
      };

      mockReq.body = { email: 'test@example.com', password: 'wrong-password' };

      mockPrisma.user.findUnique.mockResolvedValue(user);
      (authLib.comparePassword as any).mockResolvedValue(false);

      await expect(authController.login(mockReq as Request, mockRes as Response)).rejects.toThrow(
        UnauthorizedError
      );
    });

    it('should throw UnauthorizedError if user not found', async () => {
      mockReq.body = { email: 'unknown@example.com', password: 'password' };
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authController.login(mockReq as Request, mockRes as Response)).rejects.toThrow(
        UnauthorizedError
      );
    });
  });

  describe('memberLogin', () => {
    it('should login member successfully', async () => {
      const cooperative = {
        id: 'coop-1',
        subdomain: 'test-coop',
      };
      const member = {
        id: 'member-1',
        memberNumber: '001',
        passwordHash: 'hashed-password',
        cooperativeId: 'coop-1',
        isActive: true,
        email: 'member@test.com',
      };

      mockReq.body = {
        subdomain: 'test-coop',
        memberNumber: '001',
        password: 'password',
      };

      mockPrisma.cooperative.findUnique.mockResolvedValue(cooperative);
      mockPrisma.member.findFirst.mockResolvedValue(member);
      (authLib.comparePassword as any).mockResolvedValue(true);
      (authLib.generateToken as any).mockReturnValue('fake-member-token');

      await authController.memberLogin(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          token: 'fake-member-token',
        })
      );
    });
  });
});
