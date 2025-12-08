import { describe, it, expect, vi } from 'vitest';
import { AccountingService } from './accounting';
import { prisma } from '../lib/prisma';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    chartOfAccounts: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    ledger: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}));

describe('AccountingService', () => {
  describe('parseAccountCode', () => {
    it('should parse a valid account code', () => {
      const code = '00-10100-01-00001';
      const result = AccountingService.parseAccountCode(code);

      expect(result).toEqual({
        branch: '00',
        glHead: '10100',
        subType: '01',
        serial: '00001',
      });
    });

    it('should return null for invalid code length', () => {
      const code = '00-10100-01-001'; // Too short
      const result = AccountingService.parseAccountCode(code);
      expect(result).toBeNull();
    });
  });

  describe('getChartOfAccounts', () => {
    it('should return accounts with balances', async () => {
      const mockAccounts = [
        { id: '1', code: '10100', name: 'Cash', type: 'asset', isGroup: false },
      ];
      const mockLedgers = [{ accountId: '1', balance: 1000, createdAt: new Date() }];

      vi.mocked(prisma.chartOfAccounts.findMany).mockResolvedValue(mockAccounts as any);
      vi.mocked(prisma.ledger.findMany).mockResolvedValue(mockLedgers as any);

      const result = await AccountingService.getChartOfAccounts('coop-1');

      expect(result).toHaveLength(1);
      expect(result[0].balance).toBe(1000);
      expect(prisma.chartOfAccounts.findMany).toHaveBeenCalled();
    });
  });
});
