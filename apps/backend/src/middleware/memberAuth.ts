import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth.js';
import { prisma } from '../lib/prisma.js';

export const authenticateMember = async (
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

    // Verify member exists and is active
    // IMPORTANT: We check the 'Member' table, not 'User'
    const member = await prisma.member.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        cooperativeId: true,
        isActive: true,
        memberNumber: true,
      },
    });

    if (!member || !member.isActive) {
      res.status(401).json({ error: 'Member not found or inactive' });
      return;
    }

    // Security check: Validate that the cooperativeId in the token matches the member's cooperativeId
    // This prevents token reuse if a member is moved between cooperatives
    // We use the member's cooperativeId from the database (not from the token) as the source of truth
    if (payload.cooperativeId !== member.cooperativeId) {
      res.status(401).json({ error: 'Token is not valid for this member' });
      return;
    }

    // Attach user (member) info to request
    // We map member details to the generic req.user structure for compatibility
    req.user = {
      userId: member.id,
      email: member.email || `${member.memberNumber}`, // Fallback if email is missing
      cooperativeId: member.cooperativeId,
      roleId: 'MEMBER',
      tenantId: member.cooperativeId,
    };

    // Set cooperative context
    req.currentCooperativeId = member.cooperativeId;

    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
