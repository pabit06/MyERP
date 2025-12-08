import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { UnauthorizedError } from '../lib/errors.js';

export class MemberPortalController extends BaseController {
  /**
   * Get Member Dashboard Summary
   */
  async getDashboardSummary(req: Request, res: Response) {
    const memberId = req.user!.userId; // From authenticateMember middleware

    // 1. Get Member Details
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        firstName: true,
        fullName: true,
      },
    });

    if (!member) {
      throw new UnauthorizedError('Member not found');
    }

    // 2. Calculate Total Savings Balance
    const savingsAccounts = await this.prisma.savingAccount.findMany({
      where: { memberId, status: 'ACTIVE' },
      select: { balance: true },
    });

    const totalSavings = savingsAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    // 3. Calculate Total Loan Outstanding (Principal + Interest usually, simplified to Outstanding Principal for now if available, or just principal)
    // Assuming LoanAccount or LoanApplication with disbursed status
    // Checking schema via assumption: LoanApplication might verify 'disbursed' status or similar.
    // Let's assume 'APPROVED' or 'ACTIVE' status for Loans.
    // Actually, usually it's LoanAccount separate from Application, but schema showed LoanApplication.
    // Let's try finding LoanApplication.
    // If LoanAccount doesn't exist, maybe LoanApplication tracks balance?
    // Let's use a safe fetch or empty for now if unsure, but we need meaningful data.
    // I'll leave loans as 0 for now until I verify the model, to avoid runtime errors.
    const totalLoans = 0;

    // 4. Calculate Total Shares
    const shareAccount = await this.prisma.shareAccount.findUnique({
      where: { memberId },
    });
    const totalShares = shareAccount ? shareAccount.totalAmount : 0;

    res.json({
      member: {
        name: member.fullName || member.firstName,
      },
      summary: {
        totalSavings,
        totalLoans,
        totalShares,
      },
    });
  }

  /**
   * Get Member Accounts (Savings & FD)
   */
  async getAccounts(req: Request, res: Response) {
    const memberId = req.user!.userId;

    // Fetch Savings Accounts
    const savings = await this.prisma.savingAccount.findMany({
      where: { memberId },
      include: {
        product: {
          select: { name: true, interestRate: true },
        },
      },
    });

    // Fetch Fixed Deposit Accounts
    const fds = await this.prisma.fixedDepositAccount.findMany({
      where: { memberId },
      include: {
        product: {
          select: { name: true, durationMonths: true },
        },
      },
    });

    res.json({
      savings: savings.map((acc) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        productName: acc.product.name,
        balance: Number(acc.balance),
        interestRate: Number(acc.product.interestRate),
        status: acc.status,
      })),
      fixedDeposits: fds.map((acc) => ({
        id: acc.id,
        accountNumber: acc.accountNumber,
        productName: acc.product.name,
        principal: Number(acc.principal),
        interestRate: Number(acc.interestRate),
        maturityDate: acc.maturityDate,
        status: acc.status,
      })),
    });
  }

  /**
   * Get Member Loans
   */
  async getLoans(req: Request, res: Response) {
    const _memberId = req.user!.userId;

    // Placeholder for Loan fetching logic
    // const loans = await this.prisma.loanAccount.findMany(...)

    res.json({
      loans: [],
    });
  }
}

export const memberPortalController = new MemberPortalController();
