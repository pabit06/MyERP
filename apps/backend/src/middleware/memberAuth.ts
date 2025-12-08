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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
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
