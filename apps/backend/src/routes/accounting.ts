import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { accountingController } from '../controllers/AccountingController.js';
import { AccountingService } from '../services/accounting.js';
import { prisma } from '../lib/prisma.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

/**
 * POST /api/accounting/seed
 * Trigger the default NFRS Chart of Accounts seeding
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Cooperative ID is required' });
    }

    const userId = req.user!.userId;
    const result = await accountingController.seedDefaultAccounts(tenantId, userId);
    res.json(result);
  } catch (error: any) {
    console.error('Seeding error:', error);
    res.status(500).json({ error: error.message || 'Failed to seed accounts' });
  }
});

/**
 * GET /api/accounting/accounts
 * Fetch Chart of Accounts (optionally filtered by type)
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { type } = req.query;

    const accounts = await accountingController.getChartOfAccounts(
      tenantId,
      type as string | undefined
    );

    res.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/accounting/accounts
 * Create a new account head
 * Supports new code structure: BB-GGGGG-SS-SSSSS
 * If code is not provided, it will be auto-generated
 */
router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { code, name, type, parentId, isGroup, nfrsMap, subType, branch, autoGenerateCode } =
      req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and Type are required' });
    }

    const userId = req.user!.userId;
    const account = await accountingController.createAccount(
      {
        cooperativeId: tenantId,
        code,
        name,
        type,
        parentId,
        isGroup,
        nfrsMap,
        subType,
        branch,
        autoGenerateCode,
      },
      userId
    );

    res.status(201).json(account);
  } catch (error: any) {
    console.error('Create account error:', error);
    res.status(400).json({ error: error.message || 'Failed to create account' });
  }
});

/**
 * POST /api/accounting/accounts/generate-code
 * Generate a new account code automatically
 */
router.post('/accounts/generate-code', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { type, subType = '00', branch = '00' } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type is required' });
    }

    const code = await accountingController.generateAccountCode(tenantId, type, subType, branch);
    res.json({ code });
  } catch (error: any) {
    console.error('Generate code error:', error);
    res.status(400).json({ error: error.message || 'Failed to generate account code' });
  }
});

/**
 * PUT /api/accounting/accounts/:id
 * Update an account
 */
router.put('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { name, isActive, code, type, parentId, isGroup, nfrsMap } = req.body;

    const userId = req.user!.userId;
    const account = await accountingController.updateAccount(
      id,
      tenantId,
      {
        name,
        isActive,
        code,
        type,
        parentId,
        isGroup,
        nfrsMap,
      },
      userId
    );

    res.json(account);
  } catch (error: any) {
    console.error('Update account error:', error);
    res.status(400).json({ error: error.message || 'Failed to update account' });
  }
});

/**
 * DELETE /api/accounting/accounts/:id
 * Delete an account (only if unused)
 */
router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const userId = req.user!.userId;
    await accountingController.deleteAccount(id, tenantId, userId);

    res.json({ message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('Delete account error:', error);
    res.status(400).json({ error: error.message || 'Failed to delete account' });
  }
});

/**
 * POST /api/accounting/product-gl-map
 * Create or update Product GL Mapping
 * Maps loan/saving products to their corresponding GL accounts
 */
router.post('/product-gl-map', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { productType, productId, mapping } = req.body;

    if (!productType || !productId || !mapping) {
      return res.status(400).json({ error: 'productType, productId, and mapping are required' });
    }

    if (productType !== 'loan' && productType !== 'saving') {
      return res.status(400).json({ error: 'productType must be "loan" or "saving"' });
    }

    const result = await accountingController.setProductGLMap(
      tenantId,
      productType,
      productId,
      mapping
    );

    res.json(result);
  } catch (error: any) {
    console.error('Set product GL map error:', error);
    res.status(400).json({ error: error.message || 'Failed to set product GL mapping' });
  }
});

/**
 * GET /api/accounting/product-gl-map/:productType/:productId
 * Get Product GL Mapping
 */
router.get('/product-gl-map/:productType/:productId', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { productType, productId } = req.params;

    if (productType !== 'loan' && productType !== 'saving') {
      return res.status(400).json({ error: 'productType must be "loan" or "saving"' });
    }

    const mapping = await accountingController.getProductGLMap(
      tenantId,
      productType as 'loan' | 'saving',
      productId
    );

    if (!mapping) {
      return res.status(404).json({ error: 'Product GL mapping not found' });
    }

    res.json(mapping);
  } catch (error: any) {
    console.error('Get product GL map error:', error);
    res.status(500).json({ error: error.message || 'Failed to get product GL mapping' });
  }
});

/**
 * POST /api/accounting/loan-repayment
 * Create loan repayment journal entry
 * Dr. Cash, Cr. Loan Principal, Cr. Interest Income, Cr. Penalty (optional)
 */
router.post('/loan-repayment', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const {
      loanProductId,
      memberLoanAccountCode,
      principalAmount,
      interestAmount,
      penaltyAmount = 0,
      cashAccountCode = '00-10100-01-00001',
      description,
    } = req.body;

    if (
      !loanProductId ||
      !memberLoanAccountCode ||
      principalAmount === undefined ||
      interestAmount === undefined
    ) {
      return res.status(400).json({
        error:
          'loanProductId, memberLoanAccountCode, principalAmount, and interestAmount are required',
      });
    }

    const userId = req.user!.userId;
    const result = await accountingController.loanRepaymentEntry(
      tenantId,
      loanProductId,
      memberLoanAccountCode,
      parseFloat(principalAmount),
      parseFloat(interestAmount),
      parseFloat(penaltyAmount || 0),
      cashAccountCode,
      description,
      userId
    );

    res.status(201).json(result);
  } catch (error: any) {
    console.error('Loan repayment entry error:', error);
    res.status(400).json({ error: error.message || 'Failed to create loan repayment entry' });
  }
});

/**
 * GET /api/accounting/net-profit
 * Calculate Net Profit (Total Income - Total Expenses)
 * Query params: startDate (optional), endDate (optional)
 */
router.get('/net-profit', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const result = await accountingController.calculateNetProfit(tenantId, start, end);

    res.json(result);
  } catch (error: any) {
    console.error('Calculate net profit error:', error);
    res.status(500).json({ error: error.message || 'Failed to calculate net profit' });
  }
});

/**
 * GET /api/accounting/accounts/:id/statement
 * Get ledger statement for a specific account
 */
router.get('/accounts/:id/statement', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const account = await prisma.chartOfAccounts.findFirst({
      where: {
        id,
        cooperativeId: tenantId,
        isActive: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Build date filter
    const dateFilter: any = {
      accountId: id,
      cooperativeId: tenantId,
    };

    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate as string);
      }
    }

    // Get ledger entries
    const ledgerEntries = await prisma.ledger.findMany({
      where: dateFilter,
      orderBy: { createdAt: 'asc' },
      include: {
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            description: true,
            date: true,
          },
        },
        transaction: {
          select: {
            id: true,
            transactionNumber: true,
            description: true,
            date: true,
          },
        },
      },
    });

    // Get opening balance (balance before startDate if provided)
    let openingBalance = 0;
    if (startDate) {
      const openingLedger = await prisma.ledger.findFirst({
        where: {
          accountId: id,
          cooperativeId: tenantId,
          createdAt: { lt: new Date(startDate as string) },
        },
        orderBy: { createdAt: 'desc' },
      });
      openingBalance = openingLedger ? Number(openingLedger.balance) : 0;
    }

    res.json({
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
      },
      openingBalance,
      entries: ledgerEntries.map((entry) => ({
        id: entry.id,
        date: entry.createdAt,
        entryNumber:
          entry.journalEntry?.entryNumber || entry.transaction?.transactionNumber || 'N/A',
        description:
          entry.journalEntry?.description || entry.transaction?.description || 'Ledger Entry',
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: Number(entry.balance),
      })),
    });
  } catch (error: any) {
    console.error('Get ledger statement error:', error);
    res.status(500).json({ error: error.message || 'Failed to get ledger statement' });
  }
});

/**
 * GET /api/accounting/journal-entries/:entryNumber
 * Get journal entry details by entry number (e.g., JE-2025-000031)
 */
router.get('/journal-entries/:entryNumber', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { entryNumber } = req.params;

    const journalEntry = await prisma.journalEntry.findFirst({
      where: {
        entryNumber,
        cooperativeId: tenantId,
      },
      include: {
        ledgers: {
          include: {
            account: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!journalEntry) {
      return res.status(404).json({ error: 'Journal entry not found' });
    }

    // Calculate totals
    const totalDebit = journalEntry.ledgers.reduce(
      (sum, ledger) => sum + Number(ledger.debit),
      0
    );
    const totalCredit = journalEntry.ledgers.reduce(
      (sum, ledger) => sum + Number(ledger.credit),
      0
    );

    res.json({
      journalEntry: {
        id: journalEntry.id,
        entryNumber: journalEntry.entryNumber,
        description: journalEntry.description,
        date: journalEntry.date,
        createdAt: journalEntry.createdAt,
      },
      entries: journalEntry.ledgers.map((ledger) => ({
        id: ledger.id,
        account: {
          id: ledger.account.id,
          code: ledger.account.code,
          name: ledger.account.name,
          type: ledger.account.type,
        },
        debit: Number(ledger.debit),
        credit: Number(ledger.credit),
        balance: Number(ledger.balance),
      })),
      totals: {
        debit: totalDebit,
        credit: totalCredit,
      },
    });
  } catch (error: any) {
    console.error('Get journal entry error:', error);
    res.status(500).json({ error: error.message || 'Failed to get journal entry' });
  }
});

/**
 * POST /api/accounting/migrate-old-accounts
 * Migrate old account codes to NFRS format
 * Consolidates balances from old accounts (1001, 3001, 4001) to NFRS accounts
 */
router.post('/migrate-old-accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    if (!tenantId) {
      return res.status(400).json({ error: 'Cooperative ID is required' });
    }

    const result = await AccountingService.migrateOldAccountsToNFRS(tenantId);
    res.json(result);
  } catch (error: any) {
    console.error('Migration error:', error);
    res.status(500).json({ error: error.message || 'Failed to migrate accounts' });
  }
});

export default router;
