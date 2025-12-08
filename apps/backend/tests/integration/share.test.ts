import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShareController } from '../../src/controllers/ShareController.js';

// Mock dependencies
const mocks = vi.hoisted(() => {
  return {
    prisma: {
      shareAccount: {
        count: vi.fn(),
        aggregate: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      shareTransaction: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
      },
      member: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(mocks.prisma)),
    },
    shareService: {
      issueShares: vi.fn(),
      returnShares: vi.fn(),
      transferShares: vi.fn(),
      issueBonusShares: vi.fn(),
    },
    accounting: {
      getCurrentSharePrice: vi.fn().mockResolvedValue(100),
    },
  };
});

// Mock modules
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: mocks.prisma,
}));

vi.mock('../../src/services/share.service.js', () => ({
  ShareService: mocks.shareService,
}));

vi.mock('../../src/services/accounting.js', () => ({
  getCurrentSharePrice: mocks.accounting.getCurrentSharePrice,
}));

vi.mock('../../src/lib/permissions.js', () => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  hasAnyPermission: vi.fn().mockResolvedValue(true),
}));

describe('ShareController', () => {
  let shareController: ShareController;

  beforeEach(() => {
    vi.clearAllMocks();
    shareController = new ShareController();
    // Inject mock prisma manually as BaseController uses imported prisma
    (shareController as any).prisma = mocks.prisma;
  });

  describe('getDashboardStats', () => {
    it('should return correct stats', async () => {
      const cooperativeId = 'coop-1';

      mocks.prisma.shareAccount.count.mockResolvedValue(50);
      mocks.prisma.shareAccount.aggregate
        .mockResolvedValueOnce({ _sum: { totalKitta: 5000 } }) // first call for kitta
        .mockResolvedValueOnce({ _sum: { totalAmount: 500000 } }); // second call for amount
      mocks.prisma.shareTransaction.findMany.mockResolvedValue([]);

      const result = await shareController.getDashboardStats(cooperativeId);

      expect(result).toEqual({
        totalShareCapital: 500000,
        totalKitta: 5000,
        totalMembers: 50,
        recentTransactions: [],
      });
      expect(mocks.prisma.shareAccount.count).toHaveBeenCalledWith({ where: { cooperativeId } });
    });
  });

  describe('getAccounts', () => {
    it('should return paginated accounts and handle migration logic', async () => {
      const cooperativeId = 'coop-1';

      // Mock migration logic: No active members without accounts
      mocks.prisma.member.findMany.mockResolvedValue([]);
      mocks.prisma.shareAccount.findMany.mockResolvedValue([]); // for finding existing account IDs

      // Mock main query
      const mockAccounts = [{ id: 'acc-1', member: { firstName: 'Test' } }];
      mocks.prisma.shareAccount.findMany.mockResolvedValue(mockAccounts);
      mocks.prisma.shareAccount.count.mockResolvedValue(1);

      const result = await shareController.getAccounts(cooperativeId, { page: 1, limit: 10 });

      expect(result.accounts).toBe(mockAccounts);
      expect(result.total).toBe(1);
    });
  });

  describe('issueShares', () => {
    it.skip('should delegate to ShareService', async () => {
      const data = {
        cooperativeId: 'coop-1',
        memberId: 'mem-1',
        kitta: 10,
        date: new Date(),
        paymentMode: 'CASH',
        remarks: 'Test issue',
      };
      const userId = 'user-1';

      mocks.shareService.issueShares.mockResolvedValue({ id: 'tx-1', ...data });

      await shareController.issueShares(data, userId);

      expect(mocks.shareService.issueShares).toHaveBeenCalledWith(
        expect.objectContaining({
          cooperativeId: data.cooperativeId,
          memberId: data.memberId,
          kitta: data.kitta,
          userId: userId,
          date: expect.any(Date),
        })
      );
    });
  });
});
