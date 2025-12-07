import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

// Extend Express Request type to include user (already declared in types/express.d.ts)

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = verifyToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        cooperativeId: true,
        roleId: true,
        isActive: true,
        isSystemAdmin: true, // Add system admin flag
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Attach user info to request
    req.user = {
      ...payload,
      tenantId: user.cooperativeId || null, // Can be null for system admin (deprecated, use currentCooperativeId)
      isSystemAdmin: user.isSystemAdmin, // Add system admin flag
    };

    // Set initial cooperative context from JWT (can be overridden by setCooperativeContext middleware)
    req.currentCooperativeId = user.cooperativeId || null;

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
