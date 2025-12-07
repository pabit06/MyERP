import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountingController } from '../../src/controllers/AccountingController.js';

const mocks = vi.hoisted(() => {
  return {
    prisma: {
      chartOfAccounts: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      journalEntry: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn().mockResolvedValue(0),
      },
      ledger: {
        create: vi.fn(),
        findMany: vi.fn(),
        aggregate: vi.fn(),
      },
      cooperative: {
        findUnique: vi.fn().mockResolvedValue({ id: 'coop-1' }),
      },
      $transaction: vi.fn((callback) =>
        callback({
          chartOfAccounts: {
            findMany: vi.fn(),
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          },
          journalEntry: {
            create: vi.fn(),
            findMany: vi.fn(),
            findUnique: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
          },
          ledger: { create: vi.fn(), findMany: vi.fn(), aggregate: vi.fn() },
          cooperative: { findUnique: vi.fn().mockResolvedValue({ id: 'coop-1' }) },
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

// Mock accounting utilities
vi.mock('../../src/services/accounting.js', () => ({
  postShareCapital: vi.fn(),
  postShareReturn: vi.fn(),
  postLoanDisbursement: vi.fn(),
  postLoanRepayment: vi.fn(),
  postSavingDeposit: vi.fn(),
  postSavingWithdrawal: vi.fn(),
  generateAccountCode: vi.fn().mockResolvedValue('00-10100-01-00001'),
  parseAccountCode: vi.fn(),
  validateAccountCodeFormat: vi.fn().mockReturnValue(true),
  getGLHeadFromType: vi.fn().mockReturnValue('1'),
  getOrCreateAccount: vi.fn().mockResolvedValue('account-1'),
}));

describe('AccountingController Integration', () => {
  let accountingController: AccountingController;

  beforeEach(() => {
    vi.clearAllMocks();
    accountingController = new AccountingController();
    // Inject mock prisma manually
    (accountingController as any).prisma = mockPrisma;

    // Fix transaction mock to use the same mockPrisma instance
    mockPrisma.$transaction.mockImplementation((callback) => callback(mockPrisma));
  });

  describe('Journal Entry Creation', () => {
    it('should create a balanced journal entry successfully', async () => {
      const cooperativeId = 'coop-1';
      const description = 'Test Transaction';
      const entries = [
        { accountId: 'acc-1', debit: 1000, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 1000 },
      ];

      // Mock account lookups (using chartOfAccounts)
      mockPrisma.chartOfAccounts.findMany.mockResolvedValue([
        { id: 'acc-1', type: 'asset' },
        { id: 'acc-2', type: 'revenue' },
      ]);

      // Mock ledger lookups (empty for new accounts)
      mockPrisma.ledger.findMany.mockResolvedValue([]);

      // Mock journal entry creation
      const mockJournalEntry = {
        id: 'je-1',
        cooperativeId,
        description,
        date: new Date(),
        entryNumber: 'JE-2025-000001',
      };
      mockPrisma.journalEntry.create.mockResolvedValue(mockJournalEntry as any);

      // Mock ledger entry creation
      mockPrisma.ledger.create.mockResolvedValue({} as any);

      const result = await accountingController.createJournalEntry(
        cooperativeId,
        description,
        entries,
        new Date(),
        'user-1'
      );

      // Verify journal entry was created
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cooperativeId,
          description,
        }),
      });

      // Verify ledger entries were created (2 entries)
      expect(mockPrisma.ledger.create).toHaveBeenCalledTimes(2);

      expect(result).toHaveProperty('journalEntry');
      expect(result.journalEntry).toHaveProperty('id', 'je-1');
    });

    it('should throw error for unbalanced journal entry', async () => {
      const cooperativeId = 'coop-1';
      const description = 'Unbalanced Transaction';
      const entries = [
        { accountId: 'acc-1', debit: 1000, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 500 }, // Unbalanced!
      ];

      await expect(
        accountingController.createJournalEntry(
          cooperativeId,
          description,
          entries,
          new Date(),
          'user-1'
        )
      ).rejects.toThrow('Double-entry validation failed');
    });

    it('should throw error when account not found', async () => {
      const cooperativeId = 'coop-1';
      const description = 'Invalid Account Transaction';
      const entries = [
        { accountId: 'invalid-acc', debit: 100, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 100 },
      ];

      // Mock empty account lookup
      mockPrisma.chartOfAccounts.findMany.mockResolvedValue([]);

      await expect(
        accountingController.createJournalEntry(
          cooperativeId,
          description,
          entries,
          new Date(),
          'user-1'
        )
      ).rejects.toThrow('Account not found');
    });
  });

  describe('Transaction Posting', () => {
    it('should post transaction using postTransaction method', async () => {
      const cooperativeId = 'coop-1';
      const description = 'Payment Transaction';
      const entries = [
        { accountId: 'acc-1', debit: 500, credit: 0 },
        { accountId: 'acc-2', debit: 0, credit: 500 },
      ];

      // Mock account lookups
      mockPrisma.chartOfAccounts.findMany.mockResolvedValue([
        { id: 'acc-1', type: 'asset' },
        { id: 'acc-2', type: 'liability' },
      ]);

      mockPrisma.ledger.findMany.mockResolvedValue([]);

      mockPrisma.journalEntry.create.mockResolvedValue({
        id: 'je-2',
        cooperativeId,
        description,
        entryNumber: 'JE-2025-000002',
      } as any);

      mockPrisma.ledger.create.mockResolvedValue({} as any);

      const result = await accountingController.postTransaction(
        cooperativeId,
        description,
        entries,
        new Date(),
        'user-1'
      );

      expect(result).toHaveProperty('journalEntry');
      expect(result.journalEntry.id).toBe('je-2');
      expect(mockPrisma.journalEntry.create).toHaveBeenCalled();
    });
  });
});
