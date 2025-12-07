/**
 * Database Performance Metrics
 * 
 * Tracks database query performance including:
 * - Query counts
 * - Query durations
 * - Slow query detection
 */

interface DatabaseMetrics {
  totalQueries: number;
  totalQueryTime: number;
  minQueryTime: number;
  maxQueryTime: number;
  slowQueries: number; // Queries > 1 second
  queryTimes: number[]; // For percentile calculations
}

// In-memory metrics store
const dbMetrics: DatabaseMetrics = {
  totalQueries: 0,
  totalQueryTime: 0,
  minQueryTime: Infinity,
  maxQueryTime: 0,
  slowQueries: 0,
  queryTimes: [],
};

// Keep only last 1000 query times for percentile calculation
const MAX_QUERY_TIMES = 1000;

/**
 * Record a database query execution
 */
export function recordQuery(duration: number) {
  dbMetrics.totalQueries++;
  dbMetrics.totalQueryTime += duration;
  dbMetrics.minQueryTime = Math.min(dbMetrics.minQueryTime, duration);
  dbMetrics.maxQueryTime = Math.max(dbMetrics.maxQueryTime, duration);

  // Track slow queries (> 1 second)
  if (duration > 1000) {
    dbMetrics.slowQueries++;
  }

  // Store query time for percentile calculation
  dbMetrics.queryTimes.push(duration);
  if (dbMetrics.queryTimes.length > MAX_QUERY_TIMES) {
    dbMetrics.queryTimes.shift(); // Remove oldest
  }
}

/**
 * Get current database metrics
 */
export function getDatabaseMetrics(): DatabaseMetrics & {
  averageQueryTime: number;
  p95QueryTime: number;
  p99QueryTime: number;
} {
  const averageQueryTime =
    dbMetrics.totalQueries > 0 ? dbMetrics.totalQueryTime / dbMetrics.totalQueries : 0;

  // Calculate percentiles
  const sortedTimes = [...dbMetrics.queryTimes].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedTimes.length * 0.95);
  const p99Index = Math.floor(sortedTimes.length * 0.99);
  const p95QueryTime = sortedTimes[p95Index] || 0;
  const p99QueryTime = sortedTimes[p99Index] || 0;

  return {
    ...dbMetrics,
    averageQueryTime: Math.round(averageQueryTime * 100) / 100,
    p95QueryTime: Math.round(p95QueryTime * 100) / 100,
    p99QueryTime: Math.round(p99QueryTime * 100) / 100,
    minQueryTime: dbMetrics.minQueryTime === Infinity ? 0 : dbMetrics.minQueryTime,
  };
}

/**
 * Reset database metrics
 */
export function resetDatabaseMetrics() {
  dbMetrics.totalQueries = 0;
  dbMetrics.totalQueryTime = 0;
  dbMetrics.minQueryTime = Infinity;
  dbMetrics.maxQueryTime = 0;
  dbMetrics.slowQueries = 0;
  dbMetrics.queryTimes = [];
}
