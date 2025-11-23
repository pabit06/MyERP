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
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or inactive' });
      return;
    }

    // Attach user info to request
    req.user = {
      ...payload,
      tenantId: user.cooperativeId, // Set tenantId for tenant scoping
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
