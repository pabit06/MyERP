import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseController } from '../BaseController.js';
import { prisma } from '../../lib/prisma.js';

// Mock Prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    cooperative: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(prisma)),
  },
}));

// Create a concrete implementation for testing
class TestController extends BaseController {
  async testValidateTenant(tenantId: string) {
    return this.validateTenant(tenantId);
  }

  async testHandleTransaction<T>(fn: (tx: any) => Promise<T>) {
    return this.handleTransaction(fn);
  }
}

describe('BaseController', () => {
  let controller: TestController;

  beforeEach(() => {
    controller = new TestController();
    vi.clearAllMocks();
  });

  describe('validateTenant', () => {
    it('should validate existing tenant', async () => {
      vi.mocked(prisma.cooperative.findUnique).mockResolvedValue({ id: 'coop-1' } as any);

      await expect(controller.testValidateTenant('coop-1')).resolves.not.toThrow();
    });

    it('should throw error for non-existent tenant', async () => {
      vi.mocked(prisma.cooperative.findUnique).mockResolvedValue(null);

      await expect(controller.testValidateTenant('invalid-coop')).rejects.toThrow(
        'Cooperative not found'
      );
    });
  });

  describe('handleTransaction', () => {
    it('should execute function within transaction', async () => {
      const mockFn = vi.fn().mockResolvedValue('result');

      const result = await controller.testHandleTransaction(mockFn);

      expect(result).toBe('result');
      expect(mockFn).toHaveBeenCalledWith(prisma);
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should handle transaction errors', async () => {
      const mockFn = vi.fn().mockRejectedValue(new Error('Transaction failed'));

      await expect(controller.testHandleTransaction(mockFn)).rejects.toThrow('Transaction failed');
    });
  });
});

