/**
 * Prometheus Metrics Export
 *
 * Exports metrics in Prometheus format for integration with monitoring systems
 * like Prometheus, Grafana, etc.
 */

import { getMetrics } from '../middleware/metrics.js';
import { getDatabaseMetrics } from './database-metrics.js';

/**
 * Convert metrics to Prometheus format
 */
export function exportPrometheusMetrics(): string {
  const metrics = getMetrics();
  const dbMetrics = getDatabaseMetrics();
  const memory = process.memoryUsage();
  const uptime = process.uptime();

  const lines: string[] = [];

  // HTTP Request Metrics
  lines.push('# HELP http_requests_total Total number of HTTP requests');
  lines.push('# TYPE http_requests_total counter');
  lines.push(`http_requests_total ${metrics.requestCount}`);

  lines.push('# HELP http_requests_errors_total Total number of HTTP errors (4xx, 5xx)');
  lines.push('# TYPE http_requests_errors_total counter');
  lines.push(`http_requests_errors_total ${metrics.errorCount}`);

  lines.push('# HELP http_request_duration_seconds HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds summary');
  lines.push(
    `http_request_duration_seconds{quantile="0.5"} ${(metrics.averageResponseTime / 1000).toFixed(4)}`
  );
  lines.push(
    `http_request_duration_seconds{quantile="0.95"} ${(metrics.maxResponseTime / 1000).toFixed(4)}`
  );
  lines.push(
    `http_request_duration_seconds{quantile="0.99"} ${(metrics.maxResponseTime / 1000).toFixed(4)}`
  );
  lines.push(`http_request_duration_seconds_sum ${(metrics.totalResponseTime / 1000).toFixed(4)}`);
  lines.push(`http_request_duration_seconds_count ${metrics.requestCount}`);

  lines.push('# HELP http_request_duration_seconds_min Minimum HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds_min gauge');
  lines.push(`http_request_duration_seconds_min ${(metrics.minResponseTime / 1000).toFixed(4)}`);

  lines.push('# HELP http_request_duration_seconds_max Maximum HTTP request duration in seconds');
  lines.push('# TYPE http_request_duration_seconds_max gauge');
  lines.push(`http_request_duration_seconds_max ${(metrics.maxResponseTime / 1000).toFixed(4)}`);

  // Request by Method
  Object.entries(metrics.requestsByMethod).forEach(([method, count]) => {
    lines.push(`# HELP http_requests_by_method_total Total requests by HTTP method`);
    lines.push(`# TYPE http_requests_by_method_total counter`);
    lines.push(`http_requests_by_method_total{method="${method}"} ${count}`);
  });

  // Request by Status
  Object.entries(metrics.requestsByStatus).forEach(([status, count]) => {
    lines.push(`# HELP http_requests_by_status_total Total requests by HTTP status code`);
    lines.push(`# TYPE http_requests_by_status_total counter`);
    lines.push(`http_requests_by_status_total{status="${status}"} ${count}`);
  });

  // Error Rate
  lines.push('# HELP http_error_rate Error rate as a percentage');
  lines.push('# TYPE http_error_rate gauge');
  lines.push(`http_error_rate ${metrics.errorRate}`);

  // Database Metrics
  lines.push('# HELP database_queries_total Total number of database queries');
  lines.push('# TYPE database_queries_total counter');
  lines.push(`database_queries_total ${dbMetrics.totalQueries}`);

  lines.push('# HELP database_query_duration_seconds Database query duration in seconds');
  lines.push('# TYPE database_query_duration_seconds summary');
  lines.push(
    `database_query_duration_seconds{quantile="0.5"} ${(dbMetrics.averageQueryTime / 1000).toFixed(4)}`
  );
  lines.push(
    `database_query_duration_seconds{quantile="0.95"} ${(dbMetrics.p95QueryTime / 1000).toFixed(4)}`
  );
  lines.push(
    `database_query_duration_seconds{quantile="0.99"} ${(dbMetrics.p99QueryTime / 1000).toFixed(4)}`
  );
  lines.push(`database_query_duration_seconds_sum ${(dbMetrics.totalQueryTime / 1000).toFixed(4)}`);
  lines.push(`database_query_duration_seconds_count ${dbMetrics.totalQueries}`);

  lines.push('# HELP database_slow_queries_total Total number of slow queries (> 1s)');
  lines.push('# TYPE database_slow_queries_total counter');
  lines.push(`database_slow_queries_total ${dbMetrics.slowQueries}`);

  // Memory Metrics
  lines.push('# HELP process_memory_usage_bytes Memory usage in bytes');
  lines.push('# TYPE process_memory_usage_bytes gauge');
  lines.push(`process_memory_usage_bytes{type="heapUsed"} ${memory.heapUsed}`);
  lines.push(`process_memory_usage_bytes{type="heapTotal"} ${memory.heapTotal}`);
  lines.push(`process_memory_usage_bytes{type="rss"} ${memory.rss}`);
  lines.push(`process_memory_usage_bytes{type="external"} ${memory.external}`);

  // Uptime
  lines.push('# HELP process_uptime_seconds Process uptime in seconds');
  lines.push('# TYPE process_uptime_seconds gauge');
  lines.push(`process_uptime_seconds ${uptime.toFixed(2)}`);

  return lines.join('\n') + '\n';
}
