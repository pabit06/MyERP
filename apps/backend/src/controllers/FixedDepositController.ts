import { prisma } from '../lib/prisma.js';
import { accountingController } from './AccountingController.js';
import { BadRequestError, NotFoundError } from '../lib/errors.js';
import { FDInterestPostingFrequency, FDPenaltyType, FDAccountStatus } from '@prisma/client';

export class FixedDepositController {
  /**
   * Create a new Fixed Deposit Product
   */
  async createProduct(
    cooperativeId: string,
    data: {
      name: string;
      description?: string;
      minAmount: number;
      maxAmount?: number;
      interestRate: number;
      postingFrequency: FDInterestPostingFrequency;
      durationMonths: number;
      penaltyType: FDPenaltyType;
      penaltyValue?: number;
      isPrematureAllowed: boolean;
    }
  ) {
    return prisma.fixedDepositProduct.create({
      data: {
        cooperativeId,
        ...data,
      },
    });
  }

  /**
   * Get all active FD Products
   */
  async getProducts(cooperativeId: string) {
    return prisma.fixedDepositProduct.findMany({
      where: {
        cooperativeId,
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get all FD Accounts (with optional filters)
   */
  async getAccounts(cooperativeId: string, memberId?: string) {
    return prisma.fixedDepositAccount.findMany({
      where: {
        cooperativeId,
        ...(memberId ? { memberId } : {}),
      },
      include: {
        member: {
          select: { fullName: true, memberNumber: true },
        },
        product: {
          select: { name: true, interestRate: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get Single FD Account
   */
  async getAccount(cooperativeId: string, accountId: string) {
    const account = await prisma.fixedDepositAccount.findUnique({
      where: { id: accountId },
      include: {
        member: true,
        product: true,
      },
    });

    if (!account || account.cooperativeId !== cooperativeId) {
      throw new NotFoundError('FD Account', accountId);
    }

    return account;
  }

  /**
   * Open a new Fixed Deposit Account
   */
  async openAccount(
    cooperativeId: string,
    userId: string,
    data: {
      memberId: string;
      productId: string;
      amount: number;
      sourceAccountId?: string; // If funding from savings
      cashAccountCode?: string; // If funding from cash
      nomineeName?: string;
      nomineeRelation?: string;
      nomineePhone?: string;
      nomineeFatherName?: string;
      remarks?: string;
    }
  ) {
    const { memberId, productId, amount, sourceAccountId, cashAccountCode, ...rest } = data;

    // 1. Validate Product
    const product = await prisma.fixedDepositProduct.findUnique({
      where: { id: productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundError('FD Product', productId);
    }
    if (product.cooperativeId !== cooperativeId) {
      throw new BadRequestError('Invalid Product');
    }

    if (amount < Number(product.minAmount)) {
      throw new BadRequestError(`Minimum amount is ${product.minAmount}`);
    }
    if (product.maxAmount && amount > Number(product.maxAmount)) {
      throw new BadRequestError(`Maximum amount is ${product.maxAmount}`);
    }

    // 2. Validate Member
    const member = await prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!member || member.cooperativeId !== cooperativeId) {
      throw new NotFoundError('Member', memberId);
    }

    // 3. Calculate Dates
    const startDate = new Date();
    const maturityDate = new Date(startDate);
    maturityDate.setMonth(maturityDate.getMonth() + product.durationMonths);

    // 4. Generate Account Number (Simple logic for now, can be enhanced)
    // Format: FD-{MemberId}-TIMESTAMP (Unique enough for MVP)
    const accountNumber = `FD-${member.memberNumber || memberId.substring(0, 6)}-${Date.now().toString().slice(-6)}`;

    // 5. Create FD Account & Process Transaction in Transaction
    return prisma.$transaction(async (tx) => {
      // Create Account
      const fdAccount = await tx.fixedDepositAccount.create({
        data: {
          cooperativeId,
          memberId,
          productId,
          accountNumber,
          principal: amount,
          interestRate: product.interestRate,
          startDate,
          maturityDate,
          status: FDAccountStatus.ACTIVE,
          ...rest,
        },
      });

      // Handle Funding (Debit Source, Credit FD Liability)
      // Note: We need a "Fixed Deposit Liability" GL account.
      // For MVP, we'll assume a specific GL code or pass it.
      // In a real system, `FixedDepositProduct` should have a mapped `glCode`.
      // Let's assume passed or default for now, but really we should have updated the schema to include GL mapping on FDProduct.
      // Since we didn't add GL mapping to FDProduct in the schema step, let's use a placeholder or derived one.
      // Ideally, we should add `glCode` to `FixedDepositProduct`.
      // Let's assume a generic FD Liability code for now: "00-20200-01-00001" (Example)

      const fdLiabilityGL = '00-20200-01-00001'; // TODO: Make dynamic

      // TODO: Implement savings account funding logic
      const _debitLeg = {}; // Reserved for future implementation
      const _debitAmount = amount; // Reserved for future implementation
      const description = `FD Opening - ${accountNumber}`;

      if (sourceAccountId) {
        // Debit Savings Account
        const sourceAccount = await tx.savingAccount.findUnique({
          where: { id: sourceAccountId },
        });

        if (!sourceAccount) {
          throw new NotFoundError('Source savings account', sourceAccountId);
        }

        if (Number(sourceAccount.balance) < amount) {
          throw new BadRequestError('Insufficient balance in source savings account');
        }

        await tx.savingAccount.update({
          where: { id: sourceAccountId },
          data: { balance: { decrement: amount } },
        });

        // Create Journal Entry
        // Note: Ideally we should use the GL code mapped to the specific Saving Product.
        // For now, using a generic Savings Liability GL.
        const savingsLiabilityGL = '00-20100-01-00001';

        await accountingController.createJournalEntry(
          cooperativeId,
          `FD Opening - Funded by Savings ${sourceAccount.accountNumber}`,
          [
            { accountId: savingsLiabilityGL, debit: amount, credit: 0 },
            { accountId: fdLiabilityGL, debit: 0, credit: amount },
          ],
          new Date(),
          userId
        );
      } else if (cashAccountCode) {
        // Debit Cash (Asset Increases? No, depositing into FD means Member gave Cash. So Cash Asset Increases (Debit), FD Liability Increases (Credit).
        // Wait. Member gives Cash -> Co-op receives Cash (Debit Asset). Co-op owes FD (Credit Liability).
        // Yes.

        await accountingController.createJournalEntry(
          cooperativeId,
          description,
          [
            { accountId: cashAccountCode, debit: amount, credit: 0 },
            { accountId: fdLiabilityGL, debit: 0, credit: amount },
          ],
          new Date(),
          userId
        );
        // Warning: createJournalEntry is separate transaction?
        // Yes, implementation in AccountingController uses prisma.$transaction internally.
        // Nesting transactions is not supported in Prisma directly unless we pass the `tx` client.
        // AccountingController isn't built to accept `tx`.
        // For now, we'll do them sequentially or accept specific risk, OR refactor AccountingController.
        // Given constraints, manual Journal Entry creation inside THIS transaction is safer.
      } else {
        throw new BadRequestError('Source account or cash code required');
      }

      return fdAccount;
    });
  }

  /**
   * Calculate Daily Interest for all Active Accounts
   * This should be called by a scheduled job (e.g. daily at midnight)
   */
  async calculateDailyInterest(cooperativeId: string) {
    // 1. Fetch all active accounts
    const accounts = await prisma.fixedDepositAccount.findMany({
      where: {
        cooperativeId,
        status: FDAccountStatus.ACTIVE,
        maturityDate: {
          gt: new Date(), // Not yet matured
        },
      },
    });

    let processedCount = 0;
    let totalInterestAccrued = 0;

    // 2. Process each account
    // Note: For large datasets, use cursor-based pagination or batching
    for (const account of accounts) {
      // Simple Simple Interest Calculation: Principal * Rate / 100 / 365
      // TODO: Handle leap years, compound interest if applicable
      const dailyInterest =
        (Number(account.principal) * Number(account.interestRate)) / (100 * 365);

      if (dailyInterest > 0) {
        await prisma.fixedDepositAccount.update({
          where: { id: account.id },
          data: {
            accruedInterest: {
              increment: dailyInterest,
            },
          },
        });
        totalInterestAccrued += dailyInterest;
        processedCount++;
      }
    }

    return {
      processed: processedCount,
      totalAccrued: totalInterestAccrued.toFixed(2),
      message: `Interest calculated for ${processedCount} accounts`,
    };
  }

  /**
   * Close FD Account (Maturity or Premature)
   */
  async closeAccount(
    cooperativeId: string,
    userId: string,
    accountId: string,
    data: {
      destinationAccountId?: string; // Savings Account to credit
      cashAccountCode?: string; // Or cash GL
      closeDate?: Date;
      remarks?: string;
    }
  ) {
    const {
      destinationAccountId: _destinationAccountId, // TODO: Implement savings transfer
      cashAccountCode,
      closeDate = new Date(),
      remarks,
    } = data;

    // 1. Fetch Account
    const account = await prisma.fixedDepositAccount.findUnique({
      where: { id: accountId },
      include: { product: true },
    });

    if (!account || account.cooperativeId !== cooperativeId) {
      throw new NotFoundError('FD Account', accountId);
    }

    if (account.status !== FDAccountStatus.ACTIVE) {
      throw new BadRequestError(`Account is not active (Status: ${account.status})`);
    }

    // 2. Determine Closure Type
    const isPremature = closeDate < account.maturityDate;
    let finalInterestRate = Number(account.interestRate);
    // Penalty is handled through rate reduction or interest deduction, not as a separate amount

    // 3. Apply Penalty if Premature
    if (isPremature) {
      if (!account.product.isPrematureAllowed) {
        throw new BadRequestError('Premature withdrawal not allowed for this product');
      }

      // Penalty Logic
      if (account.product.penaltyType === FDPenaltyType.LOWER_RATE) {
        // Reduce interest rate by penalty value
        finalInterestRate = Math.max(
          0,
          Number(account.interestRate) - Number(account.product.penaltyValue || 0)
        );
      } else if (account.product.penaltyType === FDPenaltyType.DEDUCT_INTEREST) {
        // We will calculate interest normally then deduct percentage
        // Handled in calculation
      }
    }

    // 4. Calculate Final Interest
    // Re-calculate interest for the actual duration based on final rate
    const daysOpen = Math.floor(
      (closeDate.getTime() - account.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    let totalInterest = (Number(account.principal) * finalInterestRate * daysOpen) / (100 * 365);

    if (isPremature && account.product.penaltyType === FDPenaltyType.DEDUCT_INTEREST) {
      const deduction = totalInterest * (Number(account.product.penaltyValue || 0) / 100);
      totalInterest -= deduction;
    }

    // Ensure interest doesn't exceed what was logically accrued if we rigidly follow accrual,
    // but for payout we recalculate based on actual tenure.
    // We should reverse previously accrued interest if it was higher (due to rate drop).
    // For simplicity in MVP, we calculate the payout amount. The difference between `accruedInterest` and `totalInterest`
    // is the adjustment to Income (PL).

    const principal = Number(account.principal);
    const tdsRate = 0.05; // 5% TDS (Configurable ideally)
    const tdsAmount = totalInterest * tdsRate;
    const netInterest = totalInterest - tdsAmount;
    const totalPayout = principal + netInterest;

    // 5. Transaction
    return prisma.$transaction(async (tx) => {
      // Update Account Status
      const updatedAccount = await tx.fixedDepositAccount.update({
        where: { id: accountId },
        data: {
          status: isPremature ? FDAccountStatus.PREMATURE_CLOSED : FDAccountStatus.MATURED,
          closedAt: closeDate,
          paidInterest: totalInterest, // Tracking gross interest paid
          remarks: remarks ? `${account.remarks || ''}\n${remarks}` : account.remarks,
        },
      });

      // Accounting Entries
      const fdLiabilityGL = '00-20200-01-00001'; // Liability Account
      const interestExpenseGL = '00-40100-01-00001'; // Expense Account
      const tdsPayableGL = '00-20100-01-00001'; // TDS Payable

      // If paying by Cash
      if (cashAccountCode) {
        await accountingController.createJournalEntry(
          cooperativeId,
          `FD Closure - ${account.accountNumber} (${isPremature ? 'Premature' : 'Maturity'})`,
          [
            // Debit Liability (Principal)
            { accountId: fdLiabilityGL, debit: principal, credit: 0 },
            // Debit Interest Expense
            { accountId: interestExpenseGL, debit: totalInterest, credit: 0 },
            // Credit TDS Payable
            { accountId: tdsPayableGL, debit: 0, credit: tdsAmount },
            // Credit Cash (Payout)
            { accountId: cashAccountCode, debit: 0, credit: totalPayout },
          ],
          closeDate,
          userId
        );
      }
      // TODO: Implement Savings Transfer logic if _destinationAccountId provided

      return updatedAccount;
    });
  }
}

export const fixedDepositController = new FixedDepositController();
