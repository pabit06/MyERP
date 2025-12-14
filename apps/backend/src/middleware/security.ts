/**
 * Security Middleware
 *
 * Provides rate limiting and security headers for the application.
 * - Rate limiting to prevent DDoS and brute force attacks
 * - Security headers via Helmet
 * - Request size limits
 */

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { Request, Response } from 'express';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

/**
 * General API rate limiter
 * Limits each IP to 100 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Stricter rate limiter for authentication endpoints
 * Limits each IP to 10 failed login attempts per 15 minutes
 * Only counts failed requests (skipSuccessfulRequests: true)
 * Successful logins don't count towards the limit
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 failed requests per windowMs (increased from 5)
  message: {
    error: 'Too many login attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
  skipSuccessfulRequests: true, // Don't count successful requests towards the limit
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      email: req.body?.email, // Log attempted email (for security monitoring)
    });
    res.status(429).json({
      error: 'Too many login attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Stricter rate limiter for password reset endpoints
 * Limits each IP to 3 password reset requests per hour
 */
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    logger.warn('Password reset rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    res.status(429).json({
      error: 'Too many password reset attempts, please try again later.',
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * Helmet configuration for security headers
 * Configures Content Security Policy, XSS protection, and other security headers
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles (needed for some UI libraries)
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'], // Allow data URIs and HTTPS images
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:', 'https:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable if you need to embed resources from other origins
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resources
  // Additional security headers
  xContentTypeOptions: true, // Prevent MIME type sniffing
  xFrameOptions: { action: 'deny' }, // Prevent clickjacking
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, // Control referrer information
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Request size limits
 * Prevents oversized payload attacks
 */
export const requestSizeLimit = {
  json: '10mb', // Maximum JSON payload size
  urlencoded: '10mb', // Maximum URL-encoded payload size
};

/**
 * Trust proxy configuration
 * Important for rate limiting to work correctly behind reverse proxies
 * Set TRUST_PROXY=true in production when behind nginx/cloudflare/etc.
 */
export const trustProxy = env.NODE_ENV === 'production';
