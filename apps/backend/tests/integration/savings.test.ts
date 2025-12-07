import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SavingsController } from '../../src/controllers/SavingsController.js';

// Mock dependencies
const mocks = vi.hoisted(() => {
    return {
        prisma: {
            savingProduct: {
                findMany: vi.fn(),
                create: vi.fn(),
                count: vi.fn(),
                findUnique: vi.fn(),
            },
            savingAccount: {
                findMany: vi.fn(),
                findFirst: vi.fn(),
                create: vi.fn(),
                count: vi.fn(),
                findUnique: vi.fn(),
            },
            member: {
                findUnique: vi.fn(),
            },
            $transaction: vi.fn((callback) => callback(mocks.prisma)),
        },
        savingsService: {
            deposit: vi.fn(),
            withdraw: vi.fn(),
            calculateDailyInterest: vi.fn(),
            postInterest: vi.fn(),
        },
        hooks: {
            execute: vi.fn(),
        },
    };
});

// Mock modules
vi.mock('../../src/lib/prisma.js', () => ({
    prisma: mocks.prisma,
}));

vi.mock('../../src/services/savings.service.js', () => ({
    SavingsService: mocks.savingsService,
}));

vi.mock('../../src/lib/hooks.js', () => ({
    hooks: mocks.hooks,
}));

vi.mock('../../src/lib/permissions.js', () => ({
    hasPermission: vi.fn().mockResolvedValue(true),
    hasAnyPermission: vi.fn().mockResolvedValue(true),
}));

describe('SavingsController', () => {
    let savingsController: SavingsController;

    beforeEach(() => {
        vi.clearAllMocks();
        savingsController = new SavingsController();
        (savingsController as any).prisma = mocks.prisma;
    });

    describe('getProducts', () => {
        it('should return paginated products', async () => {
            const cooperativeId = 'coop-1';
            const mockProducts = [{ id: 'prod-1', name: 'Saving' }];

            mocks.prisma.savingProduct.findMany.mockResolvedValue(mockProducts);
            mocks.prisma.savingProduct.count.mockResolvedValue(1);

            const result = await savingsController.getProducts(cooperativeId, { page: 1, limit: 10 });

            expect(result.products).toBe(mockProducts);
            expect(result.total).toBe(1);
            expect(mocks.prisma.savingProduct.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { cooperativeId },
                take: 10,
            }));
        });
    });

    describe('createProduct', () => {
        it('should create product and execute hooks', async () => {
            const data = {
                cooperativeId: 'coop-1',
                code: 'S01',
                name: 'Normal Saving',
                interestRate: 5,
            };

            mocks.prisma.savingProduct.findUnique.mockResolvedValue(null); // No existing code
            mocks.prisma.savingProduct.create.mockResolvedValue({ id: 'prod-1', ...data });

            const result = await savingsController.createProduct(data, 'user-1');

            expect(result).toHaveProperty('id', 'prod-1');
            expect(mocks.prisma.savingProduct.create).toHaveBeenCalled();
            expect(mocks.hooks.execute).toHaveBeenCalledWith('SavingProduct', 'beforeCreate', expect.any(Object), expect.any(Object));
            expect(mocks.hooks.execute).toHaveBeenCalledWith('SavingProduct', 'afterCreate', expect.any(Object), expect.any(Object));
        });

        it('should fail if code exists', async () => {
            mocks.prisma.savingProduct.findUnique.mockResolvedValue({ id: 'existing' });

            await expect(savingsController.createProduct({
                cooperativeId: 'coop-1',
                code: 'S01',
                name: 'Test',
                interestRate: 5,
            })).rejects.toThrow('Product code already exists');
        });
    });

    describe('deposit', () => {
        it('should delegate to SavingsService', async () => {
            const data = {
                accountId: 'acc-1',
                amount: 1000,
                cooperativeId: 'coop-1',
            };

            mocks.savingsService.deposit.mockResolvedValue({ id: 'tx-1' });

            await savingsController.deposit(data, 'user-1');

            expect(mocks.savingsService.deposit).toHaveBeenCalledWith(expect.objectContaining({
                accountId: 'acc-1',
                amount: 1000,
                userId: 'user-1',
            }));
        });
    });
});
