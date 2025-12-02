import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { savingsController } from '../controllers/SavingsController.js';

const router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * GET /api/savings/products
 * Get all saving products for the cooperative
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const products = await savingsController.getProducts(tenantId);
    res.json({ products });
  } catch (error: any) {
    console.error('Get saving products error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/savings/products
 * Create a new saving product
 */
router.post('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const {
      code,
      name,
      description,
      interestRate,
      minimumBalance,
      interestPostingFrequency,
      interestCalculationMethod,
      isTaxApplicable,
      taxRate,
    } = req.body;

    const product = await savingsController.createProduct(
      {
        cooperativeId: tenantId,
        code,
        name,
        description,
        interestRate,
        minimumBalance,
        interestPostingFrequency,
        interestCalculationMethod,
        isTaxApplicable,
        taxRate,
      },
      userId
    );

    res.status(201).json({ product });
  } catch (error: any) {
    console.error('Create saving product error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/savings/accounts
 * Get all saving accounts for the cooperative
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId, status } = req.query;

    const accounts = await savingsController.getAccounts(tenantId, {
      memberId: memberId as string | undefined,
      status: status as string | undefined,
    });

    res.json({ accounts });
  } catch (error: any) {
    console.error('Get saving accounts error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/savings/accounts
 * Create a new saving account
 */
router.post('/accounts', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { memberId, productId, accountNumber, initialDeposit, nominee } = req.body;

    const account = await savingsController.createAccount(
      {
        cooperativeId: tenantId,
        memberId,
        productId,
        accountNumber,
        initialDeposit,
        nominee,
      },
      userId
    );

    res.status(201).json({ account });
  } catch (error: any) {
    console.error('Create saving account error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/savings/accounts/:id
 * Get a specific saving account
 */
router.get('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const account = await savingsController.getAccount(id, tenantId);
    res.json({ account });
  } catch (error: any) {
    console.error('Get saving account error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/savings/accounts/:id/deposit
 * Deposit amount to saving account
 */
router.post('/accounts/:id/deposit', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount, paymentMode, cashAccountCode, bankAccountId, remarks, date } = req.body;

    const result = await savingsController.deposit(
      {
        accountId: id,
        amount,
        cooperativeId: tenantId,
        paymentMode,
        cashAccountCode,
        bankAccountId,
        remarks,
        date: date ? new Date(date) : undefined,
      },
      userId
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Deposit error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/savings/accounts/:id/withdraw
 * Withdraw amount from saving account
 */
router.post('/accounts/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount, paymentMode, cashAccountCode, bankAccountId, remarks, date } = req.body;

    const result = await savingsController.withdraw(
      {
        accountId: id,
        amount,
        cooperativeId: tenantId,
        paymentMode,
        cashAccountCode,
        bankAccountId,
        remarks,
        date: date ? new Date(date) : undefined,
      },
      userId
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Withdraw error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/savings/interest/calculate
 * Calculate daily interest for all active saving accounts
 */
router.post('/interest/calculate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { asOfDate } = req.body;

    const result = await savingsController.calculateInterest(
      tenantId,
      asOfDate ? new Date(asOfDate) : undefined
    );

    res.json({ success: true, results: result });
  } catch (error: any) {
    console.error('Calculate interest error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/savings/interest/post
 * Post interest to saving accounts
 */
router.post('/interest/post', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { productId, interestExpenseGLCode, tdsPayableGLCode, date } = req.body;

    const result = await savingsController.postInterest(
      {
        cooperativeId: tenantId,
        productId,
        interestExpenseGLCode,
        tdsPayableGLCode,
        date: date ? new Date(date) : undefined,
      },
      userId
    );

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Post interest error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
