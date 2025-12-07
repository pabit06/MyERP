import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasAnyRole,
  type Permission,
} from '../lib/permissions.js';

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
 * Middleware to require a specific permission
 */
export const requirePermission = (permission: Permission) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const hasAccess = await hasPermission(req.user.userId, req.user.tenantId, permission);

      if (!hasAccess) {
        res.status(403).json({ error: `Access denied: Requires permission '${permission}'` });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require any of the specified permissions
 */
export const requireAnyPermission = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const hasAccess = await hasAnyPermission(req.user.userId, req.user.tenantId, permissions);

      if (!hasAccess) {
        res.status(403).json({
          error: `Access denied: Requires one of permissions: ${permissions.join(', ')}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require all of the specified permissions
 */
export const requireAllPermissions = (permissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const hasAccess = await hasAllPermissions(req.user.userId, req.user.tenantId, permissions);

      if (!hasAccess) {
        res.status(403).json({
          error: `Access denied: Requires all permissions: ${permissions.join(', ')}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to require any of the specified roles
 */
export const requireAnyRole = (roleNames: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const hasAccess = await hasAnyRole(req.user.userId, req.user.tenantId, roleNames);

      if (!hasAccess) {
        res.status(403).json({
          error: `Access denied: Requires one of roles: ${roleNames.join(', ')}`,
        });
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
      if (req.user && req.user.tenantId) {
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
