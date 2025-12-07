import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoansController } from '../../src/controllers/LoansController.js';

const mocks = vi.hoisted(() => {
  return {
    prisma: {
      loanProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      loanApplication: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      member: { findUnique: vi.fn() },
      cooperative: { findUnique: vi.fn().mockResolvedValue({ id: 'coop-1' }) },
      eMISchedule: { create: vi.fn(), findMany: vi.fn() },
      $transaction: vi.fn((callback) =>
        callback({
          loanProduct: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
          loanApplication: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
          },
          member: { findUnique: vi.fn() },
          cooperative: { findUnique: vi.fn().mockResolvedValue({ id: 'coop-1' }) },
          eMISchedule: { create: vi.fn(), findMany: vi.fn() },
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

vi.mock('../../src/lib/hooks.js', () => ({
  hooks: mocks.hooks,
}));

// Mock permissions (needed by BaseController)
vi.mock('../../src/lib/permissions.js', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  hasAnyPermission: vi.fn().mockResolvedValue(true),
  isSystemAdmin: vi.fn().mockResolvedValue(false),
}));

describe('LoansController Integration', () => {
  let loansController: LoansController;

  beforeEach(() => {
    vi.clearAllMocks();
    loansController = new LoansController();
    // Inject mock prisma manually
    (loansController as any).prisma = mockPrisma;

    // Fix transaction mock to use the same mockPrisma instance
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  });

  describe('Loan Approval Flow', () => {
    it('should successfully approve a pending application and generate schedule', async () => {
      const cooperativeId = 'coop-1';
      const applicationId = 'app-1';
      const userId = 'user-1';

      // Mock data
      const mockApplication = {
        id: applicationId,
        cooperativeId,
        loanAmount: 100000,
        interestRate: 12,
        tenureMonths: 12,
        status: 'pending',
      };

      // Mock database responses
      mockPrisma.loanApplication.findFirst.mockResolvedValue(mockApplication);

      const mockUpdatedApplication = { ...mockApplication, status: 'approved' };
      mockPrisma.loanApplication.update.mockResolvedValue(mockUpdatedApplication);

      mockPrisma.eMISchedule.create.mockImplementation((args: any) => Promise.resolve(args.data));

      // Execute approval
      const result = await loansController.approveApplication(
        applicationId,
        cooperativeId,
        { disbursedDate: new Date('2025-01-01') },
        userId
      );

      // Verify Application Update
      expect(mockPrisma.loanApplication.update).toHaveBeenCalledWith({
        where: { id: applicationId },
        data: expect.objectContaining({
          status: 'approved',
          disbursedDate: expect.any(Date),
        }),
      });

      // Verify EMI Schedule Generation
      // Should generate 12 installments for 12 months tenure
      expect(mockPrisma.eMISchedule.create).toHaveBeenCalledTimes(12);
      expect(result.emiSchedules).toHaveLength(12);
      expect(result.application.status).toBe('approved');

      // Verify calculations (simple check)
      const firstEMI = result.emiSchedules[0];
      expect(firstEMI.installmentNumber).toBe(1);
      expect(firstEMI.totalAmount).toBeGreaterThan(0);
    });

    it('should throw error if application is not pending', async () => {
      const cooperativeId = 'coop-1';
      const applicationId = 'app-1';

      mockPrisma.loanApplication.findFirst.mockResolvedValue({
        id: applicationId,
        cooperativeId,
        status: 'rejected', // Already rejected
      });

      await expect(
        loansController.approveApplication(applicationId, cooperativeId)
      ).rejects.toThrow('Application is not in pending status');
    });

    it('should throw error if application not found', async () => {
      mockPrisma.loanApplication.findFirst.mockResolvedValue(null);

      await expect(loansController.approveApplication('missing-id', 'coop-1')).rejects.toThrow(
        'Application not found'
      );
    });
  });

  describe('Create Loan Product', () => {
    it('should create a new product if validation passes', async () => {
      const cooperativeId = 'coop-1';
      const productData = {
        cooperativeId,
        code: 'PL01',
        name: 'Personal Loan',
        interestRate: 14,
        maxLoanAmount: 500000,
        maxTenureMonths: 36,
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue(null); // No existing code
      mockPrisma.loanProduct.create.mockResolvedValue({ id: 'prod-1', ...productData });

      const result = await loansController.createProduct(productData, 'user-1');

      expect(mockPrisma.loanProduct.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'PL01',
          cooperativeId,
        }),
      });
      expect(result.code).toBe('PL01');
    });

    it('should fail if product code exists', async () => {
      const cooperativeId = 'coop-1';
      const productData = {
        cooperativeId,
        code: 'PL01',
        name: 'Personal Loan',
        interestRate: 14,
        maxLoanAmount: 500000,
        maxTenureMonths: 36,
      };

      mockPrisma.loanProduct.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(loansController.createProduct(productData, 'user-1')).rejects.toThrow(
        'Product code already exists'
      );
    });
  });
});
