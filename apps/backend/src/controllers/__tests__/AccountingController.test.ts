import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccountingController } from '../AccountingController.js';
import { hooks } from '../../lib/hooks.js';

// Mock Prisma
const mockPrisma: any = {
  cooperative: {
    findUnique: vi.fn(),
  },
  chartOfAccounts: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  journalEntry: {
    create: vi.fn(),
    count: vi.fn(),
  },
  ledger: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

describe('AccountingController', () => {
  let controller: AccountingController;

  beforeEach(() => {
    controller = new AccountingController();
    hooks.clear();
    vi.clearAllMocks();
  });

  describe('createAccount', () => {
    it('should create an account with hooks', async () => {
      const mockAccount = {
        id: 'account-1',
        code: '00-10100-01-00001',
        name: 'Test Account',
        type: 'asset',
        cooperativeId: 'coop-1',
        isActive: true,
        isGroup: false,
      };

      const hookSpy = vi.fn();
      hooks.register('ChartOfAccounts', 'onCreate', hookSpy, 100, 'test-hook');

      vi.mocked(mockPrisma.cooperative.findUnique).mockResolvedValue({ id: 'coop-1' } as any);
      vi.mocked(mockPrisma.chartOfAccounts.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.chartOfAccounts.create).mockResolvedValue(mockAccount as any);

      const result = await controller.createAccount(
        {
          cooperativeId: 'coop-1',
          name: 'Test Account',
          type: 'asset',
          code: '00-10100-01-00001',
        },
        'user-1'
      );

      expect(result).toEqual(mockAccount);
      expect(hookSpy).toHaveBeenCalled();
    });

    it('should validate tenant before creating account', async () => {
      vi.mocked(mockPrisma.cooperative.findUnique).mockResolvedValue(null);

      await expect(
        controller.createAccount(
          {
            cooperativeId: 'invalid-coop',
            name: 'Test Account',
            type: 'asset',
          },
          'user-1'
        )
      ).rejects.toThrow('Cooperative not found');
    });
  });

  describe('createJournalEntry', () => {
    it('should create journal entry with hooks', async () => {
      const mockJournalEntry = {
        id: 'je-1',
        entryNumber: 'JE-2024-000001',
        description: 'Test Entry',
        date: new Date(),
        cooperativeId: 'coop-1',
      };

      const mockLedger = {
        id: 'ledger-1',
        accountId: 'account-1',
        journalEntryId: 'je-1',
        debit: 100,
        credit: 0,
        balance: 100,
      };

      const hookSpy = vi.fn();
      hooks.register('JournalEntry', 'onCreate', hookSpy, 100, 'test-hook');

      vi.mocked(mockPrisma.cooperative.findUnique).mockResolvedValue({ id: 'coop-1' } as any);
      vi.mocked(mockPrisma.journalEntry.count).mockResolvedValue(0);
      vi.mocked(mockPrisma.journalEntry.create).mockResolvedValue(mockJournalEntry as any);
      vi.mocked(mockPrisma.chartOfAccounts.findUnique).mockResolvedValue({
        id: 'account-1',
        type: 'asset',
        isActive: true,
      } as any);
      vi.mocked(mockPrisma.ledger.findFirst).mockResolvedValue(null);
      vi.mocked(mockPrisma.ledger.create).mockResolvedValue(mockLedger as any);

      const result = await controller.createJournalEntry(
        'coop-1',
        'Test Entry',
        [
          { accountId: 'account-1', debit: 100, credit: 0 },
          { accountId: 'account-2', debit: 0, credit: 100 },
        ],
        undefined,
        'user-1'
      );

      expect(result.journalEntry).toEqual(mockJournalEntry);
      expect(hookSpy).toHaveBeenCalled();
    });

    it('should validate double-entry accounting', async () => {
      vi.mocked(mockPrisma.cooperative.findUnique).mockResolvedValue({ id: 'coop-1' } as any);

      await expect(
        controller.createJournalEntry(
          'coop-1',
          'Invalid Entry',
          [
            { accountId: 'account-1', debit: 100, credit: 0 },
            { accountId: 'account-2', debit: 0, credit: 50 }, // Mismatch
          ],
          undefined,
          'user-1'
        )
      ).rejects.toThrow('Double-entry validation failed');
    });
  });

  describe('updateAccount', () => {
    it('should prevent updating account code if it has transactions', async () => {
      const originalAccount = {
        id: 'account-1',
        code: '00-10100-01-00001',
        name: 'Original Account',
        type: 'asset',
        cooperativeId: 'coop-1',
      };

      vi.mocked(mockPrisma.cooperative.findUnique).mockResolvedValue({ id: 'coop-1' } as any);
      vi.mocked(mockPrisma.chartOfAccounts.findUnique).mockResolvedValue(originalAccount as any);
      vi.mocked(mockPrisma.ledger.count).mockResolvedValue(5); // Has transactions

      await expect(
        controller.updateAccount(
          'account-1',
          'coop-1',
          { code: '00-10100-01-00002' }, // Trying to change code
          'user-1'
        )
      ).rejects.toThrow('Cannot change account code');
    });
  });
});
