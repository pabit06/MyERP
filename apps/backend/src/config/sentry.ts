/**
 * Sentry Error Tracking Configuration
 *
 * Initializes Sentry for error tracking and performance monitoring.
 * Only initializes if SENTRY_DSN is configured.
 */

import * as Sentry from '@sentry/node';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Initialize Sentry if DSN is configured
 */
export function initializeSentry() {
  if (!env.SENTRY_DSN) {
    logger.info('Sentry DSN not configured, error tracking disabled');
    return;
  }

  try {
    Sentry.init({
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE || 1.0,
      profilesSampleRate: 0, // Disabled - requires native module that may not be available on all platforms
      integrations: [
        // HTTP instrumentation is automatic in v8
        // Express integration is handled automatically in v8
        // Note: Profiling integration disabled due to native module compatibility issues
        // Can be enabled later if needed: nodeProfilingIntegration() from '@sentry/profiling-node'
      ],
      // Filter out health check endpoints from tracking
      ignoreErrors: ['ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND'],
      beforeSend(event, _hint) {
        // Filter out health check requests
        if (event.request?.url?.includes('/health')) {
          return null;
        }
        return event;
      },
      // Set user context when available
      beforeSendTransaction(event) {
        // Filter out health check transactions
        if (event.transaction?.includes('/health')) {
          return null;
        }
        return event;
      },
    });

    logger.info('Sentry initialized successfully', {
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    });
  } catch (error) {
    logger.error('Failed to initialize Sentry', { error });
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string, tenantId?: string) {
  if (!env.SENTRY_DSN) return;

  Sentry.setUser({
    id: userId,
    email,
    tenantId,
  });
}

/**
 * Clear user context
 */
export function clearSentryUser() {
  if (!env.SENTRY_DSN) return;
  Sentry.setUser(null);
}

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (!env.SENTRY_DSN) {
    logger.error('Exception (Sentry not configured)', { error: error.message, context });
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture message manually
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  if (!env.SENTRY_DSN) {
    logger.log(level, message, context);
    return;
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  });
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, any>
) {
  if (!env.SENTRY_DSN) return;

  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}
