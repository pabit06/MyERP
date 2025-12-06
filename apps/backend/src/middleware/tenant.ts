import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import { logger } from '../config/index.js';

/**
 * Extract cooperative ID from subdomain, header, or JWT token
 * Priority: X-Cooperative-Id header > subdomain > JWT token cooperativeId
 */
async function extractCooperativeId(req: Request): Promise<string | null> {
  // 1. Check X-Cooperative-Id header (for API clients)
  const headerCooperativeId = req.headers['x-cooperative-id'] as string | undefined;
  if (headerCooperativeId) {
    // Validate that the cooperative exists
    const cooperative = await prisma.cooperative.findUnique({
      where: { id: headerCooperativeId },
      select: { id: true },
    });
    if (cooperative) {
      return headerCooperativeId;
    }
    logger.warn(`Invalid cooperative ID in header: ${headerCooperativeId}`);
  }

  // 2. Extract from subdomain (for web clients)
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  if (subdomain && subdomain !== 'localhost' && subdomain !== 'www' && !subdomain.includes(':')) {
    const cooperative = await prisma.cooperative.findUnique({
      where: { subdomain },
      select: { id: true },
    });
    if (cooperative) {
      return cooperative.id;
    }
    logger.warn(`Cooperative not found for subdomain: ${subdomain}`);
  }

  // 3. Fall back to JWT token's cooperativeId (for backward compatibility)
  if (req.user?.cooperativeId) {
    return req.user.cooperativeId;
  }

  return null;
}

/**
 * Middleware to extract and set currentCooperativeId in request context
 * This should be used after authentication middleware
 * Sets req.currentCooperativeId from subdomain, header, or JWT token
 */
export const setCooperativeContext = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // System admins can have null cooperative context
    if (req.user?.isSystemAdmin) {
      req.currentCooperativeId = null;
      next();
      return;
    }

    // Extract cooperative ID
    const cooperativeId = await extractCooperativeId(req);
    req.currentCooperativeId = cooperativeId;

    // If user is authenticated, also get their role in this cooperative
    if (req.user && cooperativeId) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          cooperativeId: true,
          roleId: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      // Verify user belongs to this cooperative (unless system admin)
      if (user && user.cooperativeId === cooperativeId) {
        req.currentRole = user.role?.name || null;
      } else if (!req.user.isSystemAdmin) {
        // User doesn't belong to this cooperative
        logger.warn(
          `User ${req.user.userId} attempted to access cooperative ${cooperativeId} but belongs to ${user?.cooperativeId}`
        );
      }
    }

    next();
  } catch (error) {
    logger.error('Error setting cooperative context:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to ensure tenantId/currentCooperativeId is available in the request
 * This should be used after authentication and setCooperativeContext middleware
 * System admins can bypass this requirement
 * @deprecated Use setCooperativeContext + requireCooperative instead
 */
export const requireTenant = (req: Request, res: Response, next: NextFunction): void => {
  // System admins can bypass tenant requirement
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  // Check new currentCooperativeId first, fall back to tenantId for backward compatibility
  const cooperativeId = req.currentCooperativeId ?? req.user?.tenantId;

  if (!cooperativeId) {
    res.status(403).json({ error: 'Cooperative context required' });
    return;
  }
  next();
};

/**
 * Middleware to require cooperative context (preferred over requireTenant)
 * This should be used after setCooperativeContext middleware
 */
export const requireCooperative = (req: Request, res: Response, next: NextFunction): void => {
  // System admins can bypass cooperative requirement
  if (req.user?.isSystemAdmin) {
    next();
    return;
  }

  if (!req.currentCooperativeId) {
    res.status(403).json({ error: 'Cooperative context required' });
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
