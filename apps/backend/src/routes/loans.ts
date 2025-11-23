import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { isModuleEnabled } from '../middleware/module.js';
import { loansController } from '../controllers/LoansController.js';

const router = Router();

// All routes require authentication, tenant context, and CBS module
router.use(authenticate);
router.use(requireTenant);
router.use(isModuleEnabled('cbs'));

/**
 * GET /api/loans/products
 * Get all loan products for the cooperative
 */
router.get('/products', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const products = await loansController.getProducts(tenantId);
    res.json({ products });
  } catch (error: any) {
    console.error('Get loan products error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/loans/products
 * Create a new loan product
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
      maxLoanAmount,
      minLoanAmount,
      maxTenureMonths,
      minTenureMonths,
      processingFee,
    } = req.body;

    const product = await loansController.createProduct(
      {
        cooperativeId: tenantId,
        code,
        name,
        description,
        interestRate,
        maxLoanAmount,
        minLoanAmount,
        maxTenureMonths,
        minTenureMonths,
        processingFee,
      },
      userId
    );

    res.status(201).json({ product });
  } catch (error: any) {
    console.error('Create loan product error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/loans/applications
 * Get all loan applications for the cooperative
 */
router.get('/applications', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { memberId, status } = req.query;

    const applications = await loansController.getApplications(tenantId, {
      memberId: memberId as string | undefined,
      status: status as string | undefined,
    });

    res.json({ applications });
  } catch (error: any) {
    console.error('Get loan applications error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/loans/applications
 * Create a new loan application
 */
router.post('/applications', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { memberId, productId, loanAmount, tenureMonths, purpose, applicationNumber } = req.body;

    const application = await loansController.createApplication(
      {
        cooperativeId: tenantId,
        memberId,
        productId,
        loanAmount,
        tenureMonths,
        purpose,
        applicationNumber,
      },
      userId
    );

    res.status(201).json({ application });
  } catch (error: any) {
    console.error('Create loan application error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/loans/applications/:id/approve
 * Approve a loan application and generate EMI schedule
 */
router.post('/applications/:id/approve', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { id } = req.params;
    const { disbursedDate } = req.body;

    const result = await loansController.approveApplication(
      id,
      tenantId,
      {
        disbursedDate: disbursedDate ? new Date(disbursedDate) : undefined,
      },
      userId
    );

    res.json({
      message: 'Loan application approved and EMI schedule generated',
      application: result.application,
      emiSchedule: result.emiSchedules,
    });
  } catch (error: any) {
    console.error('Approve loan application error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/loans/applications/:id/emi-schedule
 * Get EMI schedule for a loan application
 */
router.get('/applications/:id/emi-schedule', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { id } = req.params;

    const emiSchedule = await loansController.getEMISchedule(id, tenantId);
    res.json({ emiSchedule });
  } catch (error: any) {
    console.error('Get EMI schedule error:', error);
    res.status(400).json({ error: error.message || 'Internal server error' });
  }
});

export default router;
