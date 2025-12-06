/**
 * Performance Monitoring Middleware
 * 
 * Tracks performance metrics for individual routes and operations
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/index.js';
import { addBreadcrumb } from '../config/sentry.js';

interface RoutePerformance {
  path: string;
  method: string;
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  errors: number;
}

// Store performance data per route
const routePerformance = new Map<string, RoutePerformance>();

// Slow request threshold (milliseconds)
const SLOW_REQUEST_THRESHOLD = 1000; // 1 second
const VERY_SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds

/**
 * Performance monitoring middleware
 * Tracks response times and performance metrics per route
 */
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  const routeKey = `${req.method} ${req.route?.path || req.path}`;

  // Track response
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isError = res.statusCode >= 400;

    // Get or create route performance data
    let routeData = routePerformance.get(routeKey);
    if (!routeData) {
      routeData = {
        path: req.route?.path || req.path,
        method: req.method,
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0,
      };
      routePerformance.set(routeKey, routeData);
    }

    // Update metrics
    routeData.count++;
    routeData.totalTime += duration;
    routeData.minTime = Math.min(routeData.minTime, duration);
    routeData.maxTime = Math.max(routeData.maxTime, duration);
    if (isError) {
      routeData.errors++;
    }

    // Log slow requests
    if (duration > VERY_SLOW_REQUEST_THRESHOLD) {
      logger.error('Very slow request detected', {
        method: req.method,
        path: req.path,
        route: req.route?.path,
        duration,
        statusCode: res.statusCode,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
      });

      // Add to Sentry
      addBreadcrumb(
        `Very slow request: ${req.method} ${req.path} (${duration}ms)`,
        'performance',
        'error',
        {
          method: req.method,
          path: req.path,
          duration,
          statusCode: res.statusCode,
        }
      );
    } else if (duration > SLOW_REQUEST_THRESHOLD) {
      logger.warn('Slow request detected', {
        method: req.method,
        path: req.path,
        route: req.route?.path,
        duration,
        statusCode: res.statusCode,
        userId: req.user?.userId,
        tenantId: req.user?.tenantId,
      });

      addBreadcrumb(
        `Slow request: ${req.method} ${req.path} (${duration}ms)`,
        'performance',
        'warning',
        {
          method: req.method,
          path: req.path,
          duration,
        }
      );
    }
  });

  next();
}

/**
 * Get performance data for all routes
 */
export function getRoutePerformance(): Array<RoutePerformance & { averageTime: number; errorRate: number }> {
  return Array.from(routePerformance.values()).map((route) => ({
    ...route,
    averageTime: route.count > 0 ? Math.round((route.totalTime / route.count) * 100) / 100 : 0,
    errorRate: route.count > 0 ? Math.round((route.errors / route.count) * 10000) / 100 : 0,
    minTime: route.minTime === Infinity ? 0 : route.minTime,
  }));
}

/**
 * Get performance data for a specific route
 */
export function getRoutePerformanceByPath(method: string, path: string): RoutePerformance & {
  averageTime: number;
  errorRate: number;
} | null {
  const routeKey = `${method} ${path}`;
  const route = routePerformance.get(routeKey);
  if (!route) return null;

  return {
    ...route,
    averageTime: route.count > 0 ? Math.round((route.totalTime / route.count) * 100) / 100 : 0,
    errorRate: route.count > 0 ? Math.round((route.errors / route.count) * 10000) / 100 : 0,
    minTime: route.minTime === Infinity ? 0 : route.minTime,
  };
}

/**
 * Reset route performance data
 */
export function resetRoutePerformance() {
  routePerformance.clear();
}

/**
 * Get slowest routes (top N)
 */
export function getSlowestRoutes(limit: number = 10): Array<RoutePerformance & { averageTime: number }> {
  const routes = getRoutePerformance();
  return routes
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, limit)
    .map(({ errorRate, ...rest }) => rest);
}
