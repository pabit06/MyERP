import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireTenant } from '../middleware/tenant.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { dashboardController } from '../controllers/DashboardController.js';

const router: Router = Router();

router.use(authenticate);
router.use(requireTenant);

/**
 * GET /api/dashboard/stats
 * Get high-level dashboard statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const stats = await dashboardController.getQuickStats(tenantId || req.currentCooperativeId!);
    res.json(stats);
  })
);

/**
 * GET /api/dashboard/recent-activity
 * Get recent system activities
 */
router.get(
  '/recent-activity',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const activities = await dashboardController.getRecentActivity(
      tenantId || req.currentCooperativeId!
    );
    res.json(activities);
  })
);

/**
 * GET /api/dashboard/member-growth
 * Get member growth chart data
 */
router.get(
  '/member-growth',
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId;
    const growth = await dashboardController.getMemberGrowth(tenantId || req.currentCooperativeId!);
    res.json(growth);
  })
);

export default router;
