/**
 * Health Check and Monitoring Routes
 *
 * Provides endpoints for health checks, metrics, and system status
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { env, logger } from '../config/index.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { getMetrics } from '../middleware/metrics.js';
import { exportPrometheusMetrics } from '../lib/prometheus.js';
import { getRoutePerformance, getSlowestRoutes } from '../middleware/performance.js';
import { getDatabaseMetrics } from '../lib/database-metrics.js';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     description: Returns basic health status of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 service:
 *                   type: string
 *                   example: myerp-backend
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'myerp-backend',
      environment: env.NODE_ENV,
    });
  })
);

/**
 * GET /health/detailed
 * Detailed health check with database connectivity
 */
router.get(
  '/detailed',
  asyncHandler(async (req: Request, res: Response) => {
    const checks: Record<string, { status: string; message?: string; latency?: number }> = {};

    // Database connectivity check
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;
      checks.database = {
        status: 'healthy',
        latency: dbLatency,
      };
    } catch (error: any) {
      checks.database = {
        status: 'unhealthy',
        message: error.message || 'Database connection failed',
      };
    }

    // Overall status
    const allHealthy = Object.values(checks).every((check) => check.status === 'healthy');
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'myerp-backend',
      environment: env.NODE_ENV,
      checks,
      version: process.env.npm_package_version || 'unknown',
      uptime: process.uptime(),
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        unit: 'MB',
      },
    });
  })
);

/**
 * GET /health/ready
 * Readiness probe for Kubernetes/Docker
 * Checks if the service is ready to accept traffic
 */
router.get(
  '/ready',
  asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check database connectivity
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ready' });
    } catch (error) {
      logger.error('Readiness check failed', { error });
      res.status(503).json({ status: 'not ready' });
    }
  })
);

/**
 * GET /health/live
 * Liveness probe for Kubernetes/Docker
 * Checks if the service is alive (not crashed)
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ status: 'alive' });
});

/**
 * GET /health/metrics
 * Get application metrics
 */
router.get(
  '/metrics',
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = getMetrics();
    const dbMetrics = getDatabaseMetrics();
    const routePerformance = getRoutePerformance();
    const slowestRoutes = getSlowestRoutes(10);

    res.json({
      timestamp: new Date().toISOString(),
      http: metrics,
      database: dbMetrics,
      routes: {
        all: routePerformance,
        slowest: slowestRoutes,
      },
    });
  })
);

/**
 * GET /health/metrics/prometheus
 * Get metrics in Prometheus format
 */
router.get(
  '/metrics/prometheus',
  asyncHandler(async (req: Request, res: Response) => {
    const prometheusMetrics = exportPrometheusMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4');
    res.send(prometheusMetrics);
  })
);

/**
 * GET /health/performance
 * Get performance dashboard data
 */
router.get(
  '/performance',
  asyncHandler(async (req: Request, res: Response) => {
    const metrics = getMetrics();
    const dbMetrics = getDatabaseMetrics();
    const routePerformance = getRoutePerformance();
    const slowestRoutes = getSlowestRoutes(10);
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      timestamp: new Date().toISOString(),
      summary: {
        uptime: {
          seconds: Math.round(uptime),
          formatted: formatUptime(uptime),
        },
        memory: {
          heapUsed: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
          rss: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
          unit: 'MB',
        },
        http: {
          totalRequests: metrics.requestCount,
          errorRate: `${metrics.errorRate}%`,
          averageResponseTime: `${metrics.averageResponseTime}ms`,
          minResponseTime: `${metrics.minResponseTime}ms`,
          maxResponseTime: `${metrics.maxResponseTime}ms`,
        },
        database: {
          totalQueries: dbMetrics.totalQueries,
          averageQueryTime: `${dbMetrics.averageQueryTime}ms`,
          slowQueries: dbMetrics.slowQueries,
          p95QueryTime: `${dbMetrics.p95QueryTime}ms`,
          p99QueryTime: `${dbMetrics.p99QueryTime}ms`,
        },
      },
      slowestRoutes,
      routePerformance: routePerformance.slice(0, 20), // Top 20 routes
    });
  })
);

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;
