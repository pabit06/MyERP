import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to ensure tenantId is available in the request
 * This should be used after authentication middleware
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user?.tenantId) {
    res.status(403).json({ error: 'Tenant context required' });
    return;
  }
  next();
};
