import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Middleware to require a specific role
 */
export const requireRole = (roleName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: {
          role: true,
        },
      });

      if (!user || !user.role) {
        res.status(403).json({ error: 'Access denied: No role assigned' });
        return;
      }

      // Check if role name matches (case-insensitive)
      if (user.role.name.toLowerCase() !== roleName.toLowerCase()) {
        res.status(403).json({ error: `Access denied: Requires ${roleName} role` });
        return;
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to log sensitive data access
 */
export const logSensitiveDataAccess = (endpoint: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user) {
        await prisma.sensitiveDataAccessLog.create({
          data: {
            userId: req.user.userId,
            cooperativeId: req.user.tenantId,
            endpoint,
            accessedAt: new Date(),
          },
        });
      }
      next();
    } catch (error) {
      console.error('Error logging sensitive data access:', error);
      // Don't block the request if logging fails
      next();
    }
  };
};
