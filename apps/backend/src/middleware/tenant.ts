import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure tenantId is available in the request
 * This should be used after authentication middleware
 * System admins can bypass this requirement
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  // System admins can bypass tenant requirement
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  if (!req.user?.tenantId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }
  next();
};

/**
 * Middleware to require system admin access
 */
export const requireSystemAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.isSystemAdmin) {
    res.status(403).json({ error: 'System admin access required' });
    return;
  }
  next();
};
