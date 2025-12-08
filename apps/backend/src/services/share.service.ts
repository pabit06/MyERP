import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { postShareCapital, postShareReturn, getCurrentSharePrice } from './accounting.js';
import { amlEvents, AML_EVENTS } from '../lib/events.js';

export const ShareService = {
  /**
   * Issue New Shares (Purchase)
   */
  async issueShares(data: {
    cooperativeId: string;
    memberId: string;
    kitta: number;
    date: Date;
    paymentMode: 'CASH' | 'BANK' | 'SAVING';
    bankAccountId?: string; // If mode is BANK (Chart of Accounts ID of the Bank)
    savingAccountId?: string; // If mode is SAVING (ID of member's saving account)
    remarks?: string;
    userId: string;
    fromAdvancePayment?: boolean; // If true, payment was already received as advance
    amount?: number; // Optional: exact amount to use (if provided, overrides kitta * unitPrice calculation)
  }) {
    return prisma.$transaction(async (tx) => {
      // Get current unit price
      const unitPrice = await getCurrentSharePrice(data.cooperativeId, 100);
      // Use provided amount if available, otherwise calculate from kitta
      const totalAmount = data.amount !== undefined ? data.amount : data.kitta * unitPrice;

      // Verify member belongs to cooperative
      const member = await tx.member.findUnique({
        where: { id: data.memberId },
        select: { id: true, memberNumber: true, cooperativeId: true },
      });

      if (!member || member.cooperativeId !== data.cooperativeId) {
        throw new Error('Member not found or does not belong to this cooperative');
      }

      // 1. Get or Create Share Account
      let account = await tx.shareAccount.findUnique({
        where: { memberId: data.memberId },
      });

      // 2. Validate 20% share purchase limit
      // Calculate total share capital (sum of all share accounts)
      const totalShareCapitalResult = await tx.shareAccount.aggregate({
        where: { cooperativeId: data.cooperativeId },
        _sum: { totalAmount: true },
      });
      const totalShareCapital = totalShareCapitalResult._sum.totalAmount || 0;

      // Get member's current share amount
      const memberCurrentAmount = account ? account.totalAmount : 0;
      const memberNewAmount = memberCurrentAmount + totalAmount;

      // Check if purchase would exceed 20% of total share capital
      if (totalShareCapital > 0) {
        const memberPercentage = (memberNewAmount / totalShareCapital) * 100;
        if (memberPercentage > 20) {
          const maxAllowedAmount = totalShareCapital * 0.2;
          const maxAllowedKitta = Math.floor(maxAllowedAmount / unitPrice);
          throw new Error(
            `Share purchase limit exceeded. Maximum allowed: 20% of total share capital (Rs. ${maxAllowedAmount.toLocaleString()} or ${maxAllowedKitta} kitta). ` +
              `Current total share capital: Rs. ${totalShareCapital.toLocaleString()}. ` +
              `After this purchase, you would own Rs. ${memberNewAmount.toLocaleString()} (${memberPercentage.toFixed(2)}%).`
          );
        }
      }

      if (!account) {
        // Generate Certificate No
        const count = await tx.shareAccount.count({
          where: { cooperativeId: data.cooperativeId },
        });
        const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

        account = await tx.shareAccount.create({
          data: {
            cooperativeId: data.cooperativeId,
            memberId: data.memberId,
            certificateNo: certNo,
            unitPrice,
            totalKitta: 0,
            totalAmount: 0,
            issueDate: data.date,
          },
        });
      }

      // 2. If Payment Mode is SAVING, deduct from the member's saving account
      if (data.paymentMode === 'SAVING' && data.savingAccountId) {
        const savingAccount = await tx.savingAccount.findUnique({
          where: { id: data.savingAccountId },
        });

        if (!savingAccount || savingAccount.memberId !== data.memberId) {
          throw new Error('Saving account not found or does not belong to member');
        }

        if (Number(savingAccount.balance) < totalAmount) {
          throw new Error('Insufficient balance in saving account');
        }

        await tx.savingAccount.update({
          where: { id: data.savingAccountId },
          data: { balance: { decrement: totalAmount } },
        });
      }

      // 3. Create Accounting Journal Entry
      const journalId = await postShareCapital(
        data.cooperativeId,
        totalAmount,
        data.memberId,
        member.memberNumber || data.memberId,
        unitPrice,
        data.kitta,
        data.paymentMode,
        data.bankAccountId,
        data.savingAccountId,
        data.date,
        data.fromAdvancePayment || false
      );

      // 4. Generate transaction number
      const year = data.date.getFullYear();
      const txCount = await tx.shareTransaction.count({
        where: {
          cooperativeId: data.cooperativeId,
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const transactionNo = `SHARE-${year}-${String(txCount + 1).padStart(4, '0')}`;

      // 5. Create Share Transaction Record
      const shareTx = await tx.shareTransaction.create({
        data: {
          accountId: account.id,
          memberId: data.memberId,
          cooperativeId: data.cooperativeId,
          transactionNo,
          type: 'PURCHASE',
          date: data.date,
          kitta: data.kitta,
          amount: totalAmount,
          paymentMode: data.paymentMode,
          journalId,
          remarks: data.remarks,
          createdBy: data.userId,
        },
      });

      // 6. Update Share Account Balance
      await tx.shareAccount.update({
        where: { id: account.id },
        data: {
          totalKitta: { increment: data.kitta },
          totalAmount: { increment: totalAmount },
          unitPrice, // Update to latest price
        },
      });

      // 7. Emit AML event for share purchase
      amlEvents.emit(AML_EVENTS.ON_SHARE_PURCHASE, {
        memberId: data.memberId,
        amount: totalAmount,
        currency: 'NPR',
        isCash: data.paymentMode === 'CASH',
        transactionId: shareTx.id,
        occurredOn: data.date,
        transactionType: 'share_purchase',
        counterpartyType: 'MEMBER',
      });

      return shareTx;
    });
  },

  /**
   * Return Shares (Surrender)
   */
  async returnShares(data: {
    cooperativeId: string;
    memberId: string;
    kitta: number;
    date: Date;
    paymentMode: 'CASH' | 'BANK'; // How we pay them back
    bankAccountId?: string;
    remarks?: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.shareAccount.findUnique({
        where: { memberId: data.memberId },
      });

      if (!account || account.cooperativeId !== data.cooperativeId) {
        throw new Error('Share account not found');
      }

      if (account.totalKitta < data.kitta) {
        throw new Error('Insufficient share balance');
      }

      const unitPrice = account.unitPrice;
      const returnAmount = data.kitta * unitPrice;

      // Verify member
      const member = await tx.member.findUnique({
        where: { id: data.memberId },
        select: { memberNumber: true },
      });

      // 1. Create Accounting Journal Entry (Reverse)
      const journalId = await postShareReturn(
        data.cooperativeId,
        returnAmount,
        data.memberId,
        member?.memberNumber || data.memberId,
        data.kitta,
        data.paymentMode,
        data.bankAccountId,
        data.date
      );

      // 2. Generate transaction number
      const year = data.date.getFullYear();
      const txCount = await tx.shareTransaction.count({
        where: {
          cooperativeId: data.cooperativeId,
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const transactionNo = `RET-${year}-${String(txCount + 1).padStart(4, '0')}`;

      // 3. Create Transaction
      const shareTx = await tx.shareTransaction.create({
        data: {
          accountId: account.id,
          memberId: data.memberId,
          cooperativeId: data.cooperativeId,
          transactionNo,
          type: 'RETURN',
          date: data.date,
          kitta: -data.kitta, // Negative for return
          amount: returnAmount,
          paymentMode: data.paymentMode,
          journalId,
          remarks: data.remarks,
          createdBy: data.userId,
        },
      });

      // 4. Update Balance
      await tx.shareAccount.update({
        where: { id: account.id },
        data: {
          totalKitta: { decrement: data.kitta },
          totalAmount: { decrement: returnAmount },
        },
      });

      return shareTx;
    });
  },

  /**
   * Transfer Shares between Members
   */
  async transferShares(data: {
    cooperativeId: string;
    fromMemberId: string;
    toMemberId: string;
    kitta: number;
    date: Date;
    remarks?: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      // Get from account
      const fromAccount = await tx.shareAccount.findUnique({
        where: { memberId: data.fromMemberId },
      });

      if (!fromAccount || fromAccount.cooperativeId !== data.cooperativeId) {
        throw new Error('From member share account not found');
      }

      if (fromAccount.totalKitta < data.kitta) {
        throw new Error('Insufficient shares to transfer');
      }

      // Get or create to account
      let toAccount = await tx.shareAccount.findUnique({
        where: { memberId: data.toMemberId },
      });

      if (!toAccount) {
        const count = await tx.shareAccount.count({
          where: { cooperativeId: data.cooperativeId },
        });
        const certNo = `CERT-${String(count + 1).padStart(6, '0')}`;

        toAccount = await tx.shareAccount.create({
          data: {
            cooperativeId: data.cooperativeId,
            memberId: data.toMemberId,
            certificateNo: certNo,
            unitPrice: fromAccount.unitPrice,
            totalKitta: 0,
            totalAmount: 0,
            issueDate: data.date,
          },
        });
      }

      const unitPrice = fromAccount.unitPrice;
      const transferAmount = data.kitta * unitPrice;

      // Generate transaction numbers
      const year = data.date.getFullYear();
      const txCount = await tx.shareTransaction.count({
        where: {
          cooperativeId: data.cooperativeId,
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });

      // Create transactions (debit from, credit to)
      const fromTx = await tx.shareTransaction.create({
        data: {
          accountId: fromAccount.id,
          memberId: data.fromMemberId,
          cooperativeId: data.cooperativeId,
          transactionNo: `TRF-${year}-${String(txCount + 1).padStart(4, '0')}-OUT`,
          type: 'TRANSFER',
          date: data.date,
          kitta: -data.kitta,
          amount: transferAmount,
          paymentMode: 'ADJUSTMENT',
          remarks: `Transfer to member ${data.toMemberId}. ${data.remarks || ''}`,
          createdBy: data.userId,
        },
      });

      const toTx = await tx.shareTransaction.create({
        data: {
          accountId: toAccount.id,
          memberId: data.toMemberId,
          cooperativeId: data.cooperativeId,
          transactionNo: `TRF-${year}-${String(txCount + 1).padStart(4, '0')}-IN`,
          type: 'TRANSFER',
          date: data.date,
          kitta: data.kitta,
          amount: transferAmount,
          paymentMode: 'ADJUSTMENT',
          remarks: `Transfer from member ${data.fromMemberId}. ${data.remarks || ''}`,
          createdBy: data.userId,
        },
      });

      // Update balances
      await tx.shareAccount.update({
        where: { id: fromAccount.id },
        data: {
          totalKitta: { decrement: data.kitta },
          totalAmount: { decrement: transferAmount },
        },
      });

      await tx.shareAccount.update({
        where: { id: toAccount.id },
        data: {
          totalKitta: { increment: data.kitta },
          totalAmount: { increment: transferAmount },
        },
      });

      return { fromTransaction: fromTx, toTransaction: toTx };
    });
  },

  /**
   * Issue Bonus Shares
   */
  async issueBonusShares(data: {
    cooperativeId: string;
    memberId: string;
    kitta: number;
    date: Date;
    remarks?: string;
    userId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const account = await tx.shareAccount.findUnique({
        where: { memberId: data.memberId },
      });

      if (!account || account.cooperativeId !== data.cooperativeId) {
        throw new Error('Share account not found');
      }

      const unitPrice = account.unitPrice;
      const bonusAmount = data.kitta * unitPrice;

      // Generate transaction number
      const year = data.date.getFullYear();
      const txCount = await tx.shareTransaction.count({
        where: {
          cooperativeId: data.cooperativeId,
          date: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const transactionNo = `BONUS-${year}-${String(txCount + 1).padStart(4, '0')}`;

      // Create transaction (no accounting entry for bonus - it's a capital adjustment)
      const shareTx = await tx.shareTransaction.create({
        data: {
          accountId: account.id,
          memberId: data.memberId,
          cooperativeId: data.cooperativeId,
          transactionNo,
          type: 'BONUS',
          date: data.date,
          kitta: data.kitta,
          amount: bonusAmount,
          paymentMode: 'ADJUSTMENT',
          remarks: data.remarks,
          createdBy: data.userId,
        },
      });

      // Update balance
      await tx.shareAccount.update({
        where: { id: account.id },
        data: {
          totalKitta: { increment: data.kitta },
          totalAmount: { increment: bonusAmount },
        },
      });

      return shareTx;
    });
  },
};
