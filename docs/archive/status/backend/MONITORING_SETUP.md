# Monitoring and Error Tracking Setup

This document describes the monitoring and error tracking features implemented in the MyERP backend.

## Features

### 1. Sentry Error Tracking

Sentry is integrated for production error tracking and performance monitoring.

#### Setup

1. **Get Sentry DSN**:
   - Sign up at [sentry.io](https://sentry.io)
   - Create a new project for Node.js
   - Copy your DSN

2. **Configure Environment Variables**:
   Add to your `.env` file:

   ```env
   SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
   SENTRY_ENVIRONMENT=production  # or development, staging
   SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions (0.0 to 1.0)
   ```

3. **Features**:
   - Automatic error capture from Express middleware
   - Performance monitoring (transaction tracing)
   - User context tracking (userId, email, tenantId)
   - Breadcrumb tracking for debugging
   - Profiling support (10% sample rate in production)

#### Usage

Errors are automatically captured. You can also manually capture:

```typescript
import { captureException, captureMessage, addBreadcrumb } from '../config/sentry.js';

// Capture an exception
try {
  // risky operation
} catch (error) {
  captureException(error, { context: 'additional data' });
}

// Capture a message
captureMessage('Something important happened', 'warning', { key: 'value' });

// Add breadcrumb for debugging
addBreadcrumb('User performed action', 'user-action', 'info', { action: 'login' });
```

### 2. Health Check Endpoints

Multiple health check endpoints are available for monitoring:

#### Basic Health Check

```
GET /health
```

Returns basic status information.

#### Detailed Health Check

```
GET /health/detailed
```

Returns comprehensive health information including:

- Database connectivity
- Response latency
- Memory usage
- Uptime
- Service version

#### Readiness Probe

```
GET /health/ready
```

For Kubernetes/Docker readiness probes. Returns 503 if database is unavailable.

#### Liveness Probe

```
GET /health/live
```

For Kubernetes/Docker liveness probes. Always returns 200 if service is running.

#### Metrics Endpoint

```
GET /health/metrics
```

Returns application metrics:

- Request count
- Error count
- Average/min/max response times
- Requests by HTTP method
- Requests by status code
- Error rate

### 3. Metrics Collection

Basic metrics are automatically collected for all requests:

- **Request Count**: Total number of requests
- **Response Times**: Min, max, and average response times
- **Error Rates**: Percentage of 4xx and 5xx responses
- **Request Distribution**: By HTTP method and status code

Metrics are stored in-memory. For production, consider:

- Exporting to Prometheus
- Using Redis for distributed metrics
- Integrating with Datadog, New Relic, or similar services

### 4. Enhanced Logging

Winston logger is configured with:

- **Structured JSON logging** (production)
- **Colorized console output** (development)
- **Automatic sensitive data redaction** (passwords, tokens, etc.)
- **File rotation** (production)
- **Exception and rejection handlers**

#### Log Levels

- `error`: Errors that need attention
- `warn`: Warnings (e.g., slow requests)
- `info`: General information
- `debug`: Detailed debugging information (development only)

## Configuration

### Environment Variables

```env
# Sentry Configuration (Optional)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# Logging
NODE_ENV=production  # Controls log level and format
```

### Sentry Sample Rates

- **Traces Sample Rate**: Percentage of transactions to trace (0.0 to 1.0)
  - Development: 1.0 (100%)
  - Production: 0.1 (10%) recommended
- **Profiles Sample Rate**: Percentage of transactions to profile
  - Development: 1.0 (100%)
  - Production: 0.1 (10%) recommended

## Monitoring Best Practices

1. **Set up alerts** in Sentry for:
   - New errors
   - Error rate spikes
   - Performance degradation

2. **Monitor health endpoints**:
   - Use `/health/ready` for load balancer health checks
   - Use `/health/live` for container orchestration
   - Monitor `/health/detailed` for comprehensive status

3. **Review metrics regularly**:
   - Check `/health/metrics` for trends
   - Monitor error rates
   - Track slow requests (> 1 second logged as warnings)

4. **Log analysis**:
   - Review error logs in production
   - Monitor exception logs
   - Track rejection logs for unhandled promise rejections

## Production Checklist

- [ ] Configure `SENTRY_DSN` in production environment
- [ ] Set `SENTRY_ENVIRONMENT=production`
- [ ] Adjust `SENTRY_TRACES_SAMPLE_RATE` to 0.1 (10%)
- [ ] Set up Sentry alerts for critical errors
- [ ] Configure health check monitoring
- [ ] Set up log aggregation (if needed)
- [ ] Monitor metrics endpoint for trends
- [ ] Review slow request warnings

## Troubleshooting

### Sentry not capturing errors

1. Check `SENTRY_DSN` is set correctly
2. Verify Sentry initialization in logs
3. Check Sentry dashboard for project status
4. Ensure errors are not being filtered out

### Health check failing

1. Check database connectivity
2. Verify `DATABASE_URL` is correct
3. Check database server status
4. Review detailed health endpoint for specific failures

### High memory usage

1. Check `/health/detailed` for memory stats
2. Review logs for memory leaks
3. Consider increasing container memory limits
4. Profile application with Sentry profiling

## Next Steps

For production-grade monitoring, consider:

1. **Metrics Export**: Export metrics to Prometheus/Grafana
2. **Log Aggregation**: Use ELK stack, Datadog, or similar
3. **APM**: Full Application Performance Monitoring
4. **Distributed Tracing**: For microservices architecture
5. **Custom Dashboards**: Create monitoring dashboards
