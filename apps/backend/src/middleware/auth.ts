import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

// Extend Express Request type to include user (already declared in types/express.d.ts)

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    // Validate that authorization header exists and is a string
    // This prevents type confusion attacks
    if (!authHeader || typeof authHeader !== 'string') {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    // Validate token format - must start with 'Bearer ' prefix
    // The actual security comes from cryptographic verification in verifyToken
    const BEARER_PREFIX = 'Bearer ';
    if (!authHeader.startsWith(BEARER_PREFIX)) {
      res.status(401).json({ error: 'Invalid token format' });
      return;
    }

    // Extract token - use the constant length to prevent manipulation
    const token = authHeader.substring(BEARER_PREFIX.length);

    // Validate token is not empty after removing prefix
    if (!token || token.trim().length === 0) {
      res.status(401).json({ error: 'Token is required' });
      return;
    }

    // Cryptographically verify the token - this is the actual security check
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

    // Security check: Validate that the cooperativeId in the token matches the user's cooperativeId
    // This prevents token reuse if a user is moved between cooperatives
    // Exception: System admins may have null cooperativeId, so we allow that case
    if (!user.isSystemAdmin && payload.cooperativeId !== user.cooperativeId) {
      res.status(401).json({ error: 'Token is not valid for this user' });
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
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
