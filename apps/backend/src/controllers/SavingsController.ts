import { BaseController } from './BaseController.js';
import { hooks } from '../lib/hooks.js';
import { amlEvents, AML_EVENTS } from '../lib/events.js';
import { SavingsService } from '../services/savings.service.js';

/**
 * Savings Controller
 * Handles all savings domain operations with lifecycle hooks
 */
export class SavingsController extends BaseController {
  /**
   * Get all saving products
   */
  async getProducts(
    cooperativeId: string,
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {}
  ) {
    await this.validateTenant(cooperativeId);
    const { page, limit, sortBy, sortOrder } = params;

    const where = { cooperativeId };

    const [products, total] = await Promise.all([
      this.prisma.savingProduct.findMany({
        where,
        orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' },
        skip: page && limit ? (page - 1) * limit : undefined,
        take: limit,
      }),
      this.prisma.savingProduct.count({ where }),
    ]);

    return { products, total };
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
      interestPostingFrequency?: string;
      interestCalculationMethod?: string;
      isTaxApplicable?: boolean;
      taxRate?: number;
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
        interestPostingFrequency: data.interestPostingFrequency || 'QUARTERLY',
        interestCalculationMethod: data.interestCalculationMethod || 'DAILY_BALANCE',
        isTaxApplicable: data.isTaxApplicable !== undefined ? data.isTaxApplicable : true,
        taxRate: data.taxRate ? parseFloat(String(data.taxRate)) : 6.0,
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
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      search?: string;
      memberId?: string;
      status?: string;
    } = {}
  ) {
    await this.validateTenant(cooperativeId);
    const { page, limit, sortBy, sortOrder, search, memberId, status } = params;

    const where: any = {
      cooperativeId,
    };

    if (memberId) where.memberId = memberId;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { accountNumber: { contains: search, mode: 'insensitive' } },
        { member: { memberNumber: { contains: search, mode: 'insensitive' } } },
        { member: { firstName: { contains: search, mode: 'insensitive' } } },
        { member: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [accounts, total] = await Promise.all([
      this.prisma.savingAccount.findMany({
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
        orderBy: sortBy ? { [sortBy]: sortOrder || 'desc' } : { createdAt: 'desc' },
        skip: page && limit ? (page - 1) * limit : undefined,
        take: limit,
      }),
      this.prisma.savingAccount.count({ where }),
    ]);

    return { accounts, total };
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
      accountNumber?: string;
      initialDeposit?: number;
      nominee?: {
        name: string;
        relation: string;
        citizenship?: string;
        photo?: string;
      };
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Validate required fields
      this.validateRequired(data, ['memberId', 'productId']);

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

      let accountNumber = data.accountNumber;

      // Auto-generate account number if not provided
      if (!accountNumber) {
        const lastAccount = await tx.savingAccount.findFirst({
          where: {
            cooperativeId: data.cooperativeId,
            productId: data.productId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        let nextSequence = 1;
        if (lastAccount) {
          const parts = lastAccount.accountNumber.split('-');
          const lastSequence = parseInt(parts[parts.length - 1]);
          if (!isNaN(lastSequence)) {
            nextSequence = lastSequence + 1;
          }
        }

        accountNumber = `${product.code}-${String(nextSequence).padStart(5, '0')}`;
      }

      // Check if account number already exists
      const existing = await tx.savingAccount.findUnique({
        where: {
          cooperativeId_accountNumber: {
            cooperativeId: data.cooperativeId,
            accountNumber,
          },
        },
      });

      if (existing) {
        throw new Error(`Account number ${accountNumber} already exists`);
      }

      const accountData = {
        accountNumber,
        memberId: data.memberId,
        productId: data.productId,
        cooperativeId: data.cooperativeId,
        balance: data.initialDeposit ? parseFloat(String(data.initialDeposit)) : 0,
        status: 'active' as const,
        nominee: data.nominee ? (data.nominee as any) : null,
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

  /**
   * Deposit amount to saving account
   */
  async deposit(
    data: {
      accountId: string;
      amount: number;
      cooperativeId: string;
      paymentMode?: 'CASH' | 'BANK' | 'SAVING';
      cashAccountCode?: string;
      bankAccountId?: string;
      remarks?: string;
      date?: Date;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return SavingsService.deposit({
      ...data,
      userId,
    });
  }

  /**
   * Withdraw amount from saving account
   */
  async withdraw(
    data: {
      accountId: string;
      amount: number;
      cooperativeId: string;
      paymentMode?: 'CASH' | 'BANK';
      cashAccountCode?: string;
      bankAccountId?: string;
      remarks?: string;
      date?: Date;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return SavingsService.withdraw({
      ...data,
      userId,
    });
  }

  /**
   * Calculate daily interest for all active saving accounts
   */
  async calculateInterest(cooperativeId: string, asOfDate?: Date) {
    await this.validateTenant(cooperativeId);

    return SavingsService.calculateDailyInterest(cooperativeId, asOfDate);
  }

  /**
   * Post interest to saving accounts
   */
  async postInterest(
    data: {
      cooperativeId: string;
      productId?: string;
      interestExpenseGLCode?: string;
      tdsPayableGLCode?: string;
      date?: Date;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return SavingsService.postInterest({
      ...data,
      userId,
    });
  }
}

// Export singleton instance
export const savingsController = new SavingsController();
