/**
 * CSRF Protection Middleware
 *
 * Provides CSRF (Cross-Site Request Forgery) protection for REST APIs.
 * Uses a token-based approach suitable for JWT-authenticated APIs.
 *
 * For state-changing operations (POST, PUT, PATCH, DELETE), the client
 * must include a CSRF token in the X-CSRF-Token header.
 *
 * Clients can obtain a token by calling GET /api/csrf-token
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ForbiddenError } from '../lib/errors.js';
import { asyncHandler } from './error-handler.js';

// Store CSRF tokens in memory (in production, use Redis for distributed systems)
const csrfTokens = new Map<string, { token: string; expiresAt: number }>();

// Clean up expired tokens every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of csrfTokens.entries()) {
      if (value.expiresAt < now) {
        csrfTokens.delete(key);
      }
    }
  },
  5 * 60 * 1000
);

/**
 * Generate a CSRF token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get or create CSRF token for a session
 */
function getOrCreateToken(sessionId: string): string {
  const existing = csrfTokens.get(sessionId);
  const now = Date.now();
  const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours

  if (existing && existing.expiresAt > now) {
    return existing.token;
  }

  const token = generateToken();
  csrfTokens.set(sessionId, { token, expiresAt });
  return token;
}

/**
 * Verify CSRF token
 */
function verifyToken(sessionId: string, token: string): boolean {
  const stored = csrfTokens.get(sessionId);
  if (!stored) {
    return false;
  }

  const now = Date.now();
  if (stored.expiresAt < now) {
    csrfTokens.delete(sessionId);
    return false;
  }

  return stored.token === token;
}

/**
 * Get session ID from request
 * Uses JWT user ID or IP address + User-Agent as fallback
 */
function getSessionId(req: Request): string {
  // If user is authenticated, use user ID
  if (req.user?.userId) {
    return `user:${req.user.userId}`;
  }

  // Fallback to IP + User-Agent
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';
  return `session:${ip}:${userAgent}`;
}

/**
 * CSRF protection middleware
 * Only applies to state-changing HTTP methods
 */
export const csrfProtection = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // Skip CSRF protection for safe methods
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.includes(req.method)) {
      return next();
    }

    // For state-changing methods, verify CSRF token
    const sessionId = getSessionId(req);
    const tokenFromHeader = req.headers['x-csrf-token'] as string;

    // Check if token is provided
    if (!tokenFromHeader) {
      throw new ForbiddenError('CSRF token missing. Include X-CSRF-Token header.');
    }

    // Verify token
    if (!verifyToken(sessionId, tokenFromHeader)) {
      throw new ForbiddenError('Invalid or expired CSRF token');
    }

    // Token is valid, continue
    next();
  }
);

/**
 * Get CSRF token endpoint handler
 * Clients can call this to get a CSRF token
 */
export function getCsrfToken(req: Request, res: Response): void {
  const sessionId = getSessionId(req);
  const token = getOrCreateToken(sessionId);

  res.json({
    csrfToken: token,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  });
}

/**
 * Optional CSRF protection (can be disabled via environment variable)
 */
export const optionalCsrfProtection =
  process.env.ENABLE_CSRF_PROTECTION !== 'false'
    ? csrfProtection
    : (req: Request, res: Response, next: NextFunction) => next();
