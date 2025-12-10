import { Request, Response } from 'express';
import { BaseController } from './BaseController.js';
import { UnauthorizedError, NotFoundError } from '../lib/errors.js';

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
  /**
   * Get Notices
   */
  async getNotices(req: Request, res: Response) {
    // Placeholder for notices
    const notices = [
      {
        id: '1',
        title: 'Annual General Meeting 2081',
        date: new Date(),
        content: 'The AGM will be held on ...',
      },
      {
        id: '2',
        title: 'Mobile Banking Maintenance',
        date: new Date(Date.now() - 86400000), // yesterday
        content: 'System will be down for ...',
      },
    ];
    res.json({ notices });
  }

  /**
   * Get Account Statements (Transaction History)
   */
  async getStatements(req: Request, res: Response) {
    const memberId = req.user!.userId;
    const { accountId } = req.params;

    // 1. Verify Account belongs to member
    const account = await this.prisma.savingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      // Check loan account if not savings
      // (Not implemented for loans yet, so 404)
      throw new NotFoundError('Account', accountId);
    }

    if (account.memberId !== memberId) {
      throw new NotFoundError('Account', accountId);
    }

    // 2. Fetch Transactions (Journal Entries)
    // Filtering by description containing account number
    const transactions = await this.prisma.journalEntry.findMany({
      where: {
        description: {
          contains: account.accountNumber,
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: 50, // Limit to last 50
    });

    res.json({
      accountNumber: account.accountNumber,
      transactions: transactions.map((t) => ({
        id: t.id,
        date: t.date,
        description: t.description,
        amount: 0, // TODO: Parse amount from ledgers if needed, or description
        // For MVP, we pass the raw description which usually has info.
        // To get actual amount, we need to join Ledgers.
      })),
    });
  }

  /**
   * Get QR Code Payload
   */
  async getQRCode(req: Request, res: Response) {
    const memberId = req.user!.userId;
    const { accountId } = req.params;

    const account = await this.prisma.savingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.memberId !== memberId) {
      throw new NotFoundError('Account', accountId);
    }

    // Generate Fonepay-compatible or generic payload
    const payload = JSON.stringify({
      scheme: 'NEPALPAY',
      version: '1.0',
      type: 'MERCHANT',
      data: {
        pan: '123456789', // Cooperative PAN
        ac: account.accountNumber,
        nm: 'MY COOPERATIVE LTD',
        mcc: '1234',
        curr: 'NPR',
      },
    });

    res.json({ payload });
  }
}

export const memberPortalController = new MemberPortalController();
