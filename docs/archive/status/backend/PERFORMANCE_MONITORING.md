# Performance Monitoring Implementation

## Overview

Enhanced performance monitoring has been implemented for the MyERP backend, including Prometheus metrics export, database query performance tracking, route-level performance monitoring, and comprehensive performance dashboards.

## Features Implemented

### 1. Prometheus Metrics Export ✅

**File Created:**

- `apps/backend/src/lib/prometheus.ts` - Prometheus format metrics exporter

**Endpoint:**

- `GET /health/metrics/prometheus` - Returns metrics in Prometheus format

**Metrics Exported:**

- HTTP request metrics (count, errors, duration)
- Database query metrics (count, duration, slow queries)
- Memory usage metrics
- Process uptime
- Request distribution by method and status

**Usage:**

```bash
curl http://localhost:4000/health/metrics/prometheus
```

**Integration:**

- Can be scraped by Prometheus
- Compatible with Grafana dashboards
- Standard Prometheus format

### 2. Database Query Performance Tracking ✅

**File Created:**

- `apps/backend/src/lib/database-metrics.ts` - Database performance metrics

**Features:**

- Tracks all database queries
- Records query duration
- Detects slow queries (> 1 second)
- Calculates percentiles (P95, P99)
- Tracks query counts and total query time

**Integration:**

- Automatically tracks all Prisma queries via middleware
- Logs slow queries to Winston logger
- Metrics available via `/health/metrics` endpoint

### 3. Route-Level Performance Monitoring ✅

**File Created:**

- `apps/backend/src/middleware/performance.ts` - Route performance tracking

**Features:**

- Tracks performance per route
- Identifies slowest routes
- Monitors error rates per route
- Detects slow and very slow requests
- Automatic Sentry breadcrumb integration

**Thresholds:**

- Slow request: > 1 second (warning)
- Very slow request: > 3 seconds (error)

### 4. Performance Dashboard ✅

**Endpoint:**

- `GET /health/performance` - Comprehensive performance dashboard

**Data Provided:**

- System summary (uptime, memory)
- HTTP metrics (requests, errors, response times)
- Database metrics (queries, slow queries, percentiles)
- Slowest routes (top 10)
- Route performance (top 20 routes)

### 5. Enhanced Metrics Endpoint ✅

**Endpoint:**

- `GET /health/metrics` - Enhanced with database and route metrics

**New Data:**

- Database query performance
- Route-level performance data
- Slowest routes identification

## Endpoints

### 1. Prometheus Metrics

```
GET /health/metrics/prometheus
```

Returns metrics in Prometheus format for scraping.

### 2. Performance Dashboard

```
GET /health/performance
```

Returns comprehensive performance data in JSON format.

### 3. Enhanced Metrics

```
GET /health/metrics
```

Returns all metrics including HTTP, database, and route performance.

## Usage Examples

### View Performance Dashboard

```bash
curl http://localhost:4000/health/performance | jq
```

### Get Prometheus Metrics

```bash
curl http://localhost:4000/health/metrics/prometheus
```

### Monitor Slow Routes

```bash
curl http://localhost:4000/health/performance | jq '.slowestRoutes'
```

## Metrics Collected

### HTTP Metrics

- Total request count
- Error count (4xx, 5xx)
- Response times (min, max, average)
- Requests by HTTP method
- Requests by status code
- Error rate percentage

### Database Metrics

- Total query count
- Query duration (min, max, average, P95, P99)
- Slow query count (> 1 second)
- Total query time

### Route Metrics

- Performance per route
- Request count per route
- Average response time per route
- Error rate per route
- Slowest routes identification

### System Metrics

- Memory usage (heap, RSS)
- Process uptime
- CPU usage (via process.memoryUsage)

## Integration with Monitoring Tools

### Prometheus

1. Configure Prometheus to scrape `/health/metrics/prometheus`
2. Set scrape interval (e.g., 15 seconds)
3. Create Grafana dashboards

### Grafana

1. Connect Grafana to Prometheus data source
2. Create dashboards for:
   - HTTP request rates
   - Response times
   - Error rates
   - Database query performance
   - Memory usage
   - Slow routes

### Sentry

- Slow requests automatically logged as breadcrumbs
- Very slow requests logged as errors
- Performance data included in error context

## Configuration

### Environment Variables

No additional environment variables required. All monitoring is enabled by default.

### Thresholds

You can adjust thresholds in:

- `apps/backend/src/middleware/performance.ts` - Route performance thresholds
- `apps/backend/src/lib/database-metrics.ts` - Database query thresholds

## Production Recommendations

1. **Export Metrics to Prometheus:**
   - Set up Prometheus server
   - Configure scraping from `/health/metrics/prometheus`
   - Create alerting rules

2. **Set Up Grafana Dashboards:**
   - Create dashboards for key metrics
   - Set up alerts for:
     - High error rates
     - Slow response times
     - Database performance issues
     - Memory leaks

3. **Monitor Slow Routes:**
   - Regularly check `/health/performance` for slowest routes
   - Optimize routes with high average response times
   - Investigate routes with high error rates

4. **Database Optimization:**
   - Monitor slow query count
   - Review P95 and P99 query times
   - Add indexes for frequently slow queries

## Files Created/Modified

- ✅ `apps/backend/src/lib/prometheus.ts` (new)
- ✅ `apps/backend/src/lib/database-metrics.ts` (new)
- ✅ `apps/backend/src/middleware/performance.ts` (new)
- ✅ `apps/backend/src/lib/prisma.ts` (modified - added query tracking)
- ✅ `apps/backend/src/routes/health.ts` (modified - added new endpoints)
- ✅ `apps/backend/src/index.ts` (modified - added performance middleware)

## Testing

### Test Prometheus Export

```bash
curl http://localhost:4000/health/metrics/prometheus
```

### Test Performance Dashboard

```bash
curl http://localhost:4000/health/performance
```

### Test Database Metrics

1. Make some API requests that query the database
2. Check `/health/metrics` for database metrics
3. Verify slow queries are logged if any exceed 1 second

## Benefits

1. **Visibility**: Complete visibility into application performance
2. **Proactive Monitoring**: Identify issues before they impact users
3. **Optimization**: Data-driven optimization decisions
4. **Alerting**: Set up alerts for performance degradation
5. **Debugging**: Identify slow routes and queries quickly
6. **Scalability**: Monitor performance as traffic grows

## Next Steps

For enhanced monitoring, consider:

1. Export metrics to time-series database (InfluxDB, TimescaleDB)
2. Set up distributed tracing (OpenTelemetry)
3. Add custom business metrics
4. Create performance regression tests
5. Set up automated performance alerts
