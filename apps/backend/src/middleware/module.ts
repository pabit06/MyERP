import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { ModuleName } from '@myerp/shared-types';

/**
 * Middleware to check if a specific module is enabled for the tenant's subscription
 * This is the CRITICAL middleware mentioned in Phase 4 of the plan
 *
 * Usage:
 * router.get('/hrm/employees', authenticate, requireTenant, isModuleEnabled('hrm'), getEmployees);
 */
export const isModuleEnabled = (moduleName: ModuleName) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // System admins can access all modules
      if (req.user?.isSystemAdmin) {
        next();
        return;
      }

      if (!req.user?.tenantId) {
        res.status(403).json({ error: 'Tenant context required' });
        return;
      }

      const tenantId = req.user.tenantId;

      // Get the cooperative's active subscription
      const cooperative = await prisma.cooperative.findUnique({
        where: { id: tenantId },
        include: {
          subscription: {
            where: { status: 'active' },
            include: {
              plan: {
                select: {
                  enabledModules: true,
                },
              },
            },
          },
        },
      });

      if (!cooperative || !cooperative.subscription) {
        res.status(403).json({ error: 'No active subscription found' });
        return;
      }

      const enabledModules = (cooperative.subscription.plan.enabledModules as string[]) || [];

      if (!enabledModules.includes(moduleName)) {
        res.status(403).json({
          error: `Module '${moduleName}' is not enabled for your subscription plan`,
          requiredModule: moduleName,
          enabledModules,
        });
        return;
      }

      // Module is enabled, continue to the next middleware
      next();
    } catch (error) {
      console.error('Module check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};
