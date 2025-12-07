/**
 * Input Sanitization Utilities
 *
 * Provides functions to sanitize user inputs to prevent XSS attacks
 * and other security vulnerabilities.
 */

import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize HTML content to prevent XSS attacks
 *
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'b',
      'i',
      'em',
      'strong',
      'a',
      'p',
      'br',
      'ul',
      'ol',
      'li',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
    ],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Sanitize plain text by removing HTML tags and encoding special characters
 *
 * @param text - Text to sanitize
 * @returns Sanitized plain text
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }
  // Remove HTML tags
  const withoutTags = text.replace(/<[^>]*>/g, '');
  // Encode special characters - must handle ampersand FIRST to avoid double encoding
  return withoutTags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize a string by removing potentially dangerous characters
 * Useful for filenames, usernames, etc.
 *
 * @param input - String to sanitize
 * @param allowSpaces - Whether to allow spaces (default: false)
 * @returns Sanitized string
 */
export function sanitizeFilename(input: string, allowSpaces: boolean = false): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  // Remove path traversal attempts
  let sanitized = input.replace(/\.\./g, '').replace(/[/\\]/g, '');
  // Remove special characters except allowed ones
  const pattern = allowSpaces ? /[^a-zA-Z0-9\s\-_]/g : /[^a-zA-Z0-9\-_]/g;
  sanitized = sanitized.replace(pattern, '');
  // Trim and limit length
  return sanitized.trim().substring(0, 255);
}

/**
 * Sanitize email address
 *
 * @param email - Email to sanitize
 * @returns Sanitized email or empty string if invalid
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return '';
  }
  // Basic email validation and sanitization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const trimmed = email.trim().toLowerCase();
  return emailRegex.test(trimmed) ? trimmed : '';
}

/**
 * Sanitize URL
 *
 * @param url - URL to sanitize
 * @returns Sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Sanitize SQL-like patterns (additional layer of protection)
 * Note: Prisma already handles SQL injection, but this adds extra safety
 *
 * @param input - String to check for SQL patterns
 * @returns Sanitized string
 */
export function sanitizeSqlPattern(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  // Remove common SQL injection patterns
  return input
    .replace(/('|(\\')|(;)|(\\)|(%))/gi, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '');
}

/**
 * Sanitize object recursively
 *
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: {
    sanitizeStrings?: boolean;
    sanitizeHtml?: boolean;
    maxDepth?: number;
  } = {}
): T {
  const {
    sanitizeStrings = true,
    sanitizeHtml: sanitizeHtmlFields = false,
    maxDepth = 10,
  } = options;

  if (!obj || typeof obj !== 'object' || maxDepth <= 0) {
    return obj;
  }

  const sanitized: any = Array.isArray(obj) ? [...obj] : { ...obj };

  for (const key in sanitized) {
    if (Object.prototype.hasOwnProperty.call(sanitized, key)) {
      const value = sanitized[key];

      if (typeof value === 'string') {
        if (sanitizeHtmlFields) {
          sanitized[key] = sanitizeHtml(value) as any;
        } else if (sanitizeStrings) {
          sanitized[key] = sanitizeText(value) as any;
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value, {
          sanitizeStrings,
          sanitizeHtml: sanitizeHtmlFields,
          maxDepth: maxDepth - 1,
        }) as any;
      }
    }
  }

  return sanitized as T;
}
