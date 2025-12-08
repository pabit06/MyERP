import { Prisma, Ledger } from '@prisma/client';
import { BaseController } from './BaseController.js';
import { hooks } from '../lib/hooks.js';
import {
  postShareCapital as postShareCapitalUtil,
  postShareReturn as postShareReturnUtil,
  postEntryFee as postEntryFeeUtil,
  getCurrentSharePrice as getCurrentSharePriceUtil,
} from '../services/accounting.js';
import {
  FINAL_COA_SEED_DATA,
  seedAccountRecursive,
  generateAccountCode,
  parseAccountCode,
  validateAccountCodeFormat,
  getGLHeadFromType,
  getOrCreateAccount,
} from '../services/accounting.js';

/**
 * Accounting Controller
 * Handles all accounting domain operations with lifecycle hooks
 */
export class AccountingController extends BaseController {
  /**
   * Seed Default Accounts for a new Tenant/Cooperative
   */
  async seedDefaultAccounts(cooperativeId: string, userId?: string) {
    await this.validateTenant(cooperativeId);

    return this.handleTransaction(async (tx) => {
      const context = this.createHookContext(tx, cooperativeId, userId, undefined, {
        operation: 'seedDefaultAccounts',
      });

      // Execute before hooks
      await hooks.execute('ChartOfAccounts', 'beforeCreate', { cooperativeId }, context);

      let count = 0;
      for (const rootNode of FINAL_COA_SEED_DATA) {
        await seedAccountRecursive(cooperativeId, rootNode, null);
        count++;
      }

      // Execute after hooks
      await hooks.execute('ChartOfAccounts', 'afterCreate', { cooperativeId, count }, context);

      return { success: true, message: 'Chart of Accounts seeded successfully', count };
    });
  }

  /**
   * Get Chart of Accounts with Hierarchy
   */
  async getChartOfAccounts(cooperativeId: string, type?: string) {
    await this.validateTenant(cooperativeId);

    const where: {
      cooperativeId: string;
      isActive: boolean;
      type?: string;
    } = { cooperativeId, isActive: true };
    if (type) {
      where.type = type.toLowerCase();
    }

    const accounts = await this.prisma.chartOfAccounts.findMany({
      where,
      orderBy: { code: 'asc' },
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
            isGroup: true,
            nfrsMap: true,
          },
          where: type ? { type: type.toLowerCase(), isActive: true } : { isActive: true },
        },
        _count: {
          select: { ledgerEntries: true },
        },
      },
    });

    // Filter by type if specified
    let filteredAccounts = accounts;
    if (type) {
      const requestedType = type.toLowerCase();
      filteredAccounts = accounts.filter((account) => account.type.toLowerCase() === requestedType);
    }

    // Get latest balance for each account
    const accountIds = filteredAccounts.map((acc) => acc.id);
    const latestBalances = await this.prisma.ledger.findMany({
      where: {
        accountId: { in: accountIds },
        cooperativeId,
      },
      select: {
        accountId: true,
        balance: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Group by accountId and get the latest balance for each
    const balanceMap = new Map<string, number>();
    const seenAccounts = new Set<string>();
    for (const ledger of latestBalances) {
      if (!seenAccounts.has(ledger.accountId)) {
        balanceMap.set(ledger.accountId, Number(ledger.balance));
        seenAccounts.add(ledger.accountId);
      }
    }

    // Add balance to each account
    return filteredAccounts.map((account) => ({
      ...account,
      balance: balanceMap.get(account.id) || 0,
    }));
  }

  /**
   * Create a New Account Head (With Validations and Hooks)
   */
  async createAccount(
    data: {
      cooperativeId: string;
      code?: string;
      name: string;
      type: string;
      parentId?: string;
      isGroup?: boolean;
      nfrsMap?: string;
      subType?: string;
      branch?: string;
      autoGenerateCode?: boolean;
    },
    userId?: string
  ) {
    await this.validateTenant(data.cooperativeId);

    return this.handleTransaction(async (tx) => {
      const type = data.type.toLowerCase();
      const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
      const normalizedType = type === 'revenue' ? 'income' : type;

      if (!validTypes.includes(normalizedType)) {
        throw new Error(`Invalid account type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Generate or validate account code
      let accountCode: string;
      if (data.autoGenerateCode || !data.code) {
        accountCode = await generateAccountCode(
          data.cooperativeId,
          normalizedType,
          data.subType || '00',
          data.branch || '00'
        );
      } else {
        accountCode = data.code;
        const formatValidation = validateAccountCodeFormat(accountCode);
        if (!formatValidation.valid) {
          throw new Error(formatValidation.error);
        }

        const parsed = parseAccountCode(accountCode);
        if (!parsed) {
          throw new Error('Invalid account code format');
        }

        const glHeadFirst = parsed.glHead.charAt(0);
        const expectedGLHead = getGLHeadFromType(normalizedType).charAt(0);

        if (glHeadFirst !== expectedGLHead) {
          const typeNames: Record<string, string> = {
            '1': 'Asset',
            '2': 'Liability/Equity',
            '3': 'Equity',
            '4': 'Income',
            '5': 'Expense',
          };
          throw new Error(
            `Account type '${normalizedType}' requires GL Head starting with '${expectedGLHead}' (${typeNames[expectedGLHead]}), but code has '${glHeadFirst}'`
          );
        }
      }

      // Validate uniqueness
      const existing = await tx.chartOfAccounts.findFirst({
        where: { cooperativeId: data.cooperativeId, code: accountCode },
      });
      if (existing) {
        throw new Error(`Account code ${accountCode} already exists.`);
      }

      // Validate parent
      if (data.parentId) {
        const parent = await tx.chartOfAccounts.findUnique({
          where: { id: data.parentId },
        });
        if (!parent) {
          throw new Error('Parent account not found');
        }
        if (!parent.isGroup) {
          throw new Error('Cannot add a child to a Ledger account. Parent must be a Group.');
        }
      }

      const accountData = {
        cooperativeId: data.cooperativeId,
        code: accountCode,
        name: data.name,
        type: normalizedType,
        parentId: data.parentId || null,
        isGroup: data.isGroup ?? false,
        nfrsMap: data.nfrsMap ?? null,
        isActive: true,
      };

      // Execute validation hooks
      const context = this.createHookContext(tx, data.cooperativeId, userId, undefined, {
        operation: 'createAccount',
      });

      await hooks.execute('ChartOfAccounts', 'onValidate', accountData, context);
      await hooks.execute('ChartOfAccounts', 'beforeCreate', accountData, context);

      // Create account
      const account = await tx.chartOfAccounts.create({
        data: accountData,
      });

      // Execute after hooks
      await hooks.execute('ChartOfAccounts', 'afterCreate', account, context);
      await hooks.execute('ChartOfAccounts', 'onCreate', account, context);

      return account;
    });
  }

  /**
   * Update Account (With Hooks)
   */
  async updateAccount(
    id: string,
    cooperativeId: string,
    data: {
      name?: string;
      isActive?: boolean;
      code?: string;
      type?: string;
      parentId?: string;
      isGroup?: boolean;
      nfrsMap?: string;
    },
    userId?: string
  ) {
    await this.validateTenant(cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Get original account
      const originalAccount = await tx.chartOfAccounts.findUnique({
        where: { id, cooperativeId },
      });

      if (!originalAccount) {
        throw new Error('Account not found');
      }

      // Validate code uniqueness if updating code
      if (data.code) {
        const existing = await tx.chartOfAccounts.findFirst({
          where: {
            cooperativeId,
            code: data.code,
            id: { not: id },
          },
        });

        if (existing) {
          throw new Error(`Account code ${data.code} already exists.`);
        }
      }

      // Validate type if updating
      if (data.type) {
        const validTypes = ['asset', 'liability', 'equity', 'income', 'expense'];
        const type = data.type.toLowerCase();
        const normalizedType = type === 'revenue' ? 'income' : type;
        if (!validTypes.includes(normalizedType)) {
          throw new Error(`Invalid account type. Must be one of: ${validTypes.join(', ')}`);
        }
        data.type = normalizedType;
      }

      const context = this.createHookContext(tx, cooperativeId, userId, originalAccount, {
        operation: 'updateAccount',
      });

      // Execute validation hooks
      await hooks.execute(
        'ChartOfAccounts',
        'onValidate',
        { ...originalAccount, ...data },
        context
      );
      await hooks.execute(
        'ChartOfAccounts',
        'beforeUpdate',
        { ...originalAccount, ...data },
        context
      );

      // Update account
      const account = await tx.chartOfAccounts.update({
        where: { id, cooperativeId },
        data,
      });

      // Execute after hooks
      await hooks.execute('ChartOfAccounts', 'afterUpdate', account, context);
      await hooks.execute('ChartOfAccounts', 'onUpdate', account, context);

      return account;
    });
  }

  /**
   * Delete Account (With Hooks)
   */
  async deleteAccount(id: string, cooperativeId: string, userId?: string) {
    await this.validateTenant(cooperativeId);

    return this.handleTransaction(async (tx) => {
      const account = await tx.chartOfAccounts.findUnique({
        where: { id, cooperativeId },
        include: {
          _count: {
            select: { ledgerEntries: true, children: true },
          },
        },
      });

      if (!account) throw new Error('Account not found');

      if (account._count.ledgerEntries > 0) {
        throw new Error('Cannot delete account with existing transactions.');
      }

      if (account._count.children > 0) {
        throw new Error('Cannot delete account with child accounts.');
      }

      const context = this.createHookContext(tx, cooperativeId, userId, account, {
        operation: 'deleteAccount',
      });

      // Execute hooks
      await hooks.execute('ChartOfAccounts', 'beforeDelete', account, context);

      const deleted = await tx.chartOfAccounts.delete({
        where: { id },
      });

      await hooks.execute('ChartOfAccounts', 'afterDelete', deleted, context);
      await hooks.execute('ChartOfAccounts', 'onDelete', deleted, context);

      return deleted;
    });
  }

  /**
   * Create Journal Entry (With Hooks)
   */
  async createJournalEntry(
    cooperativeId: string,
    description: string,
    entries: Array<{ accountId: string; debit: number; credit: number }>,
    date?: Date,
    userId?: string
  ) {
    await this.validateTenant(cooperativeId);

    return this.handleTransaction(async (tx) => {
      // Validate double-entry
      const totalDebits = entries.reduce((sum, e) => sum + Number(e.debit), 0);
      const totalCredits = entries.reduce((sum, e) => sum + Number(e.credit), 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          `Double-entry validation failed: Debits (${totalDebits}) must equal Credits (${totalCredits})`
        );
      }

      // Generate entry number
      const year = (date || new Date()).getFullYear();
      const entryCount = await tx.journalEntry.count({
        where: {
          cooperativeId,
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const entryNumber = `JE-${year}-${String(entryCount + 1).padStart(6, '0')}`;

      const journalEntryData = {
        cooperativeId,
        entryNumber,
        description,
        date: date || new Date(),
        entries,
      };

      const context = this.createHookContext(tx, cooperativeId, userId, undefined, {
        operation: 'createJournalEntry',
      });

      // Execute validation hooks
      await hooks.execute('JournalEntry', 'onValidate', journalEntryData, context);
      await hooks.execute('JournalEntry', 'beforeCreate', journalEntryData, context);

      // Create journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          cooperativeId,
          entryNumber,
          description,
          date: date || new Date(),
        },
      });

      // Batch fetch all accounts and latest balances to avoid N+1 queries
      const accountIds = entries.map((entry) => entry.accountId);
      const [accounts, latestLedgers] = await Promise.all([
        tx.chartOfAccounts.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, type: true },
        }),
        // Get latest ledger entry for each account
        tx.ledger.findMany({
          where: {
            accountId: { in: accountIds },
            cooperativeId,
          },
          select: {
            accountId: true,
            balance: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Create maps for O(1) lookup
      const accountMap = new Map(
        accounts.map((acc: { id: string; type: string }) => [acc.id, acc])
      );
      const balanceMap = new Map<string, number>();
      const seenAccounts = new Set<string>();
      for (const ledger of latestLedgers) {
        if (!seenAccounts.has(ledger.accountId)) {
          balanceMap.set(ledger.accountId, Number(ledger.balance));
          seenAccounts.add(ledger.accountId);
        }
      }

      // Create ledger entries with calculated balances
      const ledgerEntries = await Promise.all(
        entries.map(async (entry) => {
          const account = accountMap.get(entry.accountId) as
            | { id: string; type: string }
            | undefined;

          if (!account) {
            throw new Error(`Account not found: ${entry.accountId}`);
          }

          // Calculate new balance based on account type
          const isDebitNormal = account.type === 'asset' || account.type === 'expense';
          const balanceChange = isDebitNormal
            ? entry.debit - entry.credit
            : entry.credit - entry.debit;

          // Get current balance from map (O(1) lookup)
          const currentBalance = balanceMap.get(entry.accountId) || 0;
          const newBalance = currentBalance + balanceChange;

          return tx.ledger.create({
            data: {
              cooperativeId,
              accountId: entry.accountId,
              journalEntryId: journalEntry.id,
              debit: new Prisma.Decimal(entry.debit),
              credit: new Prisma.Decimal(entry.credit),
              balance: new Prisma.Decimal(newBalance),
            },
          });
        })
      );

      const result = { journalEntry, ledgers: ledgerEntries };

      // Execute after hooks
      await hooks.execute('JournalEntry', 'afterCreate', result, context);
      await hooks.execute('JournalEntry', 'onCreate', result, context);
      await hooks.execute('JournalEntry', 'onSubmit', result, context);

      return result;
    });
  }

  /**
   * Post transaction (alias for createJournalEntry)
   */
  async postTransaction(
    cooperativeId: string,
    description: string,
    entries: Array<{ accountId: string; debit: number; credit: number }>,
    date?: Date,
    userId?: string
  ) {
    return this.createJournalEntry(cooperativeId, description, entries, date, userId);
  }

  /**
   * Generate account code automatically
   */
  async generateAccountCode(
    cooperativeId: string,
    type: string,
    subType: string = '00',
    branch: string = '00'
  ): Promise<string> {
    await this.validateTenant(cooperativeId);
    return generateAccountCode(cooperativeId, type, subType, branch);
  }

  /**
   * Get or create account by code, name, and type
   */
  async getOrCreateAccount(
    cooperativeId: string,
    code: string,
    name: string,
    type: string,
    parentId?: string
  ): Promise<string> {
    await this.validateTenant(cooperativeId);
    return getOrCreateAccount(cooperativeId, code, name, type, parentId);
  }

  /**
   * Set Product GL Mapping
   */
  async setProductGLMap(
    cooperativeId: string,
    productType: 'loan' | 'saving',
    productId: string,
    mapping: {
      principalGLCode?: string;
      interestIncomeGLCode?: string;
      penaltyIncomeGLCode?: string;
      depositGLCode?: string;
      interestExpenseGLCode?: string;
    }
  ) {
    await this.validateTenant(cooperativeId);

    // Verify product exists
    if (productType === 'loan') {
      const product = await this.prisma.loanProduct.findUnique({
        where: { id: productId, cooperativeId },
      });
      if (!product) throw new Error('Loan product not found');
    } else {
      const product = await this.prisma.savingProduct.findUnique({
        where: { id: productId, cooperativeId },
      });
      if (!product) throw new Error('Saving product not found');
    }

    // Verify GL codes exist and match product type
    if (productType === 'loan') {
      if (mapping.principalGLCode) {
        const account = await this.prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.principalGLCode, type: 'asset' },
        });
        if (!account)
          throw new Error(
            `Principal GL account ${mapping.principalGLCode} not found or not an asset`
          );
      }
      if (mapping.interestIncomeGLCode) {
        const account = await this.prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.interestIncomeGLCode, type: 'income' },
        });
        if (!account)
          throw new Error(
            `Interest Income GL account ${mapping.interestIncomeGLCode} not found or not income`
          );
      }
      if (mapping.penaltyIncomeGLCode) {
        const account = await this.prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.penaltyIncomeGLCode, type: 'income' },
        });
        if (!account)
          throw new Error(
            `Penalty Income GL account ${mapping.penaltyIncomeGLCode} not found or not income`
          );
      }
    } else {
      if (mapping.depositGLCode) {
        const account = await this.prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.depositGLCode, type: 'liability' },
        });
        if (!account)
          throw new Error(
            `Deposit GL account ${mapping.depositGLCode} not found or not a liability`
          );
      }
      if (mapping.interestExpenseGLCode) {
        const account = await this.prisma.chartOfAccounts.findFirst({
          where: { cooperativeId, code: mapping.interestExpenseGLCode, type: 'expense' },
        });
        if (!account)
          throw new Error(
            `Interest Expense GL account ${mapping.interestExpenseGLCode} not found or not expense`
          );
      }
    }

    return this.prisma.productGLMap.upsert({
      where: {
        cooperativeId_productType_productId: {
          cooperativeId,
          productType,
          productId,
        },
      },
      create: {
        cooperativeId,
        productType,
        productId,
        principalGLCode: mapping.principalGLCode || null,
        interestIncomeGLCode: mapping.interestIncomeGLCode || null,
        penaltyIncomeGLCode: mapping.penaltyIncomeGLCode || null,
        depositGLCode: mapping.depositGLCode || null,
        interestExpenseGLCode: mapping.interestExpenseGLCode || null,
      },
      update: {
        principalGLCode: mapping.principalGLCode || null,
        interestIncomeGLCode: mapping.interestIncomeGLCode || null,
        penaltyIncomeGLCode: mapping.penaltyIncomeGLCode || null,
        depositGLCode: mapping.depositGLCode || null,
        interestExpenseGLCode: mapping.interestExpenseGLCode || null,
      },
    });
  }

  /**
   * Get Product GL Mapping
   */
  async getProductGLMap(cooperativeId: string, productType: 'loan' | 'saving', productId: string) {
    await this.validateTenant(cooperativeId);
    return this.prisma.productGLMap.findUnique({
      where: {
        cooperativeId_productType_productId: {
          cooperativeId,
          productType,
          productId,
        },
      },
    });
  }

  /**
   * Loan Repayment Entry
   */
  async loanRepaymentEntry(
    cooperativeId: string,
    loanProductId: string,
    memberLoanAccountCode: string,
    principalAmount: number,
    interestAmount: number,
    penaltyAmount: number = 0,
    cashAccountCode: string = '00-10100-01-00001',
    description?: string,
    userId?: string
  ) {
    await this.validateTenant(cooperativeId);

    // Get product GL mapping
    const glMap = await this.getProductGLMap(cooperativeId, 'loan', loanProductId);
    if (!glMap || !glMap.principalGLCode || !glMap.interestIncomeGLCode) {
      throw new Error(
        'Product GL mapping not found. Please configure GL accounts for this loan product.'
      );
    }

    // Verify accounts exist
    const [memberLoanAccount, cashAccount, interestIncomeAccount] = await Promise.all([
      this.prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: memberLoanAccountCode,
          type: 'asset',
        },
      }),
      this.prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: cashAccountCode,
          type: 'asset',
        },
      }),
      this.prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: glMap.interestIncomeGLCode,
          type: 'income',
        },
      }),
    ]);

    if (!memberLoanAccount) {
      throw new Error(`Member loan account ${memberLoanAccountCode} not found or not an asset`);
    }
    if (!cashAccount) {
      throw new Error(`Cash account ${cashAccountCode} not found`);
    }
    if (!interestIncomeAccount) {
      throw new Error(`Interest income account ${glMap.interestIncomeGLCode} not found`);
    }

    // Prepare entries
    const entries: Array<{ accountId: string; debit: number; credit: number }> = [
      {
        accountId: cashAccount.id,
        debit: principalAmount + interestAmount + penaltyAmount,
        credit: 0,
      },
      {
        accountId: memberLoanAccount.id,
        debit: 0,
        credit: principalAmount,
      },
      {
        accountId: interestIncomeAccount.id,
        debit: 0,
        credit: interestAmount,
      },
    ];

    // Add penalty entry if applicable
    if (penaltyAmount > 0) {
      if (!glMap.penaltyIncomeGLCode) {
        throw new Error(
          'Penalty amount provided but penalty GL account not configured for this product'
        );
      }
      const penaltyAccount = await this.prisma.chartOfAccounts.findFirst({
        where: {
          cooperativeId,
          code: glMap.penaltyIncomeGLCode,
          type: 'income',
        },
      });
      if (!penaltyAccount) {
        throw new Error(`Penalty income account ${glMap.penaltyIncomeGLCode} not found`);
      }
      entries.push({
        accountId: penaltyAccount.id,
        debit: 0,
        credit: penaltyAmount,
      });
    }

    const entryDescription =
      description ||
      `Loan Repayment - Principal: ${principalAmount}, Interest: ${interestAmount}${penaltyAmount > 0 ? `, Penalty: ${penaltyAmount}` : ''}`;

    return this.createJournalEntry(cooperativeId, entryDescription, entries, undefined, userId);
  }

  /**
   * Calculate Net Profit
   */
  async calculateNetProfit(
    cooperativeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netProfit: number;
    period: { start: Date; end: Date };
  }> {
    await this.validateTenant(cooperativeId);

    const end = endDate || new Date();
    const start = startDate || new Date(new Date().getFullYear(), 0, 1);

    const [incomeAccounts, expenseAccounts] = await Promise.all([
      this.prisma.chartOfAccounts.findMany({
        where: {
          cooperativeId,
          code: { startsWith: '4' },
          type: 'income',
          isActive: true,
        },
        include: {
          ledgerEntries: {
            where: {
              createdAt: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      }),
      this.prisma.chartOfAccounts.findMany({
        where: {
          cooperativeId,
          code: { startsWith: '5' },
          type: 'expense',
          isActive: true,
        },
        include: {
          ledgerEntries: {
            where: {
              createdAt: {
                gte: start,
                lte: end,
              },
            },
          },
        },
      }),
    ]);

    let totalIncome = 0;
    for (const account of incomeAccounts) {
      for (const entry of account.ledgerEntries) {
        totalIncome += Number(entry.credit) - Number(entry.debit);
      }
    }

    let totalExpenses = 0;
    for (const account of expenseAccounts) {
      for (const entry of account.ledgerEntries) {
        totalExpenses += Number(entry.debit) - Number(entry.credit);
      }
    }

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      period: { start, end },
    };
  }

  /**
   * Get Account Balance as of a specific date
   */
  async getAccountBalanceAsOf(accountId: string, asOfDate: Date): Promise<number> {
    const account = await this.prisma.chartOfAccounts.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new Error('Account not found');
    }

    const latestLedger = await this.prisma.ledger.findFirst({
      where: {
        accountId,
        createdAt: {
          lte: asOfDate,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return latestLedger ? Number(latestLedger.balance) : 0;
  }

  /**
   * Generate Main Financial Report
   */
  async generateMainReport(cooperativeId: string, fiscalYear?: string, month?: string) {
    await this.validateTenant(cooperativeId);

    const [assets, liabilities, income, expenses] = await Promise.all([
      this.getChartOfAccounts(cooperativeId, 'asset'),
      this.getChartOfAccounts(cooperativeId, 'liability'),
      this.getChartOfAccounts(cooperativeId, 'income'),
      this.getChartOfAccounts(cooperativeId, 'expense'),
    ]);

    const calculateTotal = (accounts: Array<{ isGroup: boolean; balance?: number | null }>) => {
      return accounts
        .filter((acc) => !acc.isGroup)
        .reduce((sum, acc) => sum + (acc.balance || 0), 0);
    };

    const totalAssets = calculateTotal(assets);
    const totalLiabilities = calculateTotal(liabilities);
    const totalIncome = calculateTotal(income);
    const totalExpenses = calculateTotal(expenses);

    return {
      fiscalYear: fiscalYear || 'Current',
      month: month || 'All',
      summary: {
        assets: {
          total: totalAssets,
          count: assets.filter((acc) => !acc.isGroup).length,
        },
        liabilities: {
          total: totalLiabilities,
          count: liabilities.filter((acc) => !acc.isGroup).length,
        },
        income: {
          total: totalIncome,
          count: income.filter((acc) => !acc.isGroup).length,
        },
        expenses: {
          total: totalExpenses,
          count: expenses.filter((acc) => !acc.isGroup).length,
        },
      },
      netWorth: totalAssets - totalLiabilities,
      netIncome: totalIncome - totalExpenses,
      details: {
        assets: assets
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
        liabilities: liabilities
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
        income: income
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
        expenses: expenses
          .filter((acc) => !acc.isGroup)
          .map((acc) => ({
            code: acc.code,
            name: acc.name,
            balance: acc.balance || 0,
          })),
      },
    };
  }

  // Re-export utility functions for backward compatibility
  async postShareCapital(
    cooperativeId: string,
    amount: number,
    memberId: string,
    memberNumber: string,
    sharePrice: number,
    shares: number,
    paymentMode: 'CASH' | 'BANK' | 'SAVING' = 'CASH',
    bankAccountId?: string,
    savingAccountId?: string,
    date?: Date
  ) {
    return postShareCapitalUtil(
      cooperativeId,
      amount,
      memberId,
      memberNumber,
      sharePrice,
      shares,
      paymentMode,
      bankAccountId,
      savingAccountId,
      date
    );
  }

  async postShareReturn(
    cooperativeId: string,
    amount: number,
    memberId: string,
    memberNumber: string,
    shares: number,
    paymentMode: 'CASH' | 'BANK' = 'CASH',
    bankAccountId?: string,
    date?: Date
  ) {
    return postShareReturnUtil(
      cooperativeId,
      amount,
      memberId,
      memberNumber,
      shares,
      paymentMode,
      bankAccountId,
      date
    );
  }

  async postEntryFee(
    cooperativeId: string,
    amount: number,
    memberId: string,
    memberNumber: string,
    date?: Date
  ) {
    return postEntryFeeUtil(cooperativeId, amount, memberId, memberNumber, date);
  }

  async getCurrentSharePrice(cooperativeId: string, defaultPrice: number = 100): Promise<number> {
    return getCurrentSharePriceUtil(cooperativeId, defaultPrice);
  }

  /**
   * Reverse Journal Entry
   */
  async reverseJournalEntry(
    cooperativeId: string,
    journalEntryId: string,
    userId?: string,
    remarks?: string
  ) {
    await this.validateTenant(cooperativeId);

    return this.handleTransaction(async (tx) => {
      // 1. Get original entry with ledgers
      const originalEntry = await tx.journalEntry.findUnique({
        where: { id: journalEntryId, cooperativeId },
        include: {
          ledgers: true,
        },
      });

      if (!originalEntry) {
        throw new Error('Journal entry not found');
      }

      // Check if already reversed (naive check via description or if we had metadata)
      // Ideally we should have a 'relatedEntryId' but for now we proceed.
      // We can check if there's another entry that says "Reversal of {entryNumber}"
      const potentialReversal = await tx.journalEntry.findFirst({
        where: {
          cooperativeId,
          description: { contains: `Reversal of ${originalEntry.entryNumber}` },
        },
      });

      if (potentialReversal) {
        throw new Error(
          `Journal entry ${originalEntry.entryNumber} appears to be already reversed by ${potentialReversal.entryNumber}`
        );
      }

      // 2. Prepare reversal entries (Swap Debit/Credit)
      const reversalEntries: Array<{ accountId: string; debit: number; credit: number }> =
        originalEntry.ledgers.map((ledger: Ledger) => ({
          accountId: ledger.accountId,
          debit: Number(ledger.credit), // Swap
          credit: Number(ledger.debit), // Swap
        }));

      // 3. Create new Journal Entry
      const description = `Reversal of ${originalEntry.entryNumber}: ${remarks || originalEntry.description}`;

      // We reuse createJournalEntry logic but contextually it's a reversal
      // Since createJournalEntry is on 'this', we need to call it.
      // However, we are inside a transaction `tx`. handleTransaction wraps everything.
      // createJournalEntry also calls handleTransaction. We cannot nest handleTransaction if it doesn't support it.
      // BaseController.handleTransaction usually supports nesting if implemented correctly, OR we just use the logic here.
      // To be safe and avoid nesting issues if not supported, we implement creation logic directly here using `tx`.

      // Validate double-entry (debits must equal credits)
      const totalDebits = reversalEntries.reduce((sum, e) => sum + e.debit, 0);
      const totalCredits = reversalEntries.reduce((sum, e) => sum + e.credit, 0);

      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(
          `Double-entry validation failed for reversal: Debits (${totalDebits}) must equal Credits (${totalCredits})`
        );
      }

      // Generate entry number
      const year = new Date().getFullYear();
      const entryCount = await tx.journalEntry.count({
        where: {
          cooperativeId,
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const entryNumber = `JE-${year}-${String(entryCount + 1).padStart(6, '0')}`;

      // Create Reversal JE
      const journalEntry = await tx.journalEntry.create({
        data: {
          cooperativeId,
          entryNumber,
          description,
          date: new Date(),
        },
      });

      // Fetch accounts and latest ledgers (for balance calculation)
      const accountIds = reversalEntries.map((e) => e.accountId);
      const latestLedgers = await tx.ledger.findMany({
        where: {
          accountId: { in: accountIds },
          cooperativeId,
        },
        orderBy: { createdAt: 'desc' },
      });

      const balanceMap = new Map<string, number>();
      const seenAccounts = new Set<string>();
      for (const l of latestLedgers) {
        if (!seenAccounts.has(l.accountId)) {
          balanceMap.set(l.accountId, Number(l.balance));
          seenAccounts.add(l.accountId);
        }
      }

      // Create Ledger Entries
      // We also need account types to know increasing/decreasing logic?
      // Actually, standard accounting: Debit increases Asset/Expense, Credit increases Liability/Income/Equity.
      // Balance = Prev + (Debit - Credit) * (IsDebitNormal ? 1 : -1)
      const accounts = await tx.chartOfAccounts.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, type: true },
      });
      const accountTypeMap = new Map(
        accounts.map((a: { id: string; type: string }) => [a.id, a.type])
      );

      await Promise.all(
        reversalEntries.map(async (entry) => {
          const type = accountTypeMap.get(entry.accountId);
          const isDebitNormal = type === 'asset' || type === 'expense';
          const balanceChange = isDebitNormal
            ? entry.debit - entry.credit
            : entry.credit - entry.debit;

          const currentBalance = balanceMap.get(entry.accountId) || 0;
          const newBalance = currentBalance + balanceChange;

          return tx.ledger.create({
            data: {
              cooperativeId,
              accountId: entry.accountId,
              journalEntryId: journalEntry.id,
              debit: new Prisma.Decimal(entry.debit),
              credit: new Prisma.Decimal(entry.credit),
              balance: new Prisma.Decimal(newBalance),
            },
          });
        })
      );

      // Add audit log context or hooks?
      // hooks.execute('JournalEntry', 'onReverse', ...)

      return journalEntry;
    });
  }
}

// Export singleton instance
export const accountingController = new AccountingController();
