/**
 * Metrics Middleware
 *
 * Collects basic metrics for monitoring:
 * - Request count
 * - Response times
 * - Error rates
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/index.js';
import { addBreadcrumb } from '../config/sentry.js';

interface Metrics {
  requestCount: number;
  errorCount: number;
  totalResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  requestsByMethod: Record<string, number>;
  requestsByStatus: Record<string, number>;
}

// In-memory metrics store (in production, use Redis or a metrics service)
const metrics: Metrics = {
  requestCount: 0,
  errorCount: 0,
  totalResponseTime: 0,
  minResponseTime: Infinity,
  maxResponseTime: 0,
  requestsByMethod: {},
  requestsByStatus: {},
};

/**
 * Metrics middleware to track request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const method = req.method;

  // Increment request count
  metrics.requestCount++;
  metrics.requestsByMethod[method] = (metrics.requestsByMethod[method] || 0) + 1;

  // Track response
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const statusCode = res.statusCode.toString();

    // Update metrics
    metrics.totalResponseTime += responseTime;
    metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
    metrics.requestsByStatus[statusCode] = (metrics.requestsByStatus[statusCode] || 0) + 1;

    // Track errors (4xx and 5xx)
    if (statusCode.startsWith('4') || statusCode.startsWith('5')) {
      metrics.errorCount++;
    }

    // Add breadcrumb for Sentry
    addBreadcrumb(
      `${method} ${req.path} - ${statusCode}`,
      'http',
      statusCode.startsWith('5') ? 'error' : statusCode.startsWith('4') ? 'warning' : 'info',
      {
        method,
        path: req.path,
        statusCode,
        responseTime,
      }
    );

    // Log slow requests (> 1 second)
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method,
        path: req.path,
        statusCode,
        responseTime,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
      });
    }
  });

  next();
}

/**
 * Get current metrics
 */
export function getMetrics(): Metrics & {
  averageResponseTime: number;
  errorRate: number;
} {
  const averageResponseTime =
    metrics.requestCount > 0 ? metrics.totalResponseTime / metrics.requestCount : 0;
  const errorRate = metrics.requestCount > 0 ? metrics.errorCount / metrics.requestCount : 0;

  return {
    ...metrics,
    averageResponseTime: Math.round(averageResponseTime * 100) / 100,
    errorRate: Math.round(errorRate * 10000) / 100, // Percentage with 2 decimal places
    minResponseTime: metrics.minResponseTime === Infinity ? 0 : metrics.minResponseTime,
  };
}

/**
 * Reset metrics (useful for testing or periodic resets)
 */
export function resetMetrics() {
  metrics.requestCount = 0;
  metrics.errorCount = 0;
  metrics.totalResponseTime = 0;
  metrics.minResponseTime = Infinity;
  metrics.maxResponseTime = 0;
  metrics.requestsByMethod = {};
  metrics.requestsByStatus = {};
}
