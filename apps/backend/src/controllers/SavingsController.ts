import { BaseController, HookContext } from './BaseController.js';
import { hooks } from '../lib/hooks.js';
import { amlEvents, AML_EVENTS } from '../lib/events.js';

/**
 * Savings Controller
 * Handles all savings domain operations with lifecycle hooks
 */
export class SavingsController extends BaseController {
  /**
   * Get all saving products
   */
  async getProducts(cooperativeId: string) {
    await this.validateTenant(cooperativeId);

    return this.prisma.savingProduct.findMany({
      where: {
        cooperativeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Create a new saving product
   */
  async createProduct(
    data: {
      cooperativeId: string;
      code: string;
      name: string;
      description?: string;
      interestRate: number;
      minimumBalance?: number;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Validate required fields
      this.validateRequired(data, ['code', 'name', 'interestRate']);

      // Check if code already exists
      const existing = await tx.savingProduct.findUnique({
        where: {
          cooperativeId_code: {
            cooperativeId: data.cooperativeId,
            code: data.code,
          },
        },
      });

      if (existing) {
        throw new Error('Product code already exists');
      }

      const productData = {
        code: data.code,
        name: data.name,
        description: data.description || null,
        interestRate: parseFloat(String(data.interestRate)),
        minimumBalance: data.minimumBalance ? parseFloat(String(data.minimumBalance)) : 0,
        cooperativeId: data.cooperativeId,
      };

      const context = this.createHookContext(tx, data.cooperativeId, userId, undefined, {
        operation: 'createProduct',
      });

      // Execute hooks
      await hooks.execute('SavingProduct', 'onValidate', productData, context);
      await hooks.execute('SavingProduct', 'beforeCreate', productData, context);

      const product = await tx.savingProduct.create({
        data: productData,
      });

      await hooks.execute('SavingProduct', 'afterCreate', product, context);
      await hooks.execute('SavingProduct', 'onCreate', product, context);

      return product;
    });
  }

  /**
   * Get all saving accounts
   */
  async getAccounts(
    cooperativeId: string,
    filters?: {
      memberId?: string;
      status?: string;
    }
  ) {
    await this.validateTenant(cooperativeId);

    const where: any = {
      cooperativeId,
    };

    if (filters?.memberId) {
      where.memberId = filters.memberId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.savingAccount.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
          },
        },
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            interestRate: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a specific saving account
   */
  async getAccount(accountId: string, cooperativeId: string) {
    await this.validateTenant(cooperativeId);

    const account = await this.prisma.savingAccount.findFirst({
      where: {
        id: accountId,
        cooperativeId,
      },
      include: {
        member: {
          select: {
            id: true,
            memberNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        product: true,
      },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    return account;
  }

  /**
   * Create a new saving account
   */
  async createAccount(
    data: {
      cooperativeId: string;
      memberId: string;
      productId: string;
      accountNumber: string;
      initialDeposit?: number;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Validate required fields
      this.validateRequired(data, ['memberId', 'productId', 'accountNumber']);

      // Verify member belongs to cooperative
      const member = await tx.member.findUnique({
        where: { id: data.memberId },
      });

      if (!member || member.cooperativeId !== data.cooperativeId) {
        throw new Error('Member not found');
      }

      // Verify product belongs to cooperative
      const product = await tx.savingProduct.findUnique({
        where: { id: data.productId },
      });

      if (!product || product.cooperativeId !== data.cooperativeId) {
        throw new Error('Product not found');
      }

      // Check if account number already exists
      const existing = await tx.savingAccount.findUnique({
        where: {
          cooperativeId_accountNumber: {
            cooperativeId: data.cooperativeId,
            accountNumber: data.accountNumber,
          },
        },
      });

      if (existing) {
        throw new Error('Account number already exists');
      }

      const accountData = {
        accountNumber: data.accountNumber,
        memberId: data.memberId,
        productId: data.productId,
        cooperativeId: data.cooperativeId,
        balance: data.initialDeposit ? parseFloat(String(data.initialDeposit)) : 0,
        status: 'active' as const,
      };

      const context = this.createHookContext(tx, data.cooperativeId, userId, undefined, {
        operation: 'createAccount',
      });

      // Execute hooks
      await hooks.execute('SavingAccount', 'onValidate', accountData, context);
      await hooks.execute('SavingAccount', 'beforeCreate', accountData, context);

      const account = await tx.savingAccount.create({
        data: accountData,
        include: {
          member: {
            select: {
              id: true,
              memberNumber: true,
              firstName: true,
              lastName: true,
            },
          },
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              interestRate: true,
            },
          },
        },
      });

      await hooks.execute('SavingAccount', 'afterCreate', account, context);
      await hooks.execute('SavingAccount', 'onCreate', account, context);

      // Emit AML event for initial deposit if present
      if (data.initialDeposit && parseFloat(String(data.initialDeposit)) > 0) {
        amlEvents.emit(AML_EVENTS.ON_DEPOSIT, {
          memberId: data.memberId,
          amount: parseFloat(String(data.initialDeposit)),
          currency: 'NPR',
          isCash: true,
          transactionId: account.id,
          occurredOn: new Date(),
          transactionType: 'deposit',
          counterpartyType: 'MEMBER',
        });
      }

      return account;
    });
  }
}

// Export singleton instance
export const savingsController = new SavingsController();

