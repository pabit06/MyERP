import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { createJournalEntry, getOrCreateAccount } from './accounting.js';
import { amlEvents, AML_EVENTS } from '../lib/events.js';

export const SavingsService = {
  /**
   * Deposit amount to saving account
   * Creates journal entry: Dr Cash, Cr Saving Deposit Liability
   */
  async deposit(data: {
    accountId: string;
    amount: number;
    cooperativeId: string;
    userId?: string;
    date?: Date;
    paymentMode?: 'CASH' | 'BANK' | 'SAVING';
    cashAccountCode?: string;
    bankAccountId?: string;
    remarks?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Get saving account with product
      const account = await tx.savingAccount.findUnique({
        where: { id: data.accountId },
        include: {
          product: true,
          member: {
            select: {
              id: true,
              memberNumber: true,
              fullName: true,
            },
          },
        },
      });

      if (!account) {
        throw new Error('Saving account not found');
      }

      if (account.cooperativeId !== data.cooperativeId) {
        throw new Error('Account does not belong to this cooperative');
      }

      if (account.status !== 'active') {
        throw new Error('Account is not active');
      }

      const amount = parseFloat(String(data.amount));
      if (amount <= 0) {
        throw new Error('Deposit amount must be greater than 0');
      }

      // Get product GL mapping
      const glMap = await tx.productGLMap.findUnique({
        where: {
          cooperativeId_productType_productId: {
            cooperativeId: data.cooperativeId,
            productType: 'saving',
            productId: account.productId,
          },
        },
      });

      if (!glMap || !glMap.depositGLCode) {
        throw new Error(
          'Product GL mapping not found. Please configure GL accounts for this saving product.'
        );
      }

      // Get deposit GL account
      const depositAccount = await tx.chartOfAccounts.findFirst({
        where: {
          cooperativeId: data.cooperativeId,
          code: glMap.depositGLCode,
          type: 'liability',
          isActive: true,
        },
      });

      if (!depositAccount) {
        throw new Error(`Deposit GL account ${glMap.depositGLCode} not found`);
      }

      // Determine cash/bank account
      let cashAccountId: string;
      if (data.paymentMode === 'BANK' && data.bankAccountId) {
        cashAccountId = data.bankAccountId;
      } else {
        // Default to cash account
        const cashAccountCode = data.cashAccountCode || '00-10100-01-00001';
        const cashAccount = await tx.chartOfAccounts.findFirst({
          where: {
            cooperativeId: data.cooperativeId,
            code: cashAccountCode,
            type: 'asset',
            isActive: true,
          },
        });

        if (!cashAccount) {
          throw new Error(`Cash account ${cashAccountCode} not found`);
        }
        cashAccountId = cashAccount.id;
      }

      // Update account balance
      const newBalance = Number(account.balance) + amount;
      await tx.savingAccount.update({
        where: { id: data.accountId },
        data: {
          balance: newBalance,
        },
      });

      // Create journal entry: Dr Cash, Cr Saving Deposit
      const description =
        data.remarks ||
        `Deposit to Saving Account ${account.accountNumber} - Member ${account.member.memberNumber || account.memberId}`;

      const { journalEntry } = await createJournalEntry(
        data.cooperativeId,
        description,
        [
          {
            accountId: cashAccountId,
            debit: amount,
            credit: 0,
          },
          {
            accountId: depositAccount.id,
            debit: 0,
            credit: amount,
          },
        ],
        data.date
      );

      // Emit AML event
      amlEvents.emit(AML_EVENTS.ON_DEPOSIT, {
        memberId: account.memberId,
        amount: amount,
        currency: 'NPR',
        isCash: data.paymentMode !== 'BANK',
        transactionId: journalEntry.id,
        occurredOn: data.date || new Date(),
        transactionType: 'deposit',
        counterpartyType: 'MEMBER',
      });

      return {
        account: await tx.savingAccount.findUnique({
          where: { id: data.accountId },
          include: {
            product: true,
            member: {
              select: {
                id: true,
                memberNumber: true,
                fullName: true,
              },
            },
          },
        }),
        journalEntry,
      };
    });
  },

  /**
   * Withdraw amount from saving account
   * Creates journal entry: Dr Saving Deposit Liability, Cr Cash
   */
  async withdraw(data: {
    accountId: string;
    amount: number;
    cooperativeId: string;
    userId?: string;
    date?: Date;
    paymentMode?: 'CASH' | 'BANK';
    cashAccountCode?: string;
    bankAccountId?: string;
    remarks?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Get saving account with product
      const account = await tx.savingAccount.findUnique({
        where: { id: data.accountId },
        include: {
          product: true,
          member: {
            select: {
              id: true,
              memberNumber: true,
              fullName: true,
            },
          },
        },
      });

      if (!account) {
        throw new Error('Saving account not found');
      }

      if (account.cooperativeId !== data.cooperativeId) {
        throw new Error('Account does not belong to this cooperative');
      }

      if (account.status !== 'active') {
        throw new Error('Account is not active');
      }

      const amount = parseFloat(String(data.amount));
      if (amount <= 0) {
        throw new Error('Withdrawal amount must be greater than 0');
      }

      // Check balance and minimum balance
      const currentBalance = Number(account.balance);
      const minimumBalance = Number(account.product.minimumBalance || 0);
      const newBalance = currentBalance - amount;

      if (newBalance < minimumBalance) {
        throw new Error(
          `Withdrawal would violate minimum balance requirement. Current: ${currentBalance}, Minimum: ${minimumBalance}, After withdrawal: ${newBalance}`
        );
      }

      if (currentBalance < amount) {
        throw new Error('Insufficient balance');
      }

      // Get product GL mapping
      const glMap = await tx.productGLMap.findUnique({
        where: {
          cooperativeId_productType_productId: {
            cooperativeId: data.cooperativeId,
            productType: 'saving',
            productId: account.productId,
          },
        },
      });

      if (!glMap || !glMap.depositGLCode) {
        throw new Error(
          'Product GL mapping not found. Please configure GL accounts for this saving product.'
        );
      }

      // Get deposit GL account
      const depositAccount = await tx.chartOfAccounts.findFirst({
        where: {
          cooperativeId: data.cooperativeId,
          code: glMap.depositGLCode,
          type: 'liability',
          isActive: true,
        },
      });

      if (!depositAccount) {
        throw new Error(`Deposit GL account ${glMap.depositGLCode} not found`);
      }

      // Determine cash/bank account
      let cashAccountId: string;
      if (data.paymentMode === 'BANK' && data.bankAccountId) {
        cashAccountId = data.bankAccountId;
      } else {
        // Default to cash account
        const cashAccountCode = data.cashAccountCode || '00-10100-01-00001';
        const cashAccount = await tx.chartOfAccounts.findFirst({
          where: {
            cooperativeId: data.cooperativeId,
            code: cashAccountCode,
            type: 'asset',
            isActive: true,
          },
        });

        if (!cashAccount) {
          throw new Error(`Cash account ${cashAccountCode} not found`);
        }
        cashAccountId = cashAccount.id;
      }

      // Update account balance
      await tx.savingAccount.update({
        where: { id: data.accountId },
        data: {
          balance: newBalance,
        },
      });

      // Create journal entry: Dr Saving Deposit, Cr Cash
      const description =
        data.remarks ||
        `Withdrawal from Saving Account ${account.accountNumber} - Member ${account.member.memberNumber || account.memberId}`;

      const { journalEntry } = await createJournalEntry(
        data.cooperativeId,
        description,
        [
          {
            accountId: depositAccount.id,
            debit: amount,
            credit: 0,
          },
          {
            accountId: cashAccountId,
            debit: 0,
            credit: amount,
          },
        ],
        data.date
      );

      // Emit AML event
      amlEvents.emit(AML_EVENTS.ON_WITHDRAWAL, {
        memberId: account.memberId,
        amount: amount,
        currency: 'NPR',
        isCash: data.paymentMode !== 'BANK',
        transactionId: journalEntry.id,
        occurredOn: data.date || new Date(),
        transactionType: 'withdrawal',
        counterpartyType: 'MEMBER',
      });

      return {
        account: await tx.savingAccount.findUnique({
          where: { id: data.accountId },
          include: {
            product: true,
            member: {
              select: {
                id: true,
                memberNumber: true,
                fullName: true,
              },
            },
          },
        }),
        journalEntry,
      };
    });
  },

  /**
   * Calculate daily interest for all active saving accounts
   * Updates interestAccrued based on daily balance
   */
  async calculateDailyInterest(cooperativeId: string, asOfDate?: Date) {
    const calculationDate = asOfDate || new Date();
    calculationDate.setHours(0, 0, 0, 0);

    const accounts = await prisma.savingAccount.findMany({
      where: {
        cooperativeId,
        status: 'active',
      },
      include: {
        product: true,
      },
    });

    const results = [];

    for (const account of accounts) {
      // Get last calculation date or account opening date
      const lastCalcDate = account.lastInterestCalculatedDate
        ? new Date(account.lastInterestCalculatedDate)
        : new Date(account.openedDate);
      lastCalcDate.setHours(0, 0, 0, 0);

      // Skip if already calculated for this date
      if (lastCalcDate.getTime() >= calculationDate.getTime()) {
        continue;
      }

      // Calculate days between last calculation and today
      const daysDiff = Math.floor(
        (calculationDate.getTime() - lastCalcDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 0) {
        continue;
      }

      // Get balance (use current balance for simplicity, or could use average daily balance)
      const balance = Number(account.balance);
      const interestRate = Number(account.product.interestRate);
      const dailyRate = interestRate / 365 / 100; // Convert annual % to daily decimal

      // Calculate interest for the period
      const interestForPeriod = balance * dailyRate * daysDiff;

      // Update interest accrued
      const newInterestAccrued = Number(account.interestAccrued) + interestForPeriod;

      await prisma.savingAccount.update({
        where: { id: account.id },
        data: {
          interestAccrued: newInterestAccrued,
          lastInterestCalculatedDate: calculationDate,
        },
      });

      results.push({
        accountId: account.id,
        accountNumber: account.accountNumber,
        balance,
        daysDiff,
        interestForPeriod,
        totalInterestAccrued: newInterestAccrued,
      });
    }

    return results;
  },

  /**
   * Post interest to saving accounts
   * Calculates TDS (6%), posts interest expense, and credits saving accounts
   */
  async postInterest(data: {
    cooperativeId: string;
    productId?: string; // Optional: post for specific product only
    userId?: string;
    date?: Date;
    interestExpenseGLCode?: string;
    tdsPayableGLCode?: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // First, calculate daily interest up to posting date
      const postingDate = data.date || new Date();
      postingDate.setHours(0, 0, 0, 0);

      // Get accounts to post interest for
      const whereClause: any = {
        cooperativeId: data.cooperativeId,
        status: 'active',
        interestAccrued: { gt: 0 }, // Only accounts with accrued interest
      };

      if (data.productId) {
        whereClause.productId = data.productId;
      }

      const accounts = await tx.savingAccount.findMany({
        where: whereClause,
        include: {
          product: true,
          member: {
            select: {
              id: true,
              memberNumber: true,
              fullName: true,
            },
          },
        },
      });

      if (accounts.length === 0) {
        return { message: 'No accounts with accrued interest found', posted: [] };
      }

      // Get or create GL accounts
      const interestExpenseCode =
        data.interestExpenseGLCode || '00-50100-01-00001'; // Default interest expense account
      const tdsPayableCode = data.tdsPayableGLCode || '00-20200-01-00001'; // Default TDS payable account

      const interestExpenseAccount = await tx.chartOfAccounts.findFirst({
        where: {
          cooperativeId: data.cooperativeId,
          code: interestExpenseCode,
          type: 'expense',
          isActive: true,
        },
      });

      if (!interestExpenseAccount) {
        throw new Error(`Interest expense account ${interestExpenseCode} not found`);
      }

      const tdsPayableAccount = await tx.chartOfAccounts.findFirst({
        where: {
          cooperativeId: data.cooperativeId,
          code: tdsPayableCode,
          type: 'liability',
          isActive: true,
        },
      });

      if (!tdsPayableAccount) {
        throw new Error(`TDS payable account ${tdsPayableCode} not found`);
      }

      const postedAccounts = [];
      let totalInterest = 0;
      let totalTDS = 0;

      // Get product GL mappings for deposit accounts
      const productGLMaps = new Map<string, string>();
      for (const account of accounts) {
        if (!productGLMaps.has(account.productId)) {
          const glMap = await tx.productGLMap.findUnique({
            where: {
              cooperativeId_productType_productId: {
                cooperativeId: data.cooperativeId,
                productType: 'saving',
                productId: account.productId,
              },
            },
          });

          if (glMap?.depositGLCode) {
            productGLMaps.set(account.productId, glMap.depositGLCode);
          }
        }
      }

      // Process each account
      for (const account of accounts) {
        const interestAccrued = Number(account.interestAccrued);
        if (interestAccrued <= 0) {
          continue;
        }

        // Calculate TDS (6% standard rate, or product-specific rate)
        const taxRate = account.product.isTaxApplicable
          ? Number(account.product.taxRate || 6.0)
          : 0;
        const tdsAmount = (interestAccrued * taxRate) / 100;
        const netInterest = interestAccrued - tdsAmount;

        // Get deposit GL account for this product
        const depositGLCode = productGLMaps.get(account.productId);
        if (!depositGLCode) {
          throw new Error(
            `Deposit GL mapping not found for product ${account.product.code}. Please configure GL accounts.`
          );
        }

        const depositAccount = await tx.chartOfAccounts.findFirst({
          where: {
            cooperativeId: data.cooperativeId,
            code: depositGLCode,
            type: 'liability',
            isActive: true,
          },
        });

        if (!depositAccount) {
          throw new Error(`Deposit GL account ${depositGLCode} not found`);
        }

        // Update account: add net interest to balance, reset interestAccrued
        const newBalance = Number(account.balance) + netInterest;
        await tx.savingAccount.update({
          where: { id: account.id },
          data: {
            balance: newBalance,
            interestAccrued: 0,
            lastInterestPostedDate: postingDate,
          },
        });

        // Create journal entry: Dr Interest Expense, Cr TDS Payable, Cr Saving Deposit
        const description = `Interest posting for Saving Account ${account.accountNumber} - Member ${account.member.memberNumber || account.memberId} (Gross: ${interestAccrued.toFixed(2)}, TDS: ${tdsAmount.toFixed(2)}, Net: ${netInterest.toFixed(2)})`;

        await createJournalEntry(
          data.cooperativeId,
          description,
          [
            {
              accountId: interestExpenseAccount.id,
              debit: interestAccrued,
              credit: 0,
            },
            {
              accountId: tdsPayableAccount.id,
              debit: 0,
              credit: tdsAmount,
            },
            {
              accountId: depositAccount.id,
              debit: 0,
              credit: netInterest,
            },
          ],
          postingDate
        );

        totalInterest += interestAccrued;
        totalTDS += tdsAmount;

        postedAccounts.push({
          accountId: account.id,
          accountNumber: account.accountNumber,
          memberNumber: account.member.memberNumber,
          grossInterest: interestAccrued,
          tdsAmount,
          netInterest,
          newBalance,
        });
      }

      return {
        message: `Interest posted for ${postedAccounts.length} accounts`,
        totalInterest,
        totalTDS,
        totalNetInterest: totalInterest - totalTDS,
        posted: postedAccounts,
      };
    });
  },
};

